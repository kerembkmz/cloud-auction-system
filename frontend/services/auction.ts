import { get, push, ref, runTransaction, set } from "firebase/database";
import { doc, runTransaction as runFirestoreTransaction, updateDoc, increment, writeBatch, deleteField } from "firebase/firestore";

import { database, db, isFirebaseConfigured } from "@/lib/firebase";
import type { AuctionRecord, AuctionSettings } from "@/types/auction";
import type { AppUser } from "@/types/user";

const DEFAULT_SETTINGS: AuctionSettings = {
  allowCustomDuration: false,
  fixedDurationMinutes: 5,
  minDurationMinutes: 5,
  maxDurationMinutes: 30,
};

function ensureFirebaseReady(): void {
  if (!isFirebaseConfigured || !database) {
    throw new Error("Error connecting to the database. Please try again later.");
  }
}

function normalizeSettings(value: unknown): AuctionSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_SETTINGS;
  }

  const record = value as Record<string, unknown>;
  const allowCustomDuration = Boolean(record.allowCustomDuration);
  const fixedDurationMinutes =
    typeof record.fixedDurationMinutes === "number" && record.fixedDurationMinutes > 0
      ? record.fixedDurationMinutes
      : DEFAULT_SETTINGS.fixedDurationMinutes;
  const minDurationMinutes =
    typeof record.minDurationMinutes === "number" && record.minDurationMinutes > 0
      ? record.minDurationMinutes
      : DEFAULT_SETTINGS.minDurationMinutes;
  const maxDurationMinutes =
    typeof record.maxDurationMinutes === "number" && record.maxDurationMinutes >= minDurationMinutes
      ? record.maxDurationMinutes
      : Math.max(DEFAULT_SETTINGS.maxDurationMinutes, minDurationMinutes);

  return {
    allowCustomDuration,
    fixedDurationMinutes,
    minDurationMinutes,
    maxDurationMinutes,
  };
}

export async function fetchAuctionSettings(): Promise<AuctionSettings> {
  ensureFirebaseReady();

  const settingsRef = ref(database, "config/auctionSettings");
  const snapshot = await get(settingsRef);
  return normalizeSettings(snapshot.val());
}

export async function saveAuctionSettings(settings: AuctionSettings): Promise<void> {
  ensureFirebaseReady();

  const nextSettings: AuctionSettings = {
    allowCustomDuration: settings.allowCustomDuration,
    fixedDurationMinutes: 5,
    minDurationMinutes: Math.max(1, Math.floor(settings.minDurationMinutes)),
    maxDurationMinutes: Math.max(
      Math.max(1, Math.floor(settings.minDurationMinutes)),
      Math.floor(settings.maxDurationMinutes)
    ),
  };

  await set(ref(database, "config/auctionSettings"), nextSettings);
}

function parseActiveAuction(value: unknown): AuctionRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.status !== "active") {
    return null;
  }

  const itemName = typeof record.itemName === "string" ? record.itemName : "";
  const sellerId = typeof record.sellerId === "string" ? record.sellerId : "";
  const sellerName = typeof record.sellerName === "string" ? record.sellerName : sellerId;
  const description = typeof record.description === "string" ? record.description : "";
  const imageUrl = typeof record.imageUrl === "string" ? record.imageUrl : "";
  const basePrice = typeof record.basePrice === "number" ? record.basePrice : 0;
  const currentHighestBid =
    typeof record.currentHighestBid === "number" ? record.currentHighestBid : basePrice;
  const currentHighestBidOwnerId =
    typeof record.currentHighestBidOwnerId === "string" ? record.currentHighestBidOwnerId : null;
  const currentHighestBidOwnerName =
    typeof record.currentHighestBidOwnerName === "string"
      ? record.currentHighestBidOwnerName
      : null;
  const startTime = typeof record.startTime === "number" ? record.startTime : 0;
  const endsAt = typeof record.endsAt === "number" ? record.endsAt : 0;

  if (!itemName || !sellerId || !startTime || !endsAt) {
    return null;
  }

  return {
    itemName,
    description,
    imageUrl,
    basePrice,
    currentHighestBid,
    currentHighestBidOwnerId,
    currentHighestBidOwnerName,
    sellerId,
    sellerName,
    startTime,
    endsAt,
    status: "active",
  };
}

