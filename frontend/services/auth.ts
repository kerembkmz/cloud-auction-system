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
  DocumentData,
  getDocs,
  getFirestore,
  limit,
  query,
  QueryDocumentSnapshot,
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

function isEmailIdentifier(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getUserByUsername(
  username: string,
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const db = getFirestore();
  const usersRef = collection(db, "users");
  const usernameQuery = query(
    usersRef,
    where("username", "==", normalizeUsername(username)),
    limit(2),
  );
  const existingUsers = await getDocs(usernameQuery);

  if (existingUsers.empty) {
    return null;
  }

  return existingUsers.docs[0];
}

async function getUsersByEmail(
  email: string,
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const db = getFirestore();
  const usersRef = collection(db, "users");
  const emailQuery = query(
    usersRef,
    where("email", "==", normalizeEmail(email)),
    limit(2),
  );
  const existingUsers = await getDocs(emailQuery);
  return existingUsers.docs;
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
  await loginWithEmailOrUsername(email, password);
}

export async function loginWithEmailOrUsername(
  identifier: string,
  password: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new Error("Please enter your email or username.");
  }

  let emailToSignIn = normalizedIdentifier;

  if (isEmailIdentifier(normalizedIdentifier)) {
    emailToSignIn = normalizeEmail(normalizedIdentifier);
  } else {
    const existingUser = await getUserByUsername(normalizedIdentifier);

    if (!existingUser) {
      throw new Error("No user exists with this username.");
    }

    const userData = existingUser.data();
    if (
      typeof userData.email !== "string" ||
      userData.email.trim().length === 0
    ) {
      throw new Error("This account does not have a valid login email.");
    }

    emailToSignIn = normalizeEmail(userData.email);
  }

  try {
    const auth = getAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      emailToSignIn,
      password,
    );

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
  firstName: string,
  surname: string,
  email: string,
  password: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedFirstName = firstName.trim();
  const normalizedSurname = surname.trim();
  const normalizedEmail = normalizeEmail(email);

  if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
    throw new Error(
      "Username must be 3-20 characters and use only letters, numbers, or underscores.",
    );
  }

  if (!normalizedEmail) {
    throw new Error("Please enter a valid email address.");
  }

  if (!normalizedFirstName || !normalizedSurname) {
    throw new Error("Please provide both name and surname.");
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
        firstName: normalizedFirstName,
        surname: normalizedSurname,
        createdAt: serverTimestamp(),
        balance: 0,
        freezed_balance: {},
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

export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const existingUser = await getUserByUsername(username);

  if (!existingUser) {
    return true;
  }

  if (!excludeUserId) {
    return false;
  }

  return existingUser.id === excludeUserId;
}

export async function isEmailAvailable(
  email: string,
  excludeUserId?: string,
): Promise<boolean> {
  const existingUsers = await getUsersByEmail(email);

  if (existingUsers.length === 0) {
    return true;
  }

  if (!excludeUserId) {
    return false;
  }

  return existingUsers.every((userDoc) => userDoc.id === excludeUserId);
}

export async function logout(): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add your env variables.");
  }

  try {
    const auth = getAuth();
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
