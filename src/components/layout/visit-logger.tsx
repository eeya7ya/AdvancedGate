"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/console/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pathname, referrer: document.referrer }),
    }).catch(() => null);
  }, [pathname]);

  return null;
}
