"use client"

import * as React from "react"
import { onValue, ref } from "firebase/database"

import { AuctionEndNotification } from "@/components/auction-end-notification"
import { useCurrentUser } from "@/hooks/use-current-user"
import { database, isFirebaseConfigured } from "@/lib/firebase"

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
const VIEWED_KEY = "bidhub-viewed-overview-auction-notification"

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

  React.useEffect(() => {
    setIsInAppEnabled(window.localStorage.getItem(IN_APP_KEY) !== "false")
  }, [])

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

      const viewedAuctionId = window.localStorage.getItem(VIEWED_KEY)
      const relevantAuction = Object.entries(value)
        .map(([id, auctionValue]) => toAuction(id, auctionValue))
        .filter((auction): auction is AuctionNotificationSource => auction !== null)
        .filter((auction) => auction.status !== "active")
        .filter((auction) => auction.currentHighestBidOwnerId === user.id || auction.sellerId === user.id)
        .sort((a, b) => b.endsAt - a.endsAt)
        .find((auction) => auction.id !== viewedAuctionId)

      if (!relevantAuction) {
        setNotification(null)
        return
      }

      setNotification({
        auction: relevantAuction,
        role: relevantAuction.currentHighestBidOwnerId === user.id ? "winner" : "seller",
      })
    })

    return () => unsubscribe()
  }, [isLoading, isInAppEnabled, user])

  const handleClose = React.useCallback(() => {
    if (notification) {
      window.localStorage.setItem(VIEWED_KEY, notification.auction.id)
    }
    setNotification(null)
  }, [notification])

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