export type Household = {
  id: string;
  created_at: string;
  name: string;
};

export type User = {
  id: string;
  created_at: string;
  display_name: string;
};

export type HouseholdMember = {
  id: string;
  created_at: string;
  household_id: string;
  user_id: string;
  user?: User;
};

export type State = {
  id: string;
  created_at: string;
  household_id: string;
  title: string;
  category: string | null;
  active: boolean;
};

export type StateSchedule = {
  id: string;
  created_at: string;
  state_id: string;
  reminder_time: string;
  enabled: boolean;
  notify_user_ids: string[] | null;
};

export type StateEvent = {
  id: string;
  created_at: string;
  state_id: string;
  completed_by: string | null;
  value: string | null;
};
