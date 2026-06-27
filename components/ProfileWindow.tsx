"use client";

import type { DesktopApi } from "@/lib/useDesktop";
import BioPageView from "./BioPageView";

// Dashboard preview of the public page. Renders the SAME BioPageView component
// the visitor sees (embedded mode, no reveal animation) so the preview and the
// live page can never drift apart. The "knock" button here just opens a DM with
// the first friend as a stand-in; "sign" opens the guestbook window.
export default function ProfileWindow({ api }: { api: DesktopApi }) {
  const { state } = api;
  return (
    <BioPageView
      data={{
        theme: state.theme,
        customThemes: state.customThemes,
        mood: state.mood,
        profile: state.profile,
        guestbook: state.guestbook,
        fontDisplay: state.fontDisplay,
        fontBody: state.fontBody,
      }}
      embedded
      animate={false}
      onKnock={() => api.openWindow("messages")}
      onSign={() => api.openWindow("guestbook")}
    />
  );
}
