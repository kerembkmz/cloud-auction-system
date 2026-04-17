"use client"

import { useState } from "react"
import { doc, updateDoc, increment } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { useCurrentUser } from "@/hooks/use-current-user"

const usdAmountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function PaymentForm() {
  const router = useRouter()
  const { user } = useCurrentUser()

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [nameOnCard, setNameOnCard] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [amount, setAmount] = useState<string>("")

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16)
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim()
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 4)
    if (digits.length >= 1) {
      const firstDigit = digits[0]
      if (firstDigit > "1") {
        digits = "0" + digits
        digits = digits.slice(0, 4)
      }
    }
    if (digits.length >= 2) {
      const month = parseInt(digits.slice(0, 2), 10)
      if (month < 1) {
        digits = "01" + digits.slice(2)
      } else if (month > 12) {
        digits = "12" + digits.slice(2)
      }
    }
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
    setExpiry(formatted)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4)
    setCvv(digits)
  }

  const validateExpiry = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})$/)
    if (!match) return "Expiration date must be in MM/YY format."
    const month = parseInt(match[1], 10)
    const year = 2000 + parseInt(match[2], 10)
    if (month < 1 || month > 12) return "Invalid month."
    const now = new Date()
    const expiryDate = new Date(year, month, 0, 23, 59, 59)
    if (expiryDate < now) return "Expiration date cannot be in the past."
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentLoading(true)

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("You must be logged in to add balance.")
      }

      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        alert("Amount must be greater than 0.")
        setPaymentLoading(false)
        return
      }

      const digitsOnly = cardNumber.replace(/\s/g, "")
      if (digitsOnly.length !== 16) {
        alert("Card number must be exactly 16 digits.")
        setPaymentLoading(false)
        return
      }

      const expiryError = validateExpiry(expiry)
      if (expiryError) {
        alert(expiryError)
        setPaymentLoading(false)
        return
      }

      if (cvv.length < 3 || cvv.length > 4) {
        alert("CVV must be 3 or 4 digits.")
        setPaymentLoading(false)
        return
      }

      try {
        const userRef = doc(db, "users", currentUser.uid)
        await updateDoc(userRef, {
          balance: increment(numericAmount)
        })
      } catch (updateError) {
        console.error("Failed to update database balance:", updateError)
        setPaymentLoading(false)
        const errorMessage = updateError instanceof Error ? updateError.message : "Unknown Error"
        alert("Failed to update your balance: " + errorMessage + ". Please try again.")
        return
      }

      alert("Payment Submitted Successfully! Balance updated.")
      setAmount("")
      setNameOnCard("")
      setCardNumber("")
      setExpiry("")
      setCvv("")
      router.push("/overview")
    } catch (error) {
      console.error("Payment error:", error)
      alert("An error occurred while processing your payment.")
    } finally {
      setPaymentLoading(false)
    }
  }

  const inputClass =
    "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base shadow-sm transition-colors focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 placeholder:text-slate-500 font-sans outline-none"

  const labelClass = "text-[15px] font-semibold text-slate-900 mb-1.5"
  const subLabelClass = "text-[15px] text-slate-500"

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-900">Payment Method</h2>
        <p className={subLabelClass}>All transactions are secure and encrypted</p>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Name on Card</label>
        <input
          type="text"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          placeholder="John Doe"
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col">
          <label className={labelClass}>Card Number</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            className={inputClass}
            required
          />
          <span className="text-sm text-slate-500 mt-1.5">Enter exactly 16 digits.</span>
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>CVV</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvv}
            onChange={handleCvvChange}
            placeholder="123"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="flex flex-col sm:w-1/2 sm:pr-2">
        <label className={labelClass}>Expiration Date</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          value={expiry}
          onChange={handleExpiryChange}
          placeholder="MM/YY"
          className={inputClass}
          required
        />
      </div>

      <div className="h-px w-full bg-slate-100 my-1" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-900">Add Balance</h2>
          <p className={subLabelClass}>
            Enter the amount you would like to add to your account.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-6 p-4 bg-slate-100 rounded-xl mb-2 border border-slate-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500">Available Balance</span>
              <span className="text-2xl font-bold text-slate-900">${usdAmountFormatter.format(user.balance ?? 0)}</span>
            </div>
            <div className="w-px h-10 bg-slate-300"></div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-500">Freezed Balance (Bids)</span>
              <span className="text-2xl font-bold text-slate-900">${usdAmountFormatter.format(Object.values(user.freezed_balance ?? {}).reduce((sum, v) => sum + v, 0))}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col">
          <label className={labelClass}>Amount ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-100 my-1" />

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          disabled={paymentLoading}
          className="h-[42px] px-6 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {paymentLoading ? "Processing..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/overview")
          }}
          className="h-[42px] px-6 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function PaymentPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-[500px] w-full mt-10 mb-10">
          <PaymentForm />
        </div>
      </div>
    </AuthGuard>
  )
}
