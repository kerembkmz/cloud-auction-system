import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline" className="rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
            <Link href="/overview">Browse open auctions without logging in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
