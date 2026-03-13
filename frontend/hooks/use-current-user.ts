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
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          let resolvedName = firebaseUser.uid;
          let balance = 0;
          let freezed_balance = 0;

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (typeof data.username === "string" && data.username.trim().length > 0) {
              resolvedName = data.username;
            }
            if (typeof data.balance === "number") {
              balance = data.balance;
            }
            if (typeof data.freezed_balance === "number") {
              freezed_balance = data.freezed_balance;
            }
          }

          setUser({
            id: firebaseUser.uid,
            name: resolvedName,
            email: firebaseUser.email ?? "",
            balance,
            freezed_balance
          });
        } catch {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            balance: 0,
            freezed_balance: 0
          });
        }
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
