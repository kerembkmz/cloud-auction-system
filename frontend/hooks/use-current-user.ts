"use client";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import * as React from "react";

import { isFirebaseConfigured } from "@/lib/firebase";
import type { AppUser } from "@/types/user";

export interface CurrentUserState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", firebaseUser.uid);

      unsubscribeUserDoc = onSnapshot(
        userRef,
        (snapshot) => {
          let resolvedName = firebaseUser.uid;
          let resolvedFirstName: string | undefined;
          let resolvedSurname: string | undefined;
          let balance = 0;
          let freezedBalance: Record<string, number> = {};

          if (snapshot.exists()) {
            const data = snapshot.data();
            if (
              typeof data.username === "string" &&
              data.username.trim().length > 0
            ) {
              resolvedName = data.username;
            }
            if (
              typeof data.firstName === "string" &&
              data.firstName.trim().length > 0
            ) {
              resolvedFirstName = data.firstName;
            }
            if (
              typeof data.surname === "string" &&
              data.surname.trim().length > 0
            ) {
              resolvedSurname = data.surname;
            }
            if (typeof data.balance === "number") {
              balance = data.balance;
            }
            if (
              data.freezed_balance &&
              typeof data.freezed_balance === "object"
            ) {
              freezedBalance = Object.fromEntries(
                Object.entries(
                  data.freezed_balance as Record<string, unknown>,
                ).filter(
                  ([, v]) => typeof v === "number" && (v as number) > 0,
                ) as [string, number][],
              );
            }
          }

          setUser({
            id: firebaseUser.uid,
            name: resolvedName,
            firstName: resolvedFirstName,
            surname: resolvedSurname,
            email: firebaseUser.email ?? "",
            balance,
            freezed_balance: freezedBalance,
          });
          setIsLoading(false);
        },
        () => {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.uid,
            firstName: undefined,
            surname: undefined,
            email: firebaseUser.email ?? "",
            balance: 0,
            freezed_balance: {},
          });
          setIsLoading(false);
        },
      );
    });

    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribe();
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
  };
}
