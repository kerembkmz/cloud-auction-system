"use client"

import Link from "next/link"
import * as React from "react"
import { onValue, ref } from "firebase/database"

import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatUsdAmount } from "@/lib/utils"
import { database, isFirebaseConfigured } from "@/lib/firebase"
import { finalizeExpiredAuctions } from "@/services/auction"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useRouter } from "next/navigation"

interface Auction {
  id: string
  itemName: string
  imageUrl: string
  sellerId: string
  sellerName: string
  basePrice: number
  currentHighestBid: number
  currentHighestBidOwnerId: string | null
  endsAt: number
  status: "active" | "inactive" | "ended" | "cancelled"
}

const FALLBACK_AUCTIONS: Auction[] = [
  {
    id: "fallback-1",
    itemName: "Vintage Camera",
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    sellerId: "seller-camera",
    sellerName: "Camera Seller",
    basePrice: 420,
    currentHighestBid: 420,
    currentHighestBidOwnerId: null,
    endsAt: 0,
    status: "active",
  },
  {
    id: "fallback-2",
    itemName: "Mechanical Keyboard",
    imageUrl:
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80",
    sellerId: "seller-keyboard",
    sellerName: "Keyboard Seller",
    basePrice: 165,
    currentHighestBid: 165,
    currentHighestBidOwnerId: null,
    endsAt: 0,
    status: "active",
  },
  {
    id: "fallback-3",
    itemName: "Retro Record Player",
    imageUrl:
      "https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=1200&q=80",
    sellerId: "seller-records",
    sellerName: "Record Seller",
    basePrice: 880,
    currentHighestBid: 880,
    currentHighestBidOwnerId: null,
    endsAt: 0,
    status: "active",
  },
]

function buildFallbackAuctions(baseNow: number): Auction[] {
  return [
    {
      ...FALLBACK_AUCTIONS[0],
      endsAt: baseNow + 1000 * 60 * 56,
    },
    {
      ...FALLBACK_AUCTIONS[1],
      endsAt: baseNow + 1000 * 60 * 120,
    },
    {
      ...FALLBACK_AUCTIONS[2],
      endsAt: baseNow + 1000 * 60 * 33,
    },
  ]
}

function toAuction(id: string, value: unknown): Auction | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const itemName = typeof record.itemName === "string" ? record.itemName : null
  const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl : ""
  const sellerId = typeof record.sellerId === "string" ? record.sellerId : "unknown-seller"
  const sellerName = typeof record.sellerName === "string" ? record.sellerName : sellerId
  const status =
    record.status === "active" ||
    record.status === "inactive" ||
    record.status === "ended" ||
    record.status === "cancelled"
      ? record.status
      : "active"
  const endsAt =
    typeof record.endsAt === "number"
      ? record.endsAt
      : typeof record.endsAt === "string"
        ? Number(record.endsAt)
        : NaN
  const currentHighestBid =
    typeof record.currentHighestBid === "number"
      ? record.currentHighestBid
      : typeof record.currentPrice === "number"
        ? record.currentPrice
        : typeof record.startingPrice === "number"
          ? record.startingPrice
          : 0
  const basePrice =
    typeof record.basePrice === "number"
      ? record.basePrice
      : typeof record.startingPrice === "number"
        ? record.startingPrice
        : currentHighestBid
  const currentHighestBidOwnerId =
    typeof record.currentHighestBidOwnerId === "string" ? record.currentHighestBidOwnerId : null

  if (!itemName || Number.isNaN(endsAt)) {
    return null
  }

  return {
    id,
    itemName,
    imageUrl,
    sellerId,
    sellerName,
    basePrice,
    currentHighestBid,
    currentHighestBidOwnerId,
    endsAt,
    status,
  }
}

function formatRemainingTime(endsAt: number, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((endsAt - now) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export function SectionCards() {
  const [auctions, setAuctions] = React.useState<Auction[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [now, setNow] = React.useState(0)
  const { isAuthenticated } = useCurrentUser()
  const router = useRouter()

  React.useEffect(() => {
    setNow(Date.now())

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  React.useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setAuctions(buildFallbackAuctions(Date.now()))
      setIsLoading(false)
      return
    }

    void finalizeExpiredAuctions()

    const auctionsRef = ref(database, "auctions")
    const unsubscribe = onValue(auctionsRef, (snapshot) => {
      const value = snapshot.val() as Record<string, unknown> | null

      if (!value) {
        setAuctions([])
        setIsLoading(false)
        return
      }

      const mapped = Object.entries(value)
        .map(([id, auctionValue]) => toAuction(id, auctionValue))
        .filter((auction): auction is Auction => auction !== null)
        .filter((auction) => auction.status === "active" && auction.endsAt > Date.now())
        .sort((a, b) => a.endsAt - b.endsAt)

      setAuctions(mapped)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="px-4 text-xs text-muted-foreground lg:px-6">
        Loading active auctions...
      </div>
    )
  }

  if (auctions.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-slate-300 bg-slate-50">
          <CardHeader>
            <CardTitle>No active auctions</CardTitle>
            <CardDescription>
              Active auctions will appear here once they are added to Firebase
              Realtime Database under the `auctions` node.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {auctions.map((auction) => (
        <Card key={auction.id} className="border-slate-300 bg-white pt-0">
          <div className="aspect-[4/3] w-full overflow-hidden border-b border-slate-200">
            <img
              src={auction.imageUrl || "https://placehold.co/960x640/e2e8f0/1e293b?text=Auction+Item"}
              alt={auction.itemName}
              className="h-full w-full object-cover"
            />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              {auction.itemName}
            </CardTitle>
            <CardDescription className="text-slate-600">
              Remaining time: {formatRemainingTime(auction.endsAt, now)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600">Seller: {auction.sellerName}</p>
            <p className="text-xs text-slate-600">
              {auction.currentHighestBidOwnerId ? "Current highest bid is" : "Starting price is"}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {formatUsdAmount(
                auction.currentHighestBidOwnerId ? auction.currentHighestBid : auction.basePrice,
              )}
            </p>
          </CardContent>
          <CardFooter className="justify-end border-slate-200">
            {isAuthenticated ? (
              <Link
                href={`/auction/${auction.id}`}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Join auction
              </Link>
            ) : (
              <button
                onClick={() => router.push("/")}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Sign in to bid
              </button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