export async function canUserCreateAuction(
  userId: string
): Promise<{ canCreate: boolean; reason?: string }> {
  ensureFirebaseReady();

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return { canCreate: false, reason: "User ID is required." };
  }

  const auctionsSnapshot = await get(ref(database, "auctions"));
  const auctions = (auctionsSnapshot.val() ?? {}) as Record<string, unknown>;

  for (const value of Object.values(auctions)) {
    const auction = parseActiveAuction(value);
    if (!auction) {
      continue;
    }

    if (auction.sellerId === trimmedUserId) {
      return {
        canCreate: false,
        reason: "You cannot create a new auction while selling an active item.",
      };
    }

    if (auction.currentHighestBidOwnerId === trimmedUserId) {
      return {
        canCreate: false,
        reason: "You cannot create a new auction while leading the highest bid.",
      };
    }
  }

  return { canCreate: true };
}

export interface CreateAuctionInput {
  seller: AppUser;
  itemName: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  requestedDurationMinutes: number;
}

export async function createAuction(input: CreateAuctionInput): Promise<string> {
  ensureFirebaseReady();

  const userId = input.seller.id.trim();
  const sellerName = input.seller.name.trim();
  const itemName = input.itemName.trim();
  const description = input.description.trim();
  const imageUrl = input.imageUrl.trim();

  if (!userId || !sellerName || !itemName || !description || !imageUrl) {
    throw new Error("Signed-in user, item name, description, and photo link are required.");
  }

  if (Number.isNaN(input.basePrice) || input.basePrice <= 0) {
    throw new Error("Base price must be a positive number.");
  }

  const canCreate = await canUserCreateAuction(userId);
  if (!canCreate.canCreate) {
    throw new Error(canCreate.reason ?? "Cannot create auction right now.");
  }

  const settings = await fetchAuctionSettings();
  const durationMinutes = settings.allowCustomDuration
    ? Math.min(
      settings.maxDurationMinutes,
      Math.max(settings.minDurationMinutes, Math.floor(input.requestedDurationMinutes))
    )
    : settings.fixedDurationMinutes;

  const startTime = Date.now();
  const endsAt = startTime + durationMinutes * 60 * 1000;

  const auctionsRef = ref(database, "auctions");
  const newAuctionRef = push(auctionsRef);

  const payload: AuctionRecord = {
    itemName,
    description,
    imageUrl,
    basePrice: input.basePrice,
    currentHighestBid: input.basePrice,
    currentHighestBidOwnerId: null,
    currentHighestBidOwnerName: null,
    sellerId: userId,
    sellerName,
    startTime,
    endsAt,
    status: "active",
  };

  await set(newAuctionRef, payload);

  await push(ref(database, "events/auctionStarted"), {
    auctionId: newAuctionRef.key,
    itemName,
    sellerId: userId,
    sellerName,
    startedAt: startTime,
  });

  return newAuctionRef.key ?? "";
}

export interface PlaceBidInput {
  auctionId: string;
  bidder: AppUser;
  amount: number;
}

