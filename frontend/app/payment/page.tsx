"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc, increment } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { useCurrentUser } from "@/hooks/use-current-user"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const usdAmountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function PaymentForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { user } = useCurrentUser()

  const [paymentLoading, setPaymentLoading] = useState(false)
  const [nameOnCard, setNameOnCard] = useState("")
  const [amount, setAmount] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaymentLoading(true)

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("You must be logged in to add balance.")
      }

      const numericAmount = Number(amount)
      if (numericAmount <= 0) {
        throw new Error("Amount must be greater than 0.")
      }

      const cardElement = elements.getElement(CardNumberElement)
      if (!cardElement) {
        setPaymentLoading(false)
        return
      }

      const { error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: nameOnCard,
        },
      })

      if (error) {
        setPaymentLoading(false)
        alert(error.message || "An error occurred while validating your card.")
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

      alert("Stripe Payment Submitted Successfully! Balance updated.")
      setAmount("")
      setNameOnCard("")
      cardElement.clear()
      elements.getElement(CardExpiryElement)?.clear()
      elements.getElement(CardCvcElement)?.clear()
      router.push("/overview")
    } catch (error) {
      console.error("Payment error:", error)
      alert("An error occurred while processing your payment.")
    } finally {
      setPaymentLoading(false)
    }
  }

  const inputClass =
    "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base shadow-sm transition-colors focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 placeholder:text-slate-500 font-sans"

  const labelClass = "text-[15px] font-semibold text-slate-900 mb-1.5"
  const subLabelClass = "text-[15px] text-slate-500"

  const STRIPE_OPTIONS = {
    style: {
      base: {
        fontSize: '16px',
        color: '#0f172a',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        '::placeholder': {
          color: '#64748b',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  }

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
          className={inputClass + " outline-none"}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
        <div className="flex flex-col">
          <label className={labelClass}>Card Number</label>
          <div className={inputClass}>
            <div className="w-full h-full flex items-center">
              <CardNumberElement options={STRIPE_OPTIONS} className="w-full" />
            </div>
          </div>
          <span className="text-sm text-slate-500 mt-1.5">Enter your 16-digit number.</span>
        </div>

        <div className="flex flex-col">
          <label className={labelClass}>CVV</label>
          <div className={inputClass}>
            <div className="w-full h-full flex items-center">
              <CardCvcElement options={STRIPE_OPTIONS} className="w-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:w-1/2 sm:pr-2">
        <label className={labelClass}>Expiration Date</label>
        <div className={inputClass}>
          <div className="w-full h-full flex items-center">
            <CardExpiryElement options={STRIPE_OPTIONS} className="w-full" />
          </div>
        </div>
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
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputClass + " outline-none"}
            required
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-100 my-1" />

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          disabled={!stripe || paymentLoading}
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
          <Elements stripe={stripePromise}>
            <PaymentForm />
          </Elements>
        </div>
      </div>
    </AuthGuard>
  )
}