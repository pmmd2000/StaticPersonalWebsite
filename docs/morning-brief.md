# Morning Brief

A private page at **https://parhammonfared.com/brief** (past runs at `/brief/YYYY-MM-DD`, history and the commitments log at `/brief/history`). Claude publishes the brief through the site's MCP server; Parham marks items Done / Won't do / Reschedule / Note and presses **Save**; Claude claims those decisions, applies them in the real tools and reports back.

## Flow

1. **06:00 UK run**: call `get_item_states` (e.g. `key_prefix: "chat:"`, `statuses: ["wont_do","done"]`) to skip promises already declined or done, then `publish_brief`. Drop items whose returned `status` is not `open`.
2. **Parham saves** on `/brief`. Each change becomes a `pending` action and the item's status/note updates at once.
3. **Claude applies** (hourly and during the morning run): `list_pending_actions` → apply each in TickTick / Google Calendar / … → `report_action_result`. The page polls every 30 s and shows *applied ✓* or *failed: reason*.

## MCP tools

Endpoint `https://parhammonfared.com/mcp` (same OAuth sign-in as the news/hobbies tools). Every tool returns one text block containing JSON.

### `publish_brief`

Input:

```jsonc
{
  "run": {
    "brief_date": "2026-11-09",                 // YYYY-MM-DD, Europe/London
    "generated_at": "2026-11-09T06:25:00Z",     // ISO 8601 with offset
    "checked_label": "Checked 06:25 UK",        // optional, ≤80 chars
    "summary": [{ "label": "Don't miss", "value": 4, "hint": "2 overdue" }],   // ≤8, page shows 4
    "forecast": [{                              // ≤7 days, page shows 4
      "date": "2026-11-09",
      "entries": [{ "title": "Dentist", "start": "2026-11-09T09:00:00Z", "end": "2026-11-09T09:30:00Z",
                    "all_day": false, "calendar": "Personal", "kind": "event" }]   // kind: event|task|workout|other; no end = shown as untimed
    }],
    "calendar_sync_lines": ["TickTick → Google Calendar: 3 events in sync"]        // ≤20
  },
  "items": [{                                   // ≤500
    "item_key": "chat:whatsapp:447700900000@s.whatsapp.net:3EB0A1",
    "section": "waiting",                       // dont_miss | waiting | unopened | closed
    "source_app": "whatsapp",                   // ticktick | gcal | gmail | whatsapp | telegram | fitness | other
    "source_account": "UK WhatsApp",            // optional
    "source_ref": { "chatId": "447700900000@s.whatsapp.net", "messageId": "3EB0A1" },  // optional, flat, ≤2 KB
    "kind": "commitment",                       // task | event | commitment | chat | workout | email
    "title": "Promised Payam a call",           // ≤300 chars
    "body": "You said you'd call him tomorrow at 9.",   // optional, ≤4 KB
    "quotes": ["فردا ساعت ۹ بهت زنگ می‌زنم"],     // optional, ≤10, each ≤2 KB, verbatim
    "pills": [{ "type": "linked", "label": "Linked: TickTick + Payam" }, { "type": "clash" }],  // optional, ≤10
    "time_label": "Tomorrow 09:00",             // optional
    "due_at": "2026-11-10T09:00:00Z",           // optional; orders Don't miss
    "person": "Payam",                          // optional
    "waited_days": 2,                           // optional
    "unread_count": null                        // optional
  }]
}
```

`item_key` must match `^(ticktick|gcal|gmail|chat|fitness|note):\S+` — use `ticktick:<taskId>`, `gcal:<calendarId>:<eventId>`, `gmail:<threadId>`, `chat:<platform>:<chatId>:<messageId>` (the message where the promise was made), `fitness:<occurrenceId>`, `note:<uuid>`. Keys must be unique within a run.

Existing items are upserted: only descriptive fields change (`section`, `source_*`, `kind`, `title`, `body`, `quotes`, `pills`, `time_label`, `due_at`, `person`, `waited_days`, `unread_count`). `status`, `user_note` and `rescheduled_to` are never overwritten.

