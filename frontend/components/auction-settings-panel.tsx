"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAuctionSettings, saveAuctionSettings } from "@/services/auction";
import type { AuctionSettings } from "@/types/auction";

const DEFAULT_SETTINGS: AuctionSettings = {
  allowCustomDuration: false,
  fixedDurationMinutes: 5,
  minDurationMinutes: 5,
  maxDurationMinutes: 30,
  autoRestartOnNoBid: true,
  changeStartingPriceOnRestart: false,
};

export function AuctionSettingsPanel() {
  const [settings, setSettings] = React.useState<AuctionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string>("");

  React.useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const nextSettings = await fetchAuctionSettings();
        if (isMounted) {
          setSettings(nextSettings);
          setMessage("");
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load auction settings.";
          setMessage(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveAuctionSettings(settings);
      setMessage("Auction settings saved.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save auction settings.";
      setMessage(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <Card className="border-slate-300 bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Auction Duration Settings</CardTitle>
          <CardDescription className="text-slate-600">
            If custom duration is disabled, every auction lasts exactly 5 minutes. If enabled,
            creators can choose a duration between the minimum and maximum values below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-slate-600">Loading settings...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 border border-slate-300 p-3 text-xs text-slate-900 md:col-span-3">
                <input
                  type="checkbox"
                  checked={settings.allowCustomDuration}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      allowCustomDuration: event.target.checked,
                    }))
                  }
                />
                Allow creators to choose duration
              </label>

              <div className="border border-slate-300 p-3">
                <p className="text-xs font-medium text-slate-900">Fixed duration</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">5 minutes</p>
                <p className="mt-1 text-xs text-slate-600">Used when custom duration is disabled.</p>
              </div>

              <label className="border border-slate-300 p-3 text-xs text-slate-900">
                Minimum duration (minutes)
                <input
                  type="number"
                  min={1}
                  value={settings.minDurationMinutes}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      minDurationMinutes: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
                />
              </label>

              <label className="border border-slate-300 p-3 text-xs text-slate-900">
                Maximum duration (minutes)
                <input
                  type="number"
                  min={settings.minDurationMinutes}
                  value={settings.maxDurationMinutes}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      maxDurationMinutes: Math.max(
                        previous.minDurationMinutes,
                        Number(event.target.value) || previous.minDurationMinutes
                      ),
                    }))
                  }
                  className="mt-2 w-full border border-slate-300 px-2 py-1 text-xs"
                />
              </label>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            {message ? <p className="text-xs text-slate-600">{message}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-300 bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Auction Restart Settings</CardTitle>
          <CardDescription className="text-slate-600">
            Configure how auctions behave when they end with no bidders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-slate-600">Loading settings...</p>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 border border-slate-300 p-3 text-xs text-slate-900">
                <input
                  type="checkbox"
                  checked={settings.autoRestartOnNoBid ?? true}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      autoRestartOnNoBid: event.target.checked,
                    }))
                  }
                />
                Automatically restart auctions with no bids
              </label>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            {message ? <p className="text-xs text-slate-600">{message}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
