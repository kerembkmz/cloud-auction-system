"use client";

import Link from "next/link";
import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { onValue, ref } from "firebase/database";

import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuctionEndNotification } from "@/components/auction-end-notification";
import { useCurrentUser } from "@/hooks/use-current-user";
import { database, isFirebaseConfigured } from "@/lib/firebase";
import { finalizeExpiredAuctions, placeBid } from "@/services/auction";
import type { Auction } from "@/types/auction";
import { formatUsdAmount } from "@/lib/utils";

function formatRemainingTime(endsAt: number, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function toAuction(id: string, value: unknown): Auction | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.itemName !== "string") {
    return null;
  }

  return {
    id,
    itemName: record.itemName,
    description: typeof record.description === "string" ? record.description : "",
    imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : "",
    basePrice: typeof record.basePrice === "number" ? record.basePrice : 0,
    currentHighestBid:
      typeof record.currentHighestBid === "number" ? record.currentHighestBid : 0,
    currentHighestBidOwnerId:
      typeof record.currentHighestBidOwnerId === "string" ? record.currentHighestBidOwnerId : null,
    currentHighestBidOwnerName:
      typeof record.currentHighestBidOwnerName === "string"
        ? record.currentHighestBidOwnerName
        : null,
    sellerId: typeof record.sellerId === "string" ? record.sellerId : "unknown-seller",
    sellerName: typeof record.sellerName === "string" ? record.sellerName : "Unknown seller",
    startTime: typeof record.startTime === "number" ? record.startTime : 0,
    endsAt: typeof record.endsAt === "number" ? record.endsAt : 0,
    status:
      record.status === "active" ||
      record.status === "inactive" ||
      record.status === "ended"
        ? record.status
        : "active",
  };
}

