"use client";

import { getAuth, updateEmail, updateProfile } from "firebase/auth";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isFirebaseConfigured } from "@/lib/firebase";
import { isEmailAvailable, isUsernameAvailable } from "@/services/auth";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push("/signup");
    return null;
  }

  const handleSave = async () => {
    if (!isFirebaseConfigured) {
      setError("Firebase is not configured.");
      return;
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const currentName = user.name.trim().toLowerCase();
    const currentEmail = user.email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setError("Username and email are required.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedName)) {
      setError(
        "Username must be 3-20 characters and use only letters, numbers, or underscores.",
      );
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      if (normalizedName !== currentName) {
        const usernameAvailable = await isUsernameAvailable(
          normalizedName,
          user.id,
        );
        if (!usernameAvailable) {
          throw new Error("This username is already taken.");
        }
      }

      if (normalizedEmail !== currentEmail) {
        const emailAvailable = await isEmailAvailable(normalizedEmail, user.id);
        if (!emailAvailable) {
          throw new Error("This email is already in use.");
        }
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No authenticated user");

      // Update email if changed
      if (normalizedEmail !== currentEmail) {
        await updateEmail(currentUser, normalizedEmail);
      }

      // Update display name (assuming name is username)
      if (normalizedName !== currentName) {
        await updateProfile(currentUser, { displayName: normalizedName });
      }

      // Update Firestore
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.id), {
        username: normalizedName,
        email: normalizedEmail,
      });

      toast.success("Account updated successfully!");
      router.push("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Update your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Username</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleSave} disabled={isUpdating} className="w-full">
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
