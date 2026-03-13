import Link from "next/link";

import { AuthGuard } from "@/components/auth-guard";

export default function AuctionPage() {
  return (
    <AuthGuard>
      <main className="flex min-h-svh items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div className="w-full max-w-2xl border border-slate-300 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">Auction</h1>
          <p className="mt-2 text-sm text-slate-600">
            Open an auction from Overview to view a specific item.
          </p>
          <Link href="/overview" className="mt-4 inline-block text-xs underline">
            Go to overview
          </Link>
        </div>
      </main>
    </AuthGuard>
  );
}