export default function AuctionDetailsPage() {
  const params = useParams<{ id: string }>();
  const auctionId = params.id;
  const { user: currentUser, isLoading: isLoadingUser, isAuthenticated } = useCurrentUser();

  const [now, setNow] = React.useState(0);
  const [auction, setAuction] = React.useState<Auction | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [bidAmount, setBidAmount] = React.useState("");
  const [isSubmittingBid, setIsSubmittingBid] = React.useState(false);
  const [bidFeedback, setBidFeedback] = React.useState("");
  const [showNotification, setShowNotification] = React.useState(false);
  const [userRole, setUserRole] = React.useState<"winner" | "seller" | "bidder">("bidder");
  const prevAuctionStatusRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!auctionId || !isFirebaseConfigured || !database) {
      setIsLoading(false);
      return;
    }

    void finalizeExpiredAuctions();

    const auctionRef = ref(database, `auctions/${auctionId}`);
    const unsubscribe = onValue(auctionRef, (snapshot) => {
      const value = snapshot.val();
      const mapped = toAuction(auctionId, value);
      setAuction(mapped);

      // Check if auction just ended
      if (mapped && prevAuctionStatusRef.current === "active" && mapped.status !== "active") {
        // Determine user role
        if (currentUser?.id === mapped.currentHighestBidOwnerId) {
          setUserRole("winner");
        } else if (currentUser?.id === mapped.sellerId) {
          setUserRole("seller");
        } else {
          setUserRole("bidder");
        }
        setShowNotification(true);
      }

      prevAuctionStatusRef.current = mapped?.status ?? null;
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auctionId, currentUser?.id]);

  const hasExpired = Boolean(
    auction && auction.status === "active" && now > 0 && now >= auction.endsAt
  );

  React.useEffect(() => {
    if (hasExpired) {
      void finalizeExpiredAuctions();
    }
  }, [hasExpired]);

  if (!auctionId) {
    notFound();
  }

  const isAuctionCompleted = Boolean(
    auction && (auction.status !== "active" || now >= auction.endsAt)
  );
  const isCurrentUserSeller = Boolean(
    auction && currentUser && auction.sellerId === currentUser.id
  );

  const handlePlaceBid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auction || !currentUser) {
      setBidFeedback("Please log in to place a bid.");
      return;
    }

    setIsSubmittingBid(true);
    setBidFeedback("");

    try {
      await placeBid({
        auctionId: auction.id,
        bidder: currentUser,
        amount: Number(bidAmount),
      });

      setBidAmount("");
      setBidFeedback("Bid placed successfully.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to place bid.";
      setBidFeedback(errorMessage);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  return (
    <AuthGuard>
      {auction && (
        <AuctionEndNotification
          isOpen={showNotification}
          itemName={auction.itemName}
          winnerName={auction.currentHighestBidOwnerName || "No winner"}
          winningAmount={auction.currentHighestBid || auction.basePrice}
          userRole={userRole}
          sellerId={auction.sellerId}
          currentUserId={currentUser?.id}
          onClose={() => setShowNotification(false)}
        />
      )}
      <main className="min-h-svh bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Auction Details</h1>
          <Link href="/overview" className="text-xs underline">
            Back to overview
          </Link>
        </div>

        {!isFirebaseConfigured ? (
          <Card className="border-slate-300 bg-white">
            <CardHeader>
              <CardTitle>Firebase not configured</CardTitle>
              <CardDescription>
                Add your Firebase keys in .env.local to load this auction page.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : isLoading ? (
          <Card className="border-slate-300 bg-white">
            <CardHeader>
              <CardTitle>Loading auction...</CardTitle>
            </CardHeader>
          </Card>
        ) : !auction ? (
          <Card className="border-slate-300 bg-white">
            <CardHeader>
              <CardTitle>Auction not found</CardTitle>
              <CardDescription>
                This auction might have ended or was removed.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-slate-300 bg-white pt-0">
            <div className="aspect-video w-full overflow-hidden border-b border-slate-200">
              <img
                src={auction.imageUrl || "https://placehold.co/960x640/e2e8f0/1e293b?text=Auction+Item"}
                alt={auction.itemName}
                className="h-full w-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle>{auction.itemName}</CardTitle>
              <CardDescription>{auction.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-700">
              <p>
                Seller: {auction.sellerName} ({auction.sellerId})
              </p>
              <p>Status: {auction.status}</p>
              <p>
                {auction.currentHighestBidOwnerId ? "Current highest bid is" : "Starting price is"} {
                  formatUsdAmount(
                    auction.currentHighestBidOwnerId ? auction.currentHighestBid : auction.basePrice,
                  )
                }
              </p>
              <p>
                Highest bidder: {isAuctionCompleted
                  ? auction.currentHighestBidOwnerName ?? "No bids yet"
                  : "Hidden until auction ends"}
              </p>
              <p>Remaining time: {formatRemainingTime(auction.endsAt, now)}</p>

              <div className="border border-slate-300 p-3">
                <p className="font-medium text-slate-900">Signed-in user</p>
                {isLoadingUser ? (
                  <p>Checking authentication...</p>
                ) : currentUser ? (
                  <>
                    <p>{currentUser.name}</p>
                    <p className="text-slate-600">{currentUser.id}</p>
                  </>
                ) : (
                  <p>Please log in to place a bid.</p>
                )}
              </div>

              <form className="space-y-2 pt-2" onSubmit={handlePlaceBid}>
                <label className="block text-xs text-slate-900">
                  Your bid
                  <input
                    required
                    type="number"
                    min={Math.floor(auction.currentHighestBid + 1)}
                    step="0.01"
                    value={bidAmount}
                    onChange={(event) => setBidAmount(event.target.value)}
                    className="mt-2 w-full border border-slate-300 px-2 py-1"
                    placeholder={(auction.currentHighestBid + 1).toString()}
                    disabled={isAuctionCompleted || isCurrentUserSeller || !isAuthenticated}
                  />
                </label>

                <Button
                  type="submit"
                  disabled={
                    isSubmittingBid ||
                    isAuctionCompleted ||
                    isCurrentUserSeller ||
                    !isAuthenticated ||
                    isLoadingUser
                  }
                >
                  {isSubmittingBid ? "Placing..." : "Place Bid"}
                </Button>

                {isCurrentUserSeller ? (
                  <p className="text-xs text-slate-600">You cannot bid on your own item.</p>
                ) : null}
                {isAuctionCompleted ? (
                  <p className="text-xs text-slate-600">This auction is completed.</p>
                ) : null}
                {!isLoadingUser && !isAuthenticated ? (
                  <p className="text-xs text-slate-600">Please log in to bid.</p>
                ) : null}
                {bidFeedback ? <p className="text-xs text-slate-600">{bidFeedback}</p> : null}
              </form>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </AuthGuard>
  );
}
