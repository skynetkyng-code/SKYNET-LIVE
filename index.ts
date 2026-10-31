import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { AccessToken } from "livekit-server-sdk";

initializeApp();
const db = getFirestore();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const LIVEKIT_API_KEY = defineSecret("LIVEKIT_API_KEY");
const LIVEKIT_API_SECRET = defineSecret("LIVEKIT_API_SECRET");
const LIVEKIT_URL = defineSecret("LIVEKIT_URL");

const PACKAGES: Record<string, { coins: number; priceCents: number; currency: string }> = {
  starter: { coins: 1000, priceCents: 199, currency: "eur" },
  creator: { coins: 5500, priceCents: 999, currency: "eur" },
  vip: { coins: 12000, priceCents: 1999, currency: "eur" },
};
const GIFTS: Record<string, { coins: number }> = {
  rose: { coins: 10 }, heart: { coins: 50 }, crown: { coins: 250 }, rocket: { coins: 1000 },
};

function uidOf(req: { auth?: { uid: string } | null }): string {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Please sign in.");
  return req.auth.uid;
}
async function requireAdmin(uid: string): Promise<void> {
  const user = await getAuth().getUser(uid);
  if (user.customClaims?.role !== "owner" && user.customClaims?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

export const createUserProfile = onCall(async (request) => {
  const uid = uidOf(request);
  const user = await getAuth().getUser(uid);
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) tx.create(ref, {
      uid, email: user.email ?? null, displayName: user.displayName ?? "SKYNET member",
      role: "user", coins: 0, streamerEarnings: 0, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const createCoinCheckout = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const uid = uidOf(request);
  const packageId = String(request.data?.packageId ?? "");
  const pack = PACKAGES[packageId];
  if (!pack) throw new HttpsError("invalid-argument", "Unknown coin package.");
  const stripe = new Stripe(STRIPE_SECRET_KEY.value());
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: pack.currency,
        unit_amount: pack.priceCents,
        product_data: { name: `SKYNET ${pack.coins} coin package` },
      },
    }],
    metadata: { uid, packageId, coins: String(pack.coins) },
    success_url: "https://example.com/payment-success",
    cancel_url: "https://example.com/payment-cancelled",
  });
  if (!session.url) throw new HttpsError("internal", "Checkout URL unavailable.");
  await db.collection("paymentSessions").doc(session.id).set({
    uid, packageId, coins: pack.coins, status: "created", createdAt: FieldValue.serverTimestamp(),
  });
  return { checkoutUrl: session.url };
});

export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  const stripe = new Stripe(STRIPE_SECRET_KEY.value());
  let event: Stripe.Event;
  try {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") throw new Error("Missing Stripe signature");
    event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
  } catch (err) {
    res.status(400).send(`Webhook signature error: ${(err as Error).message}`);
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.uid;
    const packageId = session.metadata?.packageId;
    const pack = packageId ? PACKAGES[packageId] : undefined;
    if (!uid || !pack || session.payment_status !== "paid") { res.status(400).send("Invalid paid session"); return; }
    const userRef = db.doc(`users/${uid}`);
    const paymentRef = db.doc(`payments/${session.id}`);
    await db.runTransaction(async (tx) => {
      const payment = await tx.get(paymentRef);
      if (payment.exists) return;
      const user = await tx.get(userRef);
      if (!user.exists) throw new Error("User profile not found");
      tx.update(userRef, { coins: FieldValue.increment(pack.coins) });
      tx.create(paymentRef, {
        uid, packageId, coins: pack.coins, amountTotal: session.amount_total,
        currency: session.currency, status: "paid", stripeSessionId: session.id,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(db.doc(`paymentSessions/${session.id}`), { status: "paid" }, { merge: true });
    });
  }
  res.json({ received: true });
});

