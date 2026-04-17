"use client";

import * as React from "react";
import Link from "next/link";
import { onValue, ref } from "firebase/database";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { database, isFirebaseConfigured } from "@/lib/firebase";
import { finalizeExpiredAuctions } from "@/services/auction";
import type { Auction } from "@/types/auction";

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
    currentHighestBid: typeof record.currentHighestBid === "number" ? record.currentHighestBid : 0,
    currentHighestBidOwnerId:
      typeof record.currentHighestBidOwnerId === "string" ? record.currentHighestBidOwnerId : null,
    currentHighestBidOwnerName:
      typeof record.currentHighestBidOwnerName === "string" ? record.currentHighestBidOwnerName : null,
    currentHighestBidOwnerEmail:
      typeof record.currentHighestBidOwnerEmail === "string" ? record.currentHighestBidOwnerEmail : null,
    sellerId: typeof record.sellerId === "string" ? record.sellerId : "unknown-seller",
    sellerName: typeof record.sellerName === "string" ? record.sellerName : "Unknown seller",
    sellerEmail: typeof record.sellerEmail === "string" ? record.sellerEmail : "",
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

export function HistoryAuctions() {
  const { user: currentUser, isLoading: isLoadingUser, isAuthenticated } = useCurrentUser();
  const [auctions, setAuctions] = React.useState<Auction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setAuctions([]);
      setIsLoading(false);
      return;
    }

    void finalizeExpiredAuctions();

    const auctionsRef = ref(database, "auctions");
    const unsubscribe = onValue(auctionsRef, (snapshot) => {
      const value = (snapshot.val() ?? {}) as Record<string, unknown>;
      const mapped = Object.entries(value)
        .map(([id, auctionValue]) => toAuction(id, auctionValue))
        .filter((auction): auction is Auction => auction !== null);

      setAuctions(mapped);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const inactiveAuctions = auctions.filter((auction) => auction.status === "inactive");
  const activeAuctions = auctions.filter((auction) => auction.status === "active");

  if (isLoadingUser) {
    return <p className="px-4 text-xs text-slate-600 lg:px-6">Checking user session...</p>;
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <p className="px-4 text-xs text-slate-600 lg:px-6">
        Please log in to view your auction history.
      </p>
    );
  }

  const activeCreatedCount = activeAuctions.filter(
    (auction) => auction.sellerId === currentUser.id
  ).length;

  const soldCount = inactiveAuctions.filter(
    (auction) => auction.sellerId === currentUser.id && auction.currentHighestBidOwnerId !== null
  ).length;

  const wonCount = inactiveAuctions.filter(
    (auction) => auction.currentHighestBidOwnerId === currentUser.id
  ).length;

  const createdAuctions = inactiveAuctions
    .filter((auction) => auction.sellerId === currentUser.id)
    .sort((a, b) => b.endsAt - a.endsAt);

  const wonAuctions = inactiveAuctions
    .filter((auction) => auction.currentHighestBidOwnerId === currentUser.id)
    .sort((a, b) => b.endsAt - a.endsAt);

  if (isLoading) {
    return <p className="px-4 text-xs text-slate-600 lg:px-6">Loading history...</p>;
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-slate-300 bg-white">
          <CardHeader>
            <CardTitle className="text-sm">Active (Created by You)</CardTitle>
            <CardDescription className="text-slate-600">
              Your auctions currently running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{activeCreatedCount}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-300 bg-white">
          <CardHeader>
            <CardTitle className="text-sm">Sold (Past)</CardTitle>
            <CardDescription className="text-slate-600">
              Your ended auctions with a winner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{soldCount}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-300 bg-white">
          <CardHeader>
            <CardTitle className="text-sm">Won (Past)</CardTitle>
            <CardDescription className="text-slate-600">
              Ended auctions you won.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{wonCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-300 bg-white">
        <CardHeader>
          <CardTitle className="text-sm">Your Created Auctions (Past)</CardTitle>
          <CardDescription className="text-slate-600">
            Inactive auctions where you were the seller.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-700">
          {createdAuctions.length === 0 ? (
            <p>No past created auctions yet.</p>
          ) : (
            createdAuctions.map((auction) => (
              <div key={`created-${auction.id}`} className="border border-slate-300 p-3">
                <p className="font-medium text-slate-900">{auction.itemName}</p>
                <p>Final highest bid: ${auction.currentHighestBid.toLocaleString()}</p>
                <p>
                  Winner: {auction.currentHighestBidOwnerName ?? "No winner"}
                </p>
                <Link href={`/auction/${auction.id}`} className="underline">
                  View details
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-300 bg-white">
        <CardHeader>
          <CardTitle className="text-sm">Auctions You Won (Past)</CardTitle>
          <CardDescription className="text-slate-600">
            Inactive auctions where your bid won.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-700">
          {wonAuctions.length === 0 ? (
            <p>No past won auctions yet.</p>
          ) : (
            wonAuctions.map((auction) => (
              <div key={`won-${auction.id}`} className="border border-slate-300 p-3">
                <p className="font-medium text-slate-900">{auction.itemName}</p>
                <p>Final price: ${auction.currentHighestBid.toLocaleString()}</p>
                <p>Seller: {auction.sellerName}</p>
                <Link href={`/auction/${auction.id}`} className="underline">
                  View details
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
