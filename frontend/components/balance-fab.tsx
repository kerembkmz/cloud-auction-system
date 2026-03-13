"use client";

import Link from "next/link";

import { useCurrentUser } from "@/hooks/use-current-user";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BalanceFab() {
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const currentBalance = user.balance ?? 0;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50">
      <Link
        href="/payment"
        className="group pointer-events-auto relative block rounded-full border border-slate-300 bg-white px-4 py-2 shadow-md transition hover:bg-slate-50"
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Current Balance</p>
        <p className="text-sm font-semibold text-slate-900">{usdFormatter.format(currentBalance)}</p>

        <span className="pointer-events-none absolute -top-10 right-0 rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          Go to balance page
        </span>
      </Link>
    </div>
  );
}