export const sendGift = onCall({ enforceAppCheck: true }, async (request) => {
  const senderId = uidOf(request);
  const recipientId = String(request.data?.recipientId ?? "").trim();
  const giftId = String(request.data?.giftId ?? "").trim();
  const requestId = String(request.data?.requestId ?? "").trim();
  if (!recipientId || recipientId.length > 128 || !requestId || requestId.length > 100)
    throw new HttpsError("invalid-argument", "Invalid gift details.");
  if (senderId === recipientId) throw new HttpsError("invalid-argument", "You cannot gift yourself.");
  const gift = GIFTS[giftId];
  if (!gift) throw new HttpsError("invalid-argument", "Unknown gift.");
  const sender = db.doc(`users/${senderId}`);
  const recipient = db.doc(`users/${recipientId}`);
  const platform = db.doc("platform/earnings");
  const txRef = db.doc(`giftTransactions/${senderId}_${requestId}`);
  return db.runTransaction(async (tx) => {
    const [s, r, old] = await Promise.all([tx.get(sender), tx.get(recipient), tx.get(txRef)]);
    if (old.exists) return old.data();
    if (!s.exists || !r.exists) throw new HttpsError("not-found", "Account not found.");
    const balance = Number(s.get("coins") ?? 0);
    if (!Number.isSafeInteger(balance) || balance < gift.coins)
      throw new HttpsError("failed-precondition", "Insufficient coins.");
    const platformCut = Math.floor(gift.coins * 0.04);
    const streamerCut = gift.coins - platformCut;
    tx.update(sender, { coins: balance - gift.coins });
    tx.update(recipient, { streamerEarnings: FieldValue.increment(streamerCut) });
    tx.set(platform, { totalCoins: FieldValue.increment(platformCut), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const record = { senderId, recipientId, giftId, giftCoins: gift.coins, platformCut, streamerCut, createdAt: FieldValue.serverTimestamp() };
    tx.create(txRef, record);
    return { giftCoins: gift.coins, platformCut, streamerCut };
  });
});

export const createLiveRoom = onCall(async (request) => {
  const uid = uidOf(request);
  const roomName = `skynet-${uid}-${Date.now()}`;
  await db.doc(`liveRooms/${roomName}`).set({
    hostId: uid, hostName: request.auth?.token.name ?? "SKYNET Creator",
    title: "SKYNET Live", status: "live", createdAt: FieldValue.serverTimestamp(),
  });
  return { roomName };
});

export const createLiveKitToken = onCall({
  secrets: [LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL],
}, async (request) => {
  const uid = uidOf(request);
  const roomName = String(request.data?.roomName ?? "");
  if (!/^skynet-[A-Za-z0-9_-]{1,120}$/.test(roomName))
    throw new HttpsError("invalid-argument", "Invalid room name.");
  const room = await db.doc(`liveRooms/${roomName}`).get();
  if (!room.exists || room.get("status") !== "live") throw new HttpsError("not-found", "Live room unavailable.");
  const isHost = room.get("hostId") === uid;
  const canPublish = request.data?.canPublish === true;
  if (canPublish && !isHost) throw new HttpsError("permission-denied", "Only the host can publish.");
  const token = new AccessToken(LIVEKIT_API_KEY.value(), LIVEKIT_API_SECRET.value(), {
    identity: uid, ttl: "2h",
  });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: isHost && canPublish, canSubscribe: true });
  return { token: await token.toJwt(), serverUrl: LIVEKIT_URL.value() };
});

export const requestWithdrawal = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = uidOf(request);
  const amount = Number(request.data?.amountCoins);
  if (!Number.isSafeInteger(amount) || amount < 1000) throw new HttpsError("invalid-argument", "Minimum request is 1,000 coins.");
  const userRef = db.doc(`users/${uid}`);
  const withdrawalRef = db.collection("withdrawals").doc();
  await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    const earnings = Number(user.get("streamerEarnings") ?? 0);
    if (!user.exists || earnings < amount) throw new HttpsError("failed-precondition", "Insufficient streamer earnings.");
    tx.update(userRef, { streamerEarnings: FieldValue.increment(-amount), pendingWithdrawalCoins: FieldValue.increment(amount) });
    tx.create(withdrawalRef, { uid, amountCoins: amount, status: "pending", createdAt: FieldValue.serverTimestamp() });
  });
  return { requestId: withdrawalRef.id, status: "pending" };
});

export const adminOverview = onCall(async (request) => {
  const uid = uidOf(request);
  await requireAdmin(uid);
  const [users, live, platform, withdrawals] = await Promise.all([
    db.collection("users").count().get(),
    db.collection("liveRooms").where("status", "==", "live").count().get(),
    db.doc("platform/earnings").get(),
    db.collection("withdrawals").where("status", "==", "pending").count().get(),
  ]);
  return {
    userCount: users.data().count, liveCount: live.data().count,
    platformCoins: platform.get("totalCoins") ?? 0,
    pendingWithdrawals: withdrawals.data().count,
  };
});

export const adminSetUserStatus = onCall(async (request) => {
  const uid = uidOf(request);
  await requireAdmin(uid);
  const targetUid = String(request.data?.targetUid ?? "");
  const disabled = request.data?.disabled === true;
  if (!targetUid || targetUid === uid) throw new HttpsError("invalid-argument", "Invalid target user.");
  await getAuth().updateUser(targetUid, { disabled });
  await db.doc(`users/${targetUid}`).set({ disabled }, { merge: true });
  return { ok: true };
});

export const adminReviewWithdrawal = onCall(async (request) => {
  const uid = uidOf(request);
  await requireAdmin(uid);
  const id = String(request.data?.withdrawalId ?? "");
  const decision = String(request.data?.decision ?? "");
  if (!id || !["approved", "rejected"].includes(decision))
    throw new HttpsError("invalid-argument", "Invalid review decision.");
  const ref = db.doc(`withdrawals/${id}`);
  await db.runTransaction(async (tx) => {
    const w = await tx.get(ref);
    if (!w.exists || w.get("status") !== "pending") throw new HttpsError("failed-precondition", "Request is not pending.");
    tx.update(ref, { status: decision, reviewedBy: uid, reviewedAt: FieldValue.serverTimestamp() });
    if (decision === "rejected") {
      const userRef = db.doc(`users/${w.get("uid")}`);
      tx.update(userRef, {
        streamerEarnings: FieldValue.increment(Number(w.get("amountCoins"))),
        pendingWithdrawalCoins: FieldValue.increment(-Number(w.get("amountCoins"))),
      });
    }
  });
  return { ok: true };
});
