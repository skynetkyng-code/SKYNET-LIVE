// Run only in a trusted local/server environment with Firebase Admin SDK
// authenticated as a project administrator. Never ship this script in the app.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault() });

async function grantOwner(uid: string) {
  await getAuth().setCustomUserClaims(uid, { role: "owner" });
  console.log(`Owner role granted to ${uid}. Ask the owner to sign out and in.`);
}

// Replace with the UID from Firebase Authentication console.
grantOwner("REPLACE_WITH_YOUR_FIREBASE_AUTH_UID");
