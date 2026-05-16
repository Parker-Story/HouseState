-- HouseState Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL
);

-- Users table (simple, no auth for now)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  display_name TEXT NOT NULL
);

-- Household members (links users to households)
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(household_id, user_id)
);

-- States (tasks/activities to track)
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

-- State schedules (when reminders should fire)
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

-- Migration: add days_of_week for richer recurring schedules
ALTER TABLE state_schedules ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] DEFAULT NULL;

-- Migration: add notes column to states (for task notes)
ALTER TABLE states ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migration: add enabled column to state_schedules (for per-schedule notification toggle)
ALTER TABLE state_schedules ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Migration: add recurrence fields, notifications toggle, and optimistic-locking timestamps
ALTER TABLE states ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'daily';
ALTER TABLE states ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] DEFAULT NULL;
ALTER TABLE states ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE state_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE households ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- State events (completion records)
CREATE TABLE IF NOT EXISTS state_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  completed_by TEXT,
  value TEXT
);

-- Disable Row Level Security for development (reenable later with proper policies)
ALTER TABLE households DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE states DISABLE ROW LEVEL SECURITY;
ALTER TABLE state_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE state_events DISABLE ROW LEVEL SECURITY;
