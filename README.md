sequenceDiagram
    autonumber
    actor Seller
    actor Bidder as High Bidder
    actor PrevBidder as Previous Bidder
    participant Web as Frontend (Next.js)
    participant Auth as Firebase Auth
    participant RTDB as Realtime Database (Auctions)
    participant Store as Firestore (Balances)

    Note over Seller, Store: Phase 1: Auction Creation
    Seller->>Web: Input Item Details (Name, Price, etc.)
    Web->>Auth: getAuth().currentUser
    Auth-->>Web: Return uid (sellerId)
    Web->>RTDB: get(ref(db, 'auctions')) (Validation)
    Web->>RTDB: push(ref(db, 'auctions')) + set()
    RTDB-->>Web: Created with status: "active"
    Web-->>Seller: Success Notification

    Note over Bidder, Store: Phase 2: Bidding Process
    Bidder->>Web: Place Bid (amount)
    Web->>Store: runTransaction (Balance Check & Lock)
    Store->>Store: Deduct 'amount' from balance
    Store->>Store: Add 'amount' to freezed_balance[auctionId]
    Store-->>Web: Locked (Transaction Success)

    Web->>RTDB: runTransaction (ref(db, 'auctions/id'))
    RTDB->>RTDB: Compare 'amount' > currentHighestBid
    RTDB->>RTDB: Update currentHighestBid & currentHighestBidOwnerId
    RTDB-->>Web: Updated (Transaction Success)

    rect rgb(240, 240, 240)
        Note right of Web: Refund Previous Bidder (if any)
        Web->>Store: updateDoc(users/prevBidderId)
        Store->>Store: increment(prevBidAmount) to balance
        Store->>Store: deleteField(freezed_balance[auctionId])
    end
    Web-->>Bidder: Highest Bid Confirmation

    Note over Web, Store: Phase 3: Settlement (Auction End)
    Note right of Web: Triggered by client-side maintenance hook
    Web->>RTDB: get(ref(db, 'auctions')) (Find Expired)
    Web->>RTDB: runTransaction (Set status: "inactive")
    RTDB-->>Web: Success (Prevents double processing)

    Web->>Store: writeBatch() (Settlement)
    Store->>Store: deleteField(freezed_balance[auctionId]) for Winner
    Store->>Store: increment(winningAmount) for Seller balance
    Web->>Store: batch.commit()
    Store-->>Web: Finalized
    Web-->>Seller: Balance Updated (Payment Received)
