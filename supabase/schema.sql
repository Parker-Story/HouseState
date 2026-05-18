-- HouseState Database Schema v2
-- Supports Supabase Anonymous Auth + Invite Codes + RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES (tied to auth.users via anonymous auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile row when an auth user is created (including anonymous)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, 'Anonymous');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- HOUSEHOLDS (with invite codes + creator tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Generate random 6-char invite code on insert
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- ensure uniqueness by trying again on collision
    IF NOT EXISTS (SELECT 1 FROM households WHERE invite_code = result) THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_household_invite_code()
RETURNS trigger AS $$
BEGIN
  IF new.invite_code IS NULL THEN
    new.invite_code := public.generate_invite_code();
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invite_code ON households;
CREATE TRIGGER trg_set_invite_code
  BEFORE INSERT ON households
  FOR EACH ROW EXECUTE PROCEDURE public.set_household_invite_code();

-- =====================================================
-- HOUSEHOLD MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(household_id, user_id)
);

-- =====================================================
-- STATES (tasks)
-- =====================================================
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  recurrence_pattern TEXT DEFAULT 'daily',
  recurrence_days INTEGER[] DEFAULT NULL,
  notifications_enabled BOOLEAN DEFAULT true
);

-- =====================================================
-- STATE SCHEDULES
-- =====================================================
CREATE TABLE IF NOT EXISTS state_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  reminder_time TEXT NOT NULL,
  days_of_week INTEGER[] DEFAULT NULL,
  enabled BOOLEAN DEFAULT true,
  notify_user_ids UUID[] DEFAULT NULL
);

-- =====================================================
-- STATE EVENTS (completion records)
-- =====================================================
CREATE TABLE IF NOT EXISTS state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  completed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_by TEXT,
  value TEXT
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_events ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read any profile (needed for display names)
CREATE POLICY "Profiles are viewable by own user" ON profiles FOR SELECT USING (id = auth.uid());
-- Profiles: users can insert/update their own profile
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Households: members can read their households
CREATE POLICY "Members can view households" ON households FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
  )
);
-- Households: creator or member can update
CREATE POLICY "Members can update households" ON households FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
  )
);
-- Households: members can delete their households
CREATE POLICY "Members can delete households" ON households FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
  )
);
-- Households: any authenticated user can create a household
CREATE POLICY "Authenticated users can create households" ON households FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Household Members: members can view members of their households
CREATE POLICY "Members can view household members" ON household_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid()
  )
);
-- Household Members: members can add new members to their households
CREATE POLICY "Members can add household members" ON household_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid()
  )
  OR
  -- Allow joining via invite code (will be checked in application logic)
  auth.role() = 'authenticated'
);
-- Household Members: members can leave households
CREATE POLICY "Members can delete own membership" ON household_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid()
  )
);

-- States: members can read/write states in their households
CREATE POLICY "Members can view states" ON states FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = states.household_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can create states" ON states FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = states.household_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can update states" ON states FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = states.household_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can delete states" ON states FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = states.household_id AND hm.user_id = auth.uid()
  )
);

-- State Schedules: members can read/write schedules for states in their households
CREATE POLICY "Members can view schedules" ON state_schedules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_schedules.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can create schedules" ON state_schedules FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_schedules.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can update schedules" ON state_schedules FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_schedules.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can delete schedules" ON state_schedules FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_schedules.state_id AND hm.user_id = auth.uid()
  )
);

-- State Events: members can read/write events for states in their households
CREATE POLICY "Members can view events" ON state_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_events.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can create events" ON state_events FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_events.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can update events" ON state_events FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_events.state_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can delete events" ON state_events FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN states s ON s.household_id = hm.household_id
    WHERE s.id = state_events.state_id AND hm.user_id = auth.uid()
  )
);

-- =====================================================
-- REALTIME
-- =====================================================
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE households;
ALTER PUBLICATION supabase_realtime ADD TABLE household_members;
ALTER PUBLICATION supabase_realtime ADD TABLE states;
ALTER PUBLICATION supabase_realtime ADD TABLE state_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE state_events;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- =====================================================
-- PERFORMANCE INDEXES FOR RLS POLICIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_household_members_lookup ON household_members(household_id, user_id);
CREATE INDEX IF NOT EXISTS idx_states_household ON states(household_id);
CREATE INDEX IF NOT EXISTS idx_state_events_state ON state_events(state_id);
