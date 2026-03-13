import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { isFirebaseConfigured } from "@/lib/firebase";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/no-app":
      return "Firebase app is not initialized. Check your Firebase config.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Please enter your email address first.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/wrong-password":
      return "Email or password is incorrect.";
    case "auth/user-not-found":
      return "No user exists with this email.";
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  try {
    const auth = getAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      await signOut(auth);
      throw new Error(
        "Please verify your email address before logging in. Check your inbox.",
      );
    }
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function registerWithEmailPassword(
  username: string,
  email: string,
  password: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    throw new Error(
      "Username must be 3-20 characters and use only letters, numbers, or underscores.",
    );
  }

  if (!normalizedEmail) {
    throw new Error("Please enter a valid email address.");
  }

  const db = getFirestore();
  const usersRef = collection(db, "users");
  const usernameQuery = query(
    usersRef,
    where("username", "==", normalizedUsername),
    limit(1),
  );
  const existingUsername = await getDocs(usernameQuery);

  if (!existingUsername.empty) {
    throw new Error("This username is already taken.");
  }

  try {
    const auth = getAuth();
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    const user = credential.user;
    const userRef = doc(db, "users", user.uid);

    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: normalizedEmail,
        username: normalizedUsername,
        createdAt: serverTimestamp(),
        balance: 0,
        freezed_balance: 0,
      });

      await sendEmailVerification(user);
      await signOut(auth);
    } catch (error) {
      await deleteUser(user);
      throw error;
    }
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Please enter your email address first.");
  }

  try {
    const db = getFirestore();
    const usersRef = collection(db, "users");
    const emailQuery = query(
      usersRef,
      where("email", "==", normalizedEmail),
      limit(1),
    );
    const existingUser = await getDocs(emailQuery);

    if (existingUser.empty) {
      throw new Error("No account exists with this email address.");
    }

    const auth = getAuth();
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
