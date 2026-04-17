"use client";

import * as React from "react";

import { AuthGuard } from "@/components/auth-guard";
import { AuctionSettingsPanel } from "@/components/auction-settings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    const loadAuthState = async () => {
      const response = await fetch("/api/admin-auth", {
        credentials: "include",
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const data = (await response.json()) as { authenticated?: boolean };
      setIsAuthenticated(Boolean(data.authenticated));
    };

    void loadAuthState();
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Invalid username or password.");
      }

      setIsAuthenticated(true);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid username or password.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin-auth", {
      method: "DELETE",
      credentials: "include",
    });

    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setErrorMessage("");
  };

  return (
    <AuthGuard>
      <main className="min-h-svh bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <Card className="border-slate-300 bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Admin Panel</CardTitle>
              <CardDescription className="text-slate-600">
                Manage system-level auction configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <p className="text-slate-700">Authenticated as admin.</p>
                  <Button variant="outline" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              ) : (
                <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleLogin}>
                  <label className="text-xs text-slate-900">
                    Username
                    <input
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
                      placeholder="admin"
                    />
                  </label>

                  <label className="text-xs text-slate-900">
                    Password
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
                      placeholder="********"
                    />
                  </label>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <Button type="submit">Log in</Button>
                    {errorMessage ? <p className="text-xs text-slate-600">{errorMessage}</p> : null}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {isAuthenticated ? <AuctionSettingsPanel /> : null}
        </div>
      </main>
    </AuthGuard>
  );
}
