"use client";

import { useEffect } from "react";
import Desktop from "@/components/Desktop";

// The dashboard = the private desktop environment (owner view).
// Locks page scroll while mounted; restores it on unmount so the
// landing and public pages can scroll normally.
export default function DashboardPage() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return <Desktop />;
}
