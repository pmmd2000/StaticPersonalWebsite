-- Morning Brief: runs pushed by Claude, long-lived items, and the owner's
-- decisions as an append-only action log that Claude applies and reports on.
-- Timestamps are ISO 8601 UTC strings; JSON columns are TEXT.

CREATE TABLE IF NOT EXISTS brief_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brief_date TEXT NOT NULL,                 -- YYYY-MM-DD, Europe/London
    generated_at TEXT NOT NULL,
    checked_label TEXT,
    summary TEXT NOT NULL DEFAULT '[]',
    forecast TEXT NOT NULL DEFAULT '[]',
    calendar_sync_lines TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_brief_runs_date ON brief_runs(brief_date, id);

CREATE TABLE IF NOT EXISTS brief_items (
    item_key TEXT PRIMARY KEY,
    section TEXT NOT NULL CHECK (section IN ('dont_miss', 'waiting', 'unopened', 'closed')),
    source_app TEXT NOT NULL,
    source_account TEXT,
    source_ref TEXT NOT NULL DEFAULT '{}',
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    quotes TEXT NOT NULL DEFAULT '[]',
    pills TEXT NOT NULL DEFAULT '[]',
    time_label TEXT,
    due_at TEXT,
    person TEXT,
    waited_days INTEGER,
    unread_count INTEGER,
    -- Owner-controlled: publish_brief never overwrites these three.
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'done', 'wont_do', 'rescheduled', 'dismissed')),
    status_changed_at TEXT,
    rescheduled_to TEXT,
    user_note TEXT,
    first_seen_run_id INTEGER,
    last_seen_run_id INTEGER,
    last_brief_date TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_brief_items_status ON brief_items(status, status_changed_at);

-- Which items each run contained, in order, so past briefs render as they were.
CREATE TABLE IF NOT EXISTS brief_run_items (
    run_id INTEGER NOT NULL REFERENCES brief_runs(id),
    item_key TEXT NOT NULL REFERENCES brief_items(item_key),
    section TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (run_id, item_key)
);

CREATE TABLE IF NOT EXISTS brief_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_key TEXT NOT NULL REFERENCES brief_items(item_key),
    action TEXT NOT NULL CHECK (action IN ('done', 'wont_do', 'reschedule', 'note', 'reopen')),
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    state TEXT NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'claimed', 'applied', 'failed', 'skipped')),
    claimed_at TEXT,
    applied_at TEXT,
    result_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_brief_actions_state ON brief_actions(state, id);
CREATE INDEX IF NOT EXISTS idx_brief_actions_item ON brief_actions(item_key, id);

-- Failed sign-in counters for rate limiting and lockout (per IP and global).
CREATE TABLE IF NOT EXISTS login_throttle (
    key TEXT PRIMARY KEY,
    failures INTEGER NOT NULL,
    window_start INTEGER NOT NULL,
    locked_until INTEGER NOT NULL DEFAULT 0
);
