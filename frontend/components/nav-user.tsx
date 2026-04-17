"use client"

import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { DotsThreeVerticalIcon, UserCircleIcon, CreditCardIcon, BellIcon, SignOutIcon } from "@phosphor-icons/react"
import { useCurrentUser } from "@/hooks/use-current-user"
import { logout } from "@/services/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getUserInitials, getAvatarBackgroundColor, cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

const IN_APP_KEY = "bidhub-notifications-in-app"
const BROWSER_KEY = "bidhub-notifications-browser"

export function NavUser() {
  const { user, isLoading } = useCurrentUser()
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = React.useState(false)
  const [isInAppEnabled, setIsInAppEnabled] = React.useState(true)
  const [isBrowserEnabled, setIsBrowserEnabled] = React.useState(false)
  const [isPreferenceReady, setIsPreferenceReady] = React.useState(false)

  React.useEffect(() => {
    setIsInAppEnabled(window.localStorage.getItem(IN_APP_KEY) !== "false")
    setIsBrowserEnabled(window.localStorage.getItem(BROWSER_KEY) === "true")
    setIsPreferenceReady(true)
  }, [])

  React.useEffect(() => {
    if (!isPreferenceReady || !isBrowserEnabled || typeof window === "undefined") {
      return
    }

    if (!("Notification" in window)) {
      setIsBrowserEnabled(false)
      return
    }

    if (Notification.permission === "default") {
      void Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          setIsBrowserEnabled(false)
        }
      })
    }

    if (Notification.permission === "denied") {
      setIsBrowserEnabled(false)
    }
  }, [isBrowserEnabled, isPreferenceReady])

  React.useEffect(() => {
    if (!isPreferenceReady) {
      return
    }

    window.localStorage.setItem(IN_APP_KEY, String(isInAppEnabled))
    window.localStorage.setItem(BROWSER_KEY, String(isBrowserEnabled))
    window.dispatchEvent(new CustomEvent("bidhub:notification-preferences-changed"))
  }, [isBrowserEnabled, isInAppEnabled, isPreferenceReady])

  if (isLoading || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Avatar className="size-8 rounded-lg bg-slate-500 text-white">
              <AvatarFallback className="rounded-lg">...</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const initials = getUserInitials(user.name)
  const bgColor = getAvatarBackgroundColor(user.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg overflow-hidden">
              <AvatarFallback className={cn("rounded-lg text-white font-bold text-xs flex items-center justify-center", bgColor)}>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {user.email}
              </span>
            </div>
            <DotsThreeVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg overflow-hidden">
                    <AvatarFallback className={cn("rounded-lg text-white font-bold text-xs flex items-center justify-center", bgColor)}>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/account")}>
                <UserCircleIcon
                />
                Account
              </DropdownMenuItem>
              <Link href="/payment" className="block">
                <DropdownMenuItem>
                  <CreditCardIcon />
                  Add Balance
                </DropdownMenuItem>
              </Link>
                <DropdownMenuItem onClick={() => setIsNotificationDialogOpen(true)}>
                <BellIcon
                />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await logout()
                  } finally {
                    router.replace("/")
                  }
                }}
              >
              <SignOutIcon
              />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="border-slate-300 bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-900">Notification Preferences</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Configure in-app and browser alerts for auction results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">In-app notifications</p>
                <p className="text-xs text-slate-600">Show winner and seller alerts live in the app.</p>
              </div>
              <Switch checked={isInAppEnabled} onCheckedChange={setIsInAppEnabled} />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Browser notifications</p>
                <p className="text-xs text-slate-600">Show native browser popups when an auction ends.</p>
              </div>
              <Switch checked={isBrowserEnabled} onCheckedChange={setIsBrowserEnabled} />
            </label>
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
