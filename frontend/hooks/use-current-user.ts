"use client";

import * as React from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

import { isFirebaseConfigured } from "@/lib/firebase";
import type { AppUser } from "@/types/user";

export interface CurrentUserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

async function resolveUserName(userId: string): Promise<string> {
  try {
    const db = getFirestore();
    const snapshot = await getDoc(doc(db, "users", userId));
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (typeof data.username === "string" && data.username.trim().length > 0) {
        return data.username;
      }
    }
  } catch {
    // Return userId as fallback
    return userId;
  }

  return userId;
}

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      void (async () => {
        const resolvedName = await resolveUserName(firebaseUser.uid);

        setUser({
          id: firebaseUser.uid,
          name: resolvedName,
          email: firebaseUser.email ?? "",
          avatar: firebaseUser.photoURL ?? "",
        });
        setIsLoading(false);
      })();
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
  };
}
