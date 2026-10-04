import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: typeof window !== "undefined" && process.env.NODE_ENV === "production" &&
      /^[a-z0-9-]+\.(?:firebaseapp\.com|web\.app)$/.test(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "")
    ? window.location.host
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} satisfies Record<string, string | undefined>;

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

export const missingFirebaseEnvKeys = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0;

export const firebaseApp = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig as FirebaseOptions)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;

export type FirebaseServices = {
  auth: Auth;
  db: Firestore;
  user: User;
};

export async function getFirebaseServices(): Promise<FirebaseServices> {
  if (!firebaseAuth || !firebaseDb) throw new Error("Firebase no está configurado.");
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Debes iniciar sesión para sincronizar.");
  return { auth: firebaseAuth, db: firebaseDb, user };
}
