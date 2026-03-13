"use client";

import * as React from "react";

import { AuthGuard } from "@/components/auth-guard";
import { AuctionSettingsPanel } from "@/components/auction-settings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";
const ADMIN_SESSION_KEY = "auction_admin_authenticated";

export default function AdminPage() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const authenticated = window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
    setIsAuthenticated(authenticated);
  }, []);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setErrorMessage("");
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      return;
    }

    setErrorMessage("Invalid username or password.");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setErrorMessage("");
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
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
