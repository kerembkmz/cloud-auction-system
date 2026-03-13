"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { updateEmail, updateProfile, getAuth } from "firebase/auth"
import { doc, updateDoc, getFirestore } from "firebase/firestore"

import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isFirebaseConfigured } from "@/lib/firebase"
import { toast } from "sonner"

export default function AccountPage() {
    const { user, isLoading } = useCurrentUser()
    const router = useRouter()
    const [name, setName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [isUpdating, setIsUpdating] = React.useState(false)
    const [error, setError] = React.useState("")

    React.useEffect(() => {
        if (user) {
            setName(user.name)
            setEmail(user.email)
        }
    }, [user])

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!user) {
        router.push("/signup")
        return null
    }

    const handleSave = async () => {
        if (!isFirebaseConfigured) {
            setError("Firebase is not configured.")
            return
        }

        setIsUpdating(true)
        setError("")

        try {
            const auth = getAuth()
            const currentUser = auth.currentUser
            if (!currentUser) throw new Error("No authenticated user")

            // Update email if changed
            if (email !== user.email) {
                await updateEmail(currentUser, email)
            }

            // Update display name (assuming name is username)
            if (name !== user.name) {
                await updateProfile(currentUser, { displayName: name })
            }

            // Update Firestore
            const db = getFirestore()
            await updateDoc(doc(db, "users", user.id), {
                username: name,
                email: email,
            })

            toast.success("Account updated successfully!")
            router.push("/overview")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update account")
        } finally {
            setIsUpdating(false)
        }
    }

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
    )
}