-- Personal bet tracker schema (SQLite).
-- Single-user, so no accounts/tenancy. Kept close to standard SQL so a later
-- move to Postgres is mechanical (swap the driver, change AUTOINCREMENT/JSON bits).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bets (
  -- Global identity is (book, bet_id). We keep a surrogate rowid via the PK below.
  book             TEXT    NOT NULL,
  bet_id           TEXT    NOT NULL,

  bet_type         TEXT    NOT NULL,              -- single | parlay | prop | dfs_entry
  status           TEXT    NOT NULL,              -- open | settled
  result           TEXT,                          -- win | loss | push | void | NULL(open)

  placed_at        TEXT    NOT NULL,              -- ISO 8601 UTC
  settled_at       TEXT,                          -- ISO 8601 UTC or NULL

  stake            REAL    NOT NULL,
  odds_american    INTEGER,                       -- combined ticket odds when known
  potential_payout REAL    NOT NULL,
  payout           REAL,                          -- realized return once settled, else NULL
  currency         TEXT    NOT NULL DEFAULT 'USD',

  source           TEXT    NOT NULL DEFAULT 'manual', -- manual | photo
  league           TEXT,                          -- ESPN league id for stat/prediction matching

  raw_payload      TEXT,                           -- original OCR text / import metadata (nullable)

  first_seen_at    TEXT    NOT NULL,              -- when our sync first stored it
  updated_at       TEXT    NOT NULL,              -- last time sync touched it

  PRIMARY KEY (book, bet_id)
);

CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets (placed_at);
CREATE INDEX IF NOT EXISTS idx_bets_status    ON bets (status);
CREATE INDEX IF NOT EXISTS idx_bets_book      ON bets (book);

CREATE TABLE IF NOT EXISTS legs (
  book       TEXT    NOT NULL,
  bet_id     TEXT    NOT NULL,
  leg_index  INTEGER NOT NULL,                    -- ordinal within the bet
  leg_id     TEXT    NOT NULL,
  selection  TEXT    NOT NULL,
  market     TEXT,
  event      TEXT,
  odds_american INTEGER,
  result     TEXT,                                -- win | loss | push | void | NULL

  PRIMARY KEY (book, bet_id, leg_index),
  FOREIGN KEY (book, bet_id) REFERENCES bets (book, bet_id) ON DELETE CASCADE
);
