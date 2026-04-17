import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <div className="mt-4 flex justify-center">
          <Link
            href="/overview"
            className="inline-flex h-8 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Browse open auctions without logging in
          </Link>
        </div>
      </div>
    </div>
  );
}
