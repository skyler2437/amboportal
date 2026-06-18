-- Space Invaders easter-egg leaderboard. One row per user holding their
-- personal best score; the secret /play page shows the top 15.
--
-- All reads and writes go through the web API using the service-role key
-- (RLS bypassed), so no client INSERT/UPDATE policies are needed. RLS is
-- still enabled with a read-only SELECT policy as a safe default.

CREATE TABLE IF NOT EXISTS invaders_scores (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  score       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The leaderboard query orders by score descending; this index supports it.
CREATE INDEX IF NOT EXISTS invaders_scores_score_idx
  ON invaders_scores (score DESC);

ALTER TABLE invaders_scores ENABLE ROW LEVEL SECURITY;

-- Read-only for clients. Writes happen exclusively through the service-role
-- API route (/api/invaders/scores), which bypasses RLS.
DROP POLICY IF EXISTS "Anyone can view invaders scores" ON invaders_scores;
CREATE POLICY "Anyone can view invaders scores"
  ON invaders_scores FOR SELECT
  USING (true);
