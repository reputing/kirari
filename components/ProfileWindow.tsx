"use client";

import { useEffect, useState } from "react";
import type { DesktopApi } from "@/lib/useDesktop";
import type { GuestEntry } from "@/lib/types";
import { loadGuestbook } from "@/lib/store";
import BioPageView from "./BioPageView";

// Dashboard preview of the public page. Renders the SAME BioPageView the
// visitor sees, and loads the REAL visitor-signed guestbook entries (merged
// with seeded ones) so the preview matches the live page instead of drifting.
export default function ProfileWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  const [visitorGb, setVisitorGb] = useState<GuestEntry[]>([]);

  useEffect(() => {
    let alive = true;
    loadGuestbook(state.profile.handle).then((g) => { if (alive) setVisitorGb(g); });
    return () => { alive = false; };
  }, [state.profile.handle]);

  const guestbook = [...visitorGb, ...(state.guestbook || [])].slice(0, 200);

  return (
    <BioPageView
      data={{
        theme: state.theme,
        customThemes: state.customThemes,
        mood: state.mood,
        profile: state.profile,
        guestbook,
        fontDisplay: state.fontDisplay,
        fontBody: state.fontBody,
      }}
      embedded
      animate={false}
      onKnock={() => api.openWindow("dms")}
      onSign={() => api.openWindow("guestbook")}
    />
  );
}
