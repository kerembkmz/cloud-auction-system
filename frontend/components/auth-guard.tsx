"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/hooks/use-current-user";

interface AuthGuardProps {
  children: React.ReactNode;
  allowGuests?: boolean;
}

export function AuthGuard({ children, allowGuests = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && !allowGuests) {
      const params = new URLSearchParams({ redirect: pathname });
      router.replace(`/?${params.toString()}`);
    }
  }, [isAuthenticated, isLoading, pathname, router, allowGuests]);

  if (isLoading) {
    return <p className="p-6 text-sm text-slate-600">Checking authentication...</p>;
  }

  if (!isAuthenticated && !allowGuests) {
    return null;
  }

  return <>{children}</>;
}
