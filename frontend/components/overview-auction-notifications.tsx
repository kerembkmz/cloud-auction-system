"use client"

import * as React from "react"
import { onValue, ref } from "firebase/database"

import { AuctionEndNotification } from "@/components/auction-end-notification"
import { useCurrentUser } from "@/hooks/use-current-user"
import { database, isFirebaseConfigured } from "@/lib/firebase"
import { finalizeExpiredAuctions } from "@/services/auction"

interface AuctionNotificationSource {
  id: string
  itemName: string
  sellerId: string
  sellerName: string
  currentHighestBid: number
  currentHighestBidOwnerId: string | null
  currentHighestBidOwnerName: string | null
  basePrice: number
  endsAt: number
  status: "active" | "inactive" | "ended" | "cancelled"
}

const IN_APP_KEY = "bidhub-notifications-in-app"
const FINALIZE_INTERVAL_MS = 5000

function toAuction(id: string, value: unknown): AuctionNotificationSource | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const itemName = typeof record.itemName === "string" ? record.itemName : null
  const status =
    record.status === "active" ||
    record.status === "inactive" ||
    record.status === "ended" ||
    record.status === "cancelled"
      ? record.status
      : "active"

  if (!itemName) {
    return null
  }

  return {
    id,
    itemName,
    sellerId: typeof record.sellerId === "string" ? record.sellerId : "unknown-seller",
    sellerName: typeof record.sellerName === "string" ? record.sellerName : "Unknown seller",
    currentHighestBid:
      typeof record.currentHighestBid === "number"
        ? record.currentHighestBid
        : typeof record.basePrice === "number"
          ? record.basePrice
          : 0,
    currentHighestBidOwnerId:
      typeof record.currentHighestBidOwnerId === "string" ? record.currentHighestBidOwnerId : null,
    currentHighestBidOwnerName:
      typeof record.currentHighestBidOwnerName === "string"
        ? record.currentHighestBidOwnerName
        : null,
    basePrice: typeof record.basePrice === "number" ? record.basePrice : 0,
    endsAt: typeof record.endsAt === "number" ? record.endsAt : 0,
    status,
  }
}

export function OverviewAuctionNotifications() {
  const { user, isLoading } = useCurrentUser()
  const [notification, setNotification] = React.useState<{
    auction: AuctionNotificationSource
    role: "winner" | "seller"
  } | null>(null)
  const [isInAppEnabled, setIsInAppEnabled] = React.useState(true)
  const previousStatusesRef = React.useRef<Record<string, AuctionNotificationSource["status"]>>({})
  const isInitializedRef = React.useRef(false)
  const shownTransitionIdsRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    setIsInAppEnabled(window.localStorage.getItem(IN_APP_KEY) !== "false")

    const handlePreferenceChange = () => {
      setIsInAppEnabled(window.localStorage.getItem(IN_APP_KEY) !== "false")
    }

    window.addEventListener("bidhub:notification-preferences-changed", handlePreferenceChange)
    return () => window.removeEventListener("bidhub:notification-preferences-changed", handlePreferenceChange)
  }, [])

  React.useEffect(() => {
    if (!isFirebaseConfigured || !database || isLoading || !user) {
      return
    }

    void finalizeExpiredAuctions()
    const timer = window.setInterval(() => {
      void finalizeExpiredAuctions()
    }, FINALIZE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [isLoading, user])

  React.useEffect(() => {
    if (!isFirebaseConfigured || !database || isLoading || !user || !isInAppEnabled) {
      setNotification(null)
      return
    }

    const auctionsRef = ref(database, "auctions")
    const unsubscribe = onValue(auctionsRef, (snapshot) => {
      const value = snapshot.val() as Record<string, unknown> | null

      if (!value) {
        setNotification(null)
        return
      }

      const auctions = Object.entries(value)
        .map(([id, auctionValue]) => toAuction(id, auctionValue))
        .filter((auction): auction is AuctionNotificationSource => auction !== null)
        .filter((auction) => auction.currentHighestBidOwnerId === user.id || auction.sellerId === user.id)

      const nextStatuses: Record<string, AuctionNotificationSource["status"]> = {}
      auctions.forEach((auction) => {
        nextStatuses[auction.id] = auction.status
      })

      if (!isInitializedRef.current) {
        previousStatusesRef.current = nextStatuses
        isInitializedRef.current = true
        return
      }

      const transitionedAuctions = auctions
        .filter((auction) => previousStatusesRef.current[auction.id] === "active")
        .filter((auction) => auction.status !== "active")
        .filter((auction) => !shownTransitionIdsRef.current.has(auction.id))
        .sort((a, b) => b.endsAt - a.endsAt)

      previousStatusesRef.current = nextStatuses

      const relevantAuction = transitionedAuctions[0]

      if (!relevantAuction) {
        return
      }

      shownTransitionIdsRef.current.add(relevantAuction.id)

      setNotification({
        auction: relevantAuction,
        role: relevantAuction.currentHighestBidOwnerId === user.id ? "winner" : "seller",
      })
    })

    return () => unsubscribe()
  }, [isLoading, isInAppEnabled, user])

  const handleClose = React.useCallback(() => {
    setNotification(null)
  }, [])

  if (!notification) {
    return null
  }

  return (
    <AuctionEndNotification
      isOpen={true}
      itemName={notification.auction.itemName}
      winnerName={notification.auction.currentHighestBidOwnerName || "No winner"}
      winningAmount={notification.auction.currentHighestBid || notification.auction.basePrice}
      userRole={notification.role}
      sellerId={notification.auction.sellerId}
      currentUserId={user?.id}
      onClose={handleClose}
    />
  )
}