export async function placeBid(input: PlaceBidInput): Promise<void> {
  ensureFirebaseReady();

  const auctionId = input.auctionId.trim();
  const bidderId = input.bidder.id.trim();
  const bidderName = input.bidder.name.trim();
  const amount = Number(input.amount);

  if (!auctionId || !bidderId || !bidderName) {
    throw new Error("Signed-in user and auction ID are required.");
  }

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("Bid amount must be a positive number.");
  }

  const userRef = doc(db, "users", bidderId);
  await runFirestoreTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User profile not found.");
    }
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    if (balance < amount) {
      throw new Error(`Insufficient balance. You have $${balance.toLocaleString()}, but need $${amount.toLocaleString()}.`);
    }
    transaction.update(userRef, {
      balance: increment(-amount),
      [`freezed_balance.${auctionId}`]: amount,
    });
  });

  const auctionRef = ref(database, `auctions/${auctionId}`);
  let rejectionReason = "Unable to place bid.";
  let previousBidderId: string | null = null;
  let previousBidAmount: number = 0;

  try {
    const result = await runTransaction(auctionRef, (currentValue) => {
      if (!currentValue || typeof currentValue !== "object") {
        rejectionReason = "Auction not found.";
        return;
      }

      const record = currentValue as Record<string, unknown>;
      const status = record.status;
      const sellerId = typeof record.sellerId === "string" ? record.sellerId : "";
      const endsAt = typeof record.endsAt === "number" ? record.endsAt : 0;
      const currentHighestBid =
        typeof record.currentHighestBid === "number"
          ? record.currentHighestBid
          : typeof record.basePrice === "number"
            ? record.basePrice
            : 0;

      if (status !== "active" || endsAt <= Date.now()) {
        rejectionReason = "This auction is no longer active.";
        return;
      }

      if (sellerId === bidderId) {
        rejectionReason = "You cannot bid on your own item.";
        return;
      }

      if (amount <= currentHighestBid) {
        rejectionReason = "Bid must be higher than current highest bid.";
        return;
      }

      previousBidderId = record.currentHighestBidOwnerId as string | null;
      previousBidAmount = currentHighestBid;

      return {
        ...record,
        currentHighestBid: amount,
        currentHighestBidOwnerId: bidderId,
        currentHighestBidOwnerName: bidderName,
      };
    });

    if (!result.committed) {
      await updateDoc(userRef, {
        balance: increment(amount),
        [`freezed_balance.${auctionId}`]: deleteField(),
      });
      throw new Error(rejectionReason);
    }
  } catch (error) {
    await updateDoc(userRef, {
      balance: increment(amount),
      [`freezed_balance.${auctionId}`]: deleteField(),
    });
    throw error;
  }

  if (previousBidderId && previousBidAmount > 0) {
    try {
      const prevUserRef = doc(db, "users", previousBidderId);
      await updateDoc(prevUserRef, {
        balance: increment(previousBidAmount),
        [`freezed_balance.${auctionId}`]: deleteField(),
      });
    } catch (e) {
      console.error(`Failed to refund previous bidder ${previousBidderId}:`, e);
    }
  }

  await push(ref(database, `auctions/${auctionId}/bids`), {
    bidderId,
    bidderName,
    amount,
    createdAt: Date.now(),
  });

  await push(ref(database, "events/highestBidChanged"), {
    auctionId,
    amount,
    bidderId,
    bidderName,
    updatedAt: Date.now(),
  });
}

export async function finalizeExpiredAuctions(): Promise<void> {
  ensureFirebaseReady();

  const auctionsSnapshot = await get(ref(database, "auctions"));
  const auctions = (auctionsSnapshot.val() ?? {}) as Record<string, unknown>;
  const now = Date.now();

  const updates = Object.entries(auctions)
    .filter(([, value]) => value && typeof value === "object")
    .map(([auctionId, value]) => {
      const record = value as Record<string, unknown>;
      const status = record.status;
      const endsAt = typeof record.endsAt === "number" ? record.endsAt : 0;
      return { auctionId, status, endsAt };
    })
    .filter((entry) => entry.status === "active" && entry.endsAt > 0 && entry.endsAt <= now);

  await Promise.all(
    updates.map(async ({ auctionId }) => {
      const auctionRef = ref(database, `auctions/${auctionId}`);
      let winnerId: string | null = null;
      let winningAmount: number = 0;
      let sellerId: string | null = null;

      const result = await runTransaction(auctionRef, (currentValue) => {
        if (!currentValue || typeof currentValue !== "object") {
          return;
        }

        const record = currentValue as Record<string, unknown>;
        const status = record.status;
        const endsAt = typeof record.endsAt === "number" ? record.endsAt : 0;

        if (status !== "active" || endsAt > Date.now()) {
          return;
        }

        winnerId = record.currentHighestBidOwnerId as string | null;
        winningAmount = typeof record.currentHighestBid === "number" ? record.currentHighestBid : 0;
        sellerId = typeof record.sellerId === "string" ? record.sellerId : null;

        return {
          ...record,
          status: "inactive",
        };
      });

      if (result.committed) {
        if (winnerId && winningAmount > 0) {
          try {
            const batch = writeBatch(db);
            const winnerRef = doc(db, "users", winnerId);
            batch.update(winnerRef, {
              [`freezed_balance.${auctionId}`]: deleteField(),
            });

            if (sellerId) {
              const sellerRef = doc(db, "users", sellerId);
              batch.update(sellerRef, {
                balance: increment(winningAmount)
              });
            }

            await batch.commit();
          } catch (e) {
            console.error("Failed to process transaction for winning / selling users:", e);
          }
        }
      }
    })
  );
}