Returns:

```jsonc
{ "run_id": 12, "brief_date": "2026-11-09",
  "items": [{ "item_key": "...", "status": "open|done|wont_do|rescheduled|dismissed", "status_changed_at": "…|null",
              "rescheduled_to": "…|null", "user_note": "…|null", "title": "…", "source_app": "…", "kind": "…",
              "last_brief_date": "2026-11-09" }] }
```

### `get_item_states`

Input (all optional, combined with AND): `item_keys: string[]` (≤2000), `key_prefix: string` (e.g. `"chat:"`), `statuses: ("open"|"done"|"wont_do"|"rescheduled"|"dismissed")[]`, `since: ISO datetime` (status changed at or after), `limit: 1–5000` (default 500).

Returns `{ "items": [ …same shape as publish_brief's items… ] }`.

### `list_pending_actions`

Input: `limit: 1–200` (default 50). Atomically marks the returned actions `claimed` (two concurrent callers never get the same action). Claims not reported within 30 minutes return to `pending`.

Returns:

```jsonc
{ "actions": [{
    "id": 41, "item_key": "gcal:primary:evt9",
    "action": "done|wont_do|reschedule|note|reopen",
    "payload": {},                                       // reschedule: {"to":"2026-11-10T09:00","tz":"Europe/London","to_utc":"2026-11-10T09:00:00.000Z"}
                                                         // note:       {"note":"…"}  (empty string = note cleared)
    "state": "claimed", "created_at": "…", "claimed_at": "…", "applied_at": null, "result_message": null,
    "item": { "item_key": "…", "title": "…", "kind": "…", "section": "…", "source_app": "…", "source_account": "…",
              "source_ref": { … }, "status": "…", "rescheduled_to": "…", "user_note": "…", "due_at": "…",
              "time_label": "…", "person": "…" } }] }
```

### `report_action_result`

Input: `action_id: number`, `state: "applied" | "failed" | "skipped"`, `message?: string` (≤1000, shown on the page). Only a `pending` or `claimed` action can be reported. Returns the updated action (same shape as above, without `item`).

### `get_brief`

Input: `date?: "YYYY-MM-DD"` (latest run if omitted). Returns `{ "run": { id, brief_date, generated_at, checked_label, summary, forecast, calendar_sync_lines, created_at }, "items": [ { …all item fields…, "position": 0, "actions": [latest status action, latest note action] } ] }`, or an error if nothing is stored.

## Rules worth knowing

- A save writes one action per change (at most one status change and one note per item), and updates the item straight away.
- A newer change supersedes older **pending** ones on the same item and of the same kind (status vs note); those become `skipped`. Already claimed ones are left for Claude to finish.
- `reopen` puts an item back to `open` and clears `rescheduled_to`.
- Past runs (`/brief/<date>`) are read-only.

## Configuration (Cloudflare Worker secrets / vars)

| Name | Kind | Needed | What |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD_HASH` | secret | recommended | PBKDF2 hash of the sign-in password: `npm run hash-password`, then `npx wrangler secret put ADMIN_PASSWORD_HASH` and paste. Once set, delete the old plain one: `npx wrangler secret delete ADMIN_PASSWORD`. |
| `ADMIN_PASSWORD` | secret | until the hash is set | Plain password (legacy fallback). |
| `SESSION_SECRET` | secret | optional | Extra key for session cookies and CSRF tokens. Changing it signs every session out. |
| `BRIEF_SAVE_WEBHOOK_URL` | var/secret | optional | If set, every Save POSTs `{"event":"brief_actions_saved","count":N}` here (after the response, one retry, never blocks the save). |
| `BRIEF_WEBHOOK_SECRET` | secret | with the webhook | Signs it: header `X-Brief-Signature: sha256=<hex HMAC-SHA256 of "<X-Brief-Timestamp>.<body>">`. |

Sign-in is rate limited: 5 wrong passwords from one IP in 15 minutes locks that IP for 15 minutes; 50 in total locks sign-in for 15 minutes.
