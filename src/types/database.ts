export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Household = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  invite_code: string | null;
  created_by: string | null;
};

export type HouseholdMember = {
  id: string;
  created_at: string;
  household_id: string;
  user_id: string;
  profile?: Profile;
};

export type State = {
  id: string;
  created_at: string;
  updated_at: string;
  household_id: string;
  title: string;
  category: string | null;
  notes: string | null;
  active: boolean;
  recurrence_pattern: 'daily' | 'weekdays' | 'weekends' | 'custom' | null;
  recurrence_days: number[] | null;
  notifications_enabled: boolean;
};

export type StateSchedule = {
  id: string;
  created_at: string;
  updated_at: string;
  state_id: string;
  reminder_time: string;
  days_of_week: number[] | null;
  enabled: boolean;
  notify_user_ids: string[] | null;
};

export type StateEvent = {
  id: string;
  created_at: string;
  state_id: string;
  completed_by_id: string | null;
  completed_by: string | null;
  value: string | null;
  profile?: Profile;
};
