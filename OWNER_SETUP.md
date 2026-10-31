# SKYNET owner and deployment setup

## What this package is
This is a full-stack starter implementation, not a production-certified or already
deployed service. It contains Flutter client source for Android/iOS, callable
Firebase backend functions, Firestore rules, hosted Stripe Checkout, LiveKit
room/token integration, coin wallet crediting, 4% gift commission accounting,
withdrawal requests, and a role-protected admin overview. The admin screen is
inside the app and adapts to phone/tablet/web layouts. For a separate desktop
admin URL, deploy the same Flutter app as web or build a dedicated admin frontend.

## Accounts and owner access
1. Create your own Firebase project under an email/account you control.
2. Enable Firebase Authentication (Email/Password), Firestore, Functions and App
   Check. Add billing: Cloud Functions and live video services may incur charges.
3. Register Android, iOS and Web apps in Firebase.
4. Install FlutterFire CLI and run `flutterfire configure`; generate
   `lib/firebase_options.dart` if desired. Update `main.dart` initialization
   to use `DefaultFirebaseOptions.currentPlatform` if using that generated file.
   Add native Firebase configuration files for the platforms you target.
5. Create your owner account through the app. Get its Firebase Auth UID from
   Firebase Console > Authentication.
6. Set owner claim using a trusted local Admin SDK script, never from the app:
   `getAuth().setCustomUserClaims(OWNER_UID, { role: "owner" })`
   Then create/refresh the matching `users/OWNER_UID` profile. Do not grant this
   role to anyone else. Sign out/in to refresh the ID token.
7. Admin access checks the server-side custom claim, not a client-editable field.

## Configure Stripe coin payments
1. Open a Stripe account in the legal entity's name and complete its business
   verification and required platform disclosures.
2. Store secrets using Firebase:
   `firebase functions:secrets:set STRIPE_SECRET_KEY`
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`
3. Create a Stripe webhook endpoint for the deployed `stripeWebhook` function URL.
   Subscribe to `checkout.session.completed`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. Replace the example success/cancel URLs in `createCoinCheckout` with your
   real HTTPS website/app return pages.
5. Test with Stripe test keys and test cards before switching to live mode.
6. Coin pack prices are examples in EUR and must be reviewed for taxes,
   consumer law, refunds, chargebacks, and app-store payment rules. Digital goods
   sold inside iOS/Android apps may be subject to Apple/Google billing policies.
   The included external Checkout flow is not automatically store-compliant.

## Configure LiveKit live video
1. Create a LiveKit Cloud project or self-host LiveKit.
2. Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` using
   `firebase functions:secrets:set ...`.
3. Add camera/microphone permissions to AndroidManifest.xml and iOS Info.plist
   as required by the LiveKit Flutter SDK.
4. Complete production track rendering, speaker/video layout, reconnect handling,
   stream ending, viewer counts, chat, reporting, moderation and network tests.
   The sample client connects to a room but deliberately does not yet implement
   polished video rendering or in-stream chat.

## Gift commission
The backend owns the gift catalogue and split. For each gift:
`platformCut = floor(giftCoins * 4 / 100)` and
`streamerCut = giftCoins - platformCut`.
A Firestore transaction atomically debits viewer coins, credits streamer
earnings, records SKYNET's coin commission and creates an idempotency record.
Small gifts may round the 4% share down to zero coins; consider subcoin units
if fractional precision is required. The 4% is a share of gift coin value,
not automatically 4% of cash revenue or profit after fees/tax.

## Withdrawals
The app submits withdrawal requests and reserves streamer earnings for admin
review. It does NOT transfer money to bank accounts. Before enabling payouts,
choose a payout provider, complete KYC/AML and tax processes, configure payout
webhooks, fraud controls, reserve/chargeback policies and country availability.
Admin approval alone is not a bank transfer.

## Deploy
From project root:
- `flutter pub get`
- `cd functions && npm install && npm run build`
- `cd .. && firebase deploy --only firestore:rules,functions`

Run mobile:
- `flutter run`

Build web:
- `flutter build web`
- Deploy `build/web` to Firebase Hosting or another HTTPS host.

## Before public launch
Security review and tests; App Check enforcement; email verification; password
reset; privacy policy and terms; age and safety policy; reporting/blocking;
moderation tools; chat abuse controls; data retention and deletion; audit logs;
rate limits; payment/refund/chargeback handling; tax and regulatory review;
accessibility; load testing; backups; monitoring; app-store review. Do not store
payment card details yourself. Never put service-account keys or LiveKit secrets
inside Flutter.
