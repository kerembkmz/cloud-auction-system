"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AuctionEndNotificationProps {
  isOpen: boolean
  itemName: string
  winnerName: string
  winningAmount: number
  userRole: "winner" | "seller" | "bidder"
  sellerId: string
  currentUserId?: string
  onClose: () => void
}

function createConfetti() {
  const confettiPieces: {
    x: number
    y: number
    vx: number
    vy: number
    angle: number
    size: number
    opacity: number
    life: number
  }[] = []

  const colors = ["#e2e8f0", "#64748b", "#475569", "#1e293b"]

  for (let i = 0; i < 50; i++) {
    confettiPieces.push({
      x: Math.random() * window.innerWidth,
      y: -10,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 10 + 5,
      angle: Math.random() * 360,
      size: Math.random() * 10 + 5,
      opacity: 1,
      life: 1,
    })
  }

  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.style.position = "fixed"
  canvas.style.top = "0"
  canvas.style.left = "0"
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "9999"
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    confettiPieces.forEach((piece, index) => {
      piece.y += piece.vy
      piece.vy += 0.2
      piece.angle += 2
      piece.life -= 0.015

      if (piece.life <= 0) {
        confettiPieces.splice(index, 1)
        return
      }

      ctx.save()
      ctx.globalAlpha = piece.opacity * piece.life
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      ctx.translate(piece.x, piece.y)
      ctx.rotate((piece.angle * Math.PI) / 180)
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size)
      ctx.restore()
    })

    if (confettiPieces.length > 0) {
      requestAnimationFrame(animate)
    } else {
      document.body.removeChild(canvas)
    }
  }

  animate()
}

export function AuctionEndNotification({
  isOpen,
  itemName,
  winnerName,
  winningAmount,
  userRole,
  sellerId,
  currentUserId,
  onClose,
}: AuctionEndNotificationProps) {
  const router = useRouter()
  const confettiCreatedRef = useRef(false)

  useEffect(() => {
    if (isOpen && userRole === "winner" && !confettiCreatedRef.current) {
      createConfetti()
      confettiCreatedRef.current = true
    }
  }, [isOpen, userRole])

  const getTitle = () => {
    switch (userRole) {
      case "winner":
        return "Congratulations! 🎉"
      case "seller":
        return "Auction Ended"
      case "bidder":
        return "Auction Ended"
      default:
        return "Auction Ended"
    }
  }

  const getDescription = () => {
    switch (userRole) {
      case "winner":
        return `You won the bidding for "${itemName}" with a final bid of $${winningAmount.toLocaleString()}!`
      case "seller":
        return `Bidding has concluded for "${itemName}". The final price is $${winningAmount.toLocaleString()}.`
      case "bidder":
        return `${winnerName} won the bidding for "${itemName}" with a bid of $${winningAmount.toLocaleString()}.`
      default:
        return ""
    }
  }

  const handleClose = () => {
    confettiCreatedRef.current = false
    onClose()
    router.push("/overview")
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="border-slate-300 bg-white">
        <AlertDialogTitle className="text-2xl font-bold text-slate-900">
          {getTitle()}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-base text-slate-600">
          {getDescription()}
        </AlertDialogDescription>
        <AlertDialogAction
          onClick={handleClose}
          className="mt-4 w-full bg-slate-900 text-white hover:bg-slate-700"
        >
          Back to Auctions
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )
}
