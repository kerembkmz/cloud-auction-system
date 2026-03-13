import Link from "next/link";

export default function AuctionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-md text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Auction Page</h1>
        <p className="mt-3 text-slate-700">
          You are now logged in and on the auction page.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-slate-900 px-5 py-2 text-white transition hover:bg-slate-700"
        >
          Back to Login
        </Link>
      </section>
    </main>
  );
}
