# In-memory store → Supabase mapping

The app ships on the in-memory store in `lib/useDesktop.ts` (fake auto-replies,
seeded data) so it runs with no backend. Every place that mutates state is a
1:1 swap point for a Supabase call. This file lists the swaps.

## Auth (onboarding wizard — `finishOnb`)
1. **Claim handle** → `supabase.auth.signUp({ email, password })`, then
   `insert` a `profiles` row with the chosen handle. Handle uniqueness is
   enforced by the `unique` constraint plus the live client check
   (`HANDLE_TAKEN` in `useDesktop.ts`).
2. **Pick mood** → `update profiles set mood = …`
3. **Add links** → `insert into links …`
4. **Welcome** → redirect to `/@handle`

Returning users: email/password login → load profile → open desktop.

## Reads on load (replace `makeInitialState`)
- profile + links + counters → `select` from `profiles`, `links`
- conversations → `select` from `conversations` joined via
  `conversation_members` where `user_id = auth.uid()`
- messages per convo → `select … from messages where conversation_id = …
  order by created_at`
- guestbook → `select … from guestbook where profile_id = … order by created_at desc`
- notifications → `select … from notifications where user_id = … order by created_at desc`

## Writes
| action in `useDesktop.ts` | Supabase call |
|---|---|
| `sendMsg` / `sendSticker` | `insert into messages (conversation_id, sender_id, body, kind)` |
| `signGuest` | `insert into guestbook (...)` |
| `createGroup` | `insert into conversations (kind:'group', title)` then `insert` rows into `conversation_members` |
| `openDM` | find-or-create a `dm` conversation between the two users |
| `addLink` / `removeLink` / `moveLink` | `insert` / `delete` / `update sort_order` on `links` |
| `saveProfile` (edit window) | `update profiles set …` |
| `setTheme` / `toggle` / `setMood` | `update profiles set theme/…/mood` |
| `markNotifRead` | `update notifications set read = true where id = …` |

## Realtime (replaces the fake `queueReply` timers)
- **Live chat** — `supabase.channel('chat:'+convoId)` on `postgres_changes`
  INSERT on `messages` filtered by `conversation_id`; append `payload.new`.
- **Presence** — `supabase.channel('online')` Realtime Presence to drive the
  online indicators; `channel.track({ user_id, mood })` on subscribe.
- **Notifications** — channel on `postgres_changes` INSERT on `notifications`
  filtered by `user_id`.

## Storage
- `pfp_url` points at a Supabase Storage object; the edit window's portrait
  upload writes there and stores the public URL on the profile.
