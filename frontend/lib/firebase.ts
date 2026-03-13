import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const requiredFirebaseKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

const isFirebaseConfigured = requiredFirebaseKeys.every(
  (key) => key.trim().length > 0,
);

const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const database: Database = getDatabase(firebaseApp);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export { database, db, auth, isFirebaseConfigured };
