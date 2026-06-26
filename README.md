# kirari.cafe

A biolink page + real-time chat mashed into a 2000s anime/moe desktop
environment — draggable pop-out windows on desktop, a docked single-screen on
mobile, and four switchable theme skins. This is a faithful **Next.js (App
Router) + TypeScript** recreation of the HTML design prototype.

![sugar skin](docs/preview.png)

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm run start   # production
```

Node 18.17+ (or 20+). No environment variables needed — the app runs entirely
on an in-memory store, so it works with zero backend.

## What's faithful to the prototype

Every visual value (colors, gradients, shadows, fonts, spacing, keyframes) and
every interaction is copied 1:1 from the handoff prototype:

- **4 skins** — `sugar` (kawaii pastel, default), `angel.exe` (frutiger sky),
  `kuro lolita` (gothic moe), `OS-tan` (retro desktop). Each is a full set of
  CSS custom properties swapped on the root.
- **8 window types** — profile, chat, guestbook, messages, notifications, edit,
  settings, new-group — each with the prototype's exact default size.
- **Window manager** — drag, focus (z-order), minimize / maximize / close, and
  new-window cascade on desktop; single full-screen focused window + bottom
  dock on mobile (`< 760px`).
- **Personalization** — 6 page-background patterns, portrait shape/frame/charm,
  5 name text-effects (glow / rainbow / sticker / retro3d), reorderable links.
- **Ambient touches** — glitter cursor trail, sparkle rain, blinking status
  dot, fake chat auto-replies, animated visitor counter.
- **Onboarding** — the 4-step claim-handle wizard with live availability check.

## Project layout

```
app/
  layout.tsx        fonts + document chrome
  page.tsx          mounts <Desktop/>
components/          one file per window + Desktop shell, WindowFrame, Onboarding
lib/
  themes.ts         the 4 skins (CSS-var sets) + skin-picker metadata
  types.ts          domain types (mirror the Supabase schema)
  seed.ts           seeded profile / convos / guestbook / notifications
  styleHelpers.ts   text-effect + bg-pattern CSS, window sizes, @keyframes
  useDesktop.ts      the central client hook — all state + actions
  supabase/         client stub + in-memory→Supabase mapping notes
supabase/
  schema.sql        Postgres schema (matches the data model exactly)
```

## Going live with Supabase

The in-memory store in `lib/useDesktop.ts` is structured so a real backend
drops in cleanly. See **`lib/supabase/README.md`** for the action-by-action
mapping and **`supabase/schema.sql`** for the database. In short: apply the
schema, set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
uncomment the client in `lib/supabase/client.ts`, and swap each action body for
the noted Supabase call. Realtime subscriptions replace the fake reply timers.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · CSS-in-JS (inline styles
driven by theme CSS variables). Deploys to Vercel as-is.
