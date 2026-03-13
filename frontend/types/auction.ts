export type AuctionStatus = "active" | "inactive" | "ended";

export interface AuctionSettings {
  allowCustomDuration: boolean;
  fixedDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
}

export interface AuctionRecord {
  itemName: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  currentHighestBid: number;
  currentHighestBidOwnerId: string | null;
  currentHighestBidOwnerName: string | null;
  sellerId: string;
  sellerName: string;
  startTime: number;
  endsAt: number;
  status: AuctionStatus;
}

export interface Auction extends AuctionRecord {
  id: string;
}

export interface BidRecord {
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: number;
}
