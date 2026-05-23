-- Profiles: one per auth user
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    avatar_url      TEXT,
    solo_best_time  INT,        -- seconds
    solo_best_score INT,
    games_played    INT NOT NULL DEFAULT 0,
    games_won       INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Username: lowercase, 3-20 chars, letters/numbers/_
ALTER TABLE profiles ADD CONSTRAINT username_format
    CHECK (username ~ '^[a-z0-9_]{3,20}$');

-- Friendships: directional, both entries created on accept
CREATE TABLE IF NOT EXISTS friendships (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Game rooms: one per multiplayer match
CREATE TABLE IF NOT EXISTS game_rooms (
    id          TEXT PRIMARY KEY,           -- 6-char room code
    host_id     UUID NOT NULL REFERENCES profiles(id),
    guest_id    UUID REFERENCES profiles(id),
    is_bot      BOOLEAN NOT NULL DEFAULT FALSE,
    mode        TEXT NOT NULL DEFAULT 'random' CHECK (mode IN ('random','friend')),
    status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','playing','finished')),
    phrase_id   BIGINT REFERENCES puzzles(id),
    winner_id   UUID REFERENCES profiles(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game results: for stats tracking
CREATE TABLE IF NOT EXISTS game_results (
    id          BIGSERIAL PRIMARY KEY,
    room_id     TEXT REFERENCES game_rooms(id),
    user_id     UUID NOT NULL REFERENCES profiles(id),
    score       INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by all, writable only by owner
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Friendships: visible to participants only
CREATE POLICY "friendships_select" ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friendships_insert" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friendships_update" ON friendships
    FOR UPDATE USING (auth.uid() = friend_id);

-- Game rooms: readable by participants
CREATE POLICY "rooms_select" ON game_rooms
    FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON game_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update" ON game_rooms
    FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Game results: readable by participants
CREATE POLICY "results_select" ON game_results
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "results_insert" ON game_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);
