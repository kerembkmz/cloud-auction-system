"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/hooks/use-current-user";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const params = new URLSearchParams({ redirect: pathname });
      router.replace(`/?${params.toString()}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <p className="p-6 text-sm text-slate-600">Checking authentication...</p>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
