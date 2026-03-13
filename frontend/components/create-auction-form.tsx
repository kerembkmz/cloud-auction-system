"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createAuction, fetchAuctionSettings } from "@/services/auction";
import type { AuctionSettings } from "@/types/auction";

const DEFAULT_SETTINGS: AuctionSettings = {
  allowCustomDuration: false,
  fixedDurationMinutes: 5,
  minDurationMinutes: 5,
  maxDurationMinutes: 30,
};

export function CreateAuctionForm() {
  const router = useRouter();
  const { user: currentUser, isLoading: isLoadingUser, isAuthenticated } = useCurrentUser();

  const [settings, setSettings] = React.useState<AuctionSettings>(DEFAULT_SETTINGS);
  const [form, setForm] = React.useState({
    itemName: "",
    description: "",
    imageUrl: "",
    basePrice: "",
    requestedDurationMinutes: String(DEFAULT_SETTINGS.minDurationMinutes),
  });
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string>("");

  React.useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const nextSettings = await fetchAuctionSettings();
        if (isMounted) {
          setSettings(nextSettings);
          setForm((previous) => ({
            ...previous,
            requestedDurationMinutes: String(nextSettings.minDurationMinutes),
          }));
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load settings.";
          setFeedback(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) {
      setFeedback("Please log in to create an auction.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const auctionId = await createAuction({
        seller: currentUser,
        itemName: form.itemName,
        description: form.description,
        imageUrl: form.imageUrl,
        basePrice: Number(form.basePrice),
        requestedDurationMinutes: Number(form.requestedDurationMinutes),
      });

      router.push(`/auction/${auctionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create auction.";
      setFeedback(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-300 bg-white">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-900">Create a New Auction</CardTitle>
        <CardDescription className="text-slate-600">
          Creation uses the currently signed-in user. You cannot create while selling an active
          item or while leading any active highest bid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="border border-slate-300 p-3 text-xs text-slate-700 md:col-span-2">
            <p className="font-medium text-slate-900">Signed-in user</p>
            {isLoadingUser ? (
              <p>Checking authentication...</p>
            ) : currentUser ? (
              <>
                <p>ID: {currentUser.id}</p>
                <p>Name: {currentUser.name}</p>
                <p>Email: {currentUser.email}</p>
              </>
            ) : (
              <p>Please log in to create an auction.</p>
            )}
          </div>

          <label className="text-xs text-slate-900">
            Item name
            <input
              required
              value={form.itemName}
              onChange={(event) => setForm((previous) => ({ ...previous, itemName: event.target.value }))}
              className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
              placeholder="Vintage camera"
            />
          </label>

          <label className="text-xs text-slate-900 md:col-span-2">
            Description
            <textarea
              required
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, description: event.target.value }))
              }
              className="mt-2 min-h-24 w-full border border-slate-300 px-2 py-1 text-xs"
              placeholder="Short description of the item"
            />
          </label>

          <label className="text-xs text-slate-900 md:col-span-2">
            Photo link
            <input
              required
              value={form.imageUrl}
              onChange={(event) => setForm((previous) => ({ ...previous, imageUrl: event.target.value }))}
              className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
              placeholder="https://..."
            />
          </label>

          <label className="text-xs text-slate-900">
            Base price
            <input
              required
              min={1}
              step="0.01"
              type="number"
              value={form.basePrice}
              onChange={(event) => setForm((previous) => ({ ...previous, basePrice: event.target.value }))}
              className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
              placeholder="100"
            />
          </label>

          {settings.allowCustomDuration ? (
            <label className="text-xs text-slate-900">
              Duration (minutes)
              <input
                required
                type="number"
                min={settings.minDurationMinutes}
                max={settings.maxDurationMinutes}
                value={form.requestedDurationMinutes}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    requestedDurationMinutes: event.target.value,
                  }))
                }
                className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
              />
              <span className="mt-1 block text-xs text-slate-600">
                Allowed range: {settings.minDurationMinutes}-{settings.maxDurationMinutes} minutes
              </span>
            </label>
          ) : (
            <div className="border border-slate-300 p-3 text-xs text-slate-700">
              Duration is fixed to 5 minutes by dashboard settings.
            </div>
          )}

          <div className="md:col-span-2 flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingSettings || isLoadingUser || !isAuthenticated}
            >
              {isSubmitting ? "Creating..." : "Start Auction"}
            </Button>
            {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
