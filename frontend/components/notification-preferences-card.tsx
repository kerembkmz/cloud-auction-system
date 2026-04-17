"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const IN_APP_KEY = "bidhub-notifications-in-app"
const EMAIL_KEY = "bidhub-notifications-email"

export function NotificationPreferencesCard() {
  const [isInAppEnabled, setIsInAppEnabled] = React.useState(true)
  const [isEmailEnabled, setIsEmailEnabled] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    setIsInAppEnabled(window.localStorage.getItem(IN_APP_KEY) !== "false")
    setIsEmailEnabled(window.localStorage.getItem(EMAIL_KEY) === "true")
    setIsReady(true)
  }, [])

  React.useEffect(() => {
    if (!isReady) {
      return
    }

    window.localStorage.setItem(IN_APP_KEY, String(isInAppEnabled))
    window.localStorage.setItem(EMAIL_KEY, String(isEmailEnabled))
  }, [isEmailEnabled, isInAppEnabled, isReady])

  return (
    <div id="notifications" className="px-4 lg:px-6">
      <Card className="border-slate-300 bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">Notification Preferences</CardTitle>
          <CardDescription className="text-slate-600">
            Control whether ended-auction alerts appear on screen and whether auction-end emails are sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">In-app notifications</p>
              <p className="text-xs text-slate-600">Show winner and seller alerts inside the app.</p>
            </div>
            <Switch checked={isInAppEnabled} onCheckedChange={setIsInAppEnabled} />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Email notifications</p>
              <p className="text-xs text-slate-600">Send winner and seller emails when an auction ends.</p>
            </div>
            <Switch checked={isEmailEnabled} onCheckedChange={setIsEmailEnabled} />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}