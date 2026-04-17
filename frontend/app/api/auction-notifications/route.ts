import { NextResponse } from "next/server"
import { Resend } from "resend"

interface AuctionNotificationRequest {
  auctionId?: string
  itemName?: string
  sellerName?: string
  sellerEmail?: string
  winnerName?: string
  winnerEmail?: string
  winningAmount?: number
}

function isValidEmail(email: string | undefined): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function formatAmount(amount: number | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "BidHub <onboarding@resend.dev>"

  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY." }, { status: 500 })
  }

  let body: AuctionNotificationRequest
  try {
    body = (await request.json()) as AuctionNotificationRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const auctionId = typeof body.auctionId === "string" ? body.auctionId.trim() : ""
  const itemName = typeof body.itemName === "string" ? body.itemName.trim() : ""
  const sellerName = typeof body.sellerName === "string" ? body.sellerName.trim() : ""
  const sellerEmail = typeof body.sellerEmail === "string" ? body.sellerEmail.trim() : ""
  const winnerName = typeof body.winnerName === "string" ? body.winnerName.trim() : ""
  const winnerEmail = typeof body.winnerEmail === "string" ? body.winnerEmail.trim() : ""
  const winningAmount = body.winningAmount

  if (!auctionId || !itemName || !sellerName) {
    return NextResponse.json({ error: "Missing auction details." }, { status: 400 })
  }

  if (!isValidEmail(sellerEmail) || !isValidEmail(winnerEmail)) {
    return NextResponse.json({ error: "Missing recipient email address." }, { status: 400 })
  }

  const auctionLabel = `${itemName} (${auctionId})`
  const amountText = formatAmount(winningAmount)
  const resend = new Resend(apiKey)

  const emails = [
    {
      to: winnerEmail,
      subject: `You won ${itemName} on BidHub`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h1 style="font-size: 20px; margin: 0 0 12px;">You won ${itemName}</h1>
          <p>Congratulations ${winnerName || ""}. Your winning bid for <strong>${itemName}</strong> was ${amountText}.</p>
          <p>Auction reference: ${auctionLabel}</p>
        </div>
      `,
      text: `You won ${itemName}. Your winning bid was ${amountText}. Auction reference: ${auctionLabel}`,
    },
    {
      to: sellerEmail,
      subject: `Your auction ${itemName} has ended`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h1 style="font-size: 20px; margin: 0 0 12px;">Your auction has ended</h1>
          <p>Your item <strong>${itemName}</strong> has ended.</p>
          <p>Winner: ${winnerName || "No winner"}</p>
          <p>Winning amount: ${amountText}</p>
          <p>Auction reference: ${auctionLabel}</p>
        </div>
      `,
      text: `Your auction ${itemName} has ended. Winner: ${winnerName || "No winner"}. Winning amount: ${amountText}. Auction reference: ${auctionLabel}`,
    },
  ]

  const results = await Promise.all(
    emails.map(async (email) => {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })

      if (error) {
        throw new Error(error.message || "Failed to send email.")
      }

      return data
    }),
  )

  return NextResponse.json({ sent: results.length })
}
