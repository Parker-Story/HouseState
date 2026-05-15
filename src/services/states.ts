import { supabase } from '@/src/lib/supabase';
import { State, StateEvent, StateSchedule } from '@/src/types/database';

export async function getStates(householdId: string): Promise<State[]> {
  const { data, error } = await supabase
    .from('states')
    .select('*')
    .eq('household_id', householdId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getStateEventsForToday(stateIds: string[]): Promise<StateEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('state_events')
    .select('*')
    .in('state_id', stateIds)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createStateEvent(
  stateId: string,
  completedBy: string = 'You'
): Promise<StateEvent> {
  const { data, error } = await supabase
    .from('state_events')
    .insert({
      state_id: stateId,
      completed_by: completedBy,
      value: 'completed',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type CreateStateInput = {
  householdId: string;
  title: string;
  category: string | null;
  schedules: {
    reminderTime: string; // "HH:mm" format
    notifyUserIds: string[];
  }[];
};

export async function createStateWithSchedules(input: CreateStateInput): Promise<State> {
  // Create the state first
  const { data: state, error: stateError } = await supabase
    .from('states')
    .insert({
      household_id: input.householdId,
      title: input.title,
      category: input.category,
      active: true,
    })
    .select()
    .single();

  if (stateError || !state) {
    throw stateError ?? new Error('Failed to create state');
  }

  // Create schedules if any
  if (input.schedules.length > 0) {
    const scheduleInserts = input.schedules.map((s) => ({
      state_id: state.id,
      reminder_time: s.reminderTime,
      enabled: true,
    }));

    const { error: scheduleError } = await supabase
      .from('state_schedules')
      .insert(scheduleInserts);

    if (scheduleError) {
      throw scheduleError;
    }
  }

  return state;
}

export async function getSchedulesForState(stateId: string): Promise<StateSchedule[]> {
  const { data, error } = await supabase
    .from('state_schedules')
    .select('*')
    .eq('state_id', stateId)
    .eq('enabled', true)
    .order('reminder_time', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLatestEventForState(stateId: string): Promise<StateEvent | null> {
  const { data, error } = await supabase
    .from('state_events')
    .select('*')
    .eq('state_id', stateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

export async function getLatestEventsForStates(stateIds: string[]): Promise<Map<string, StateEvent>> {
  if (stateIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('state_events')
    .select('*')
    .in('state_id', stateIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Query is ordered by created_at DESC, so the first event encountered
  // for each state_id is the latest one for that state.
  const latestByState = new Map<string, StateEvent>();
  for (const event of data ?? []) {
    if (!latestByState.has(event.state_id)) {
      latestByState.set(event.state_id, event);
    }
  }

  return latestByState;
}

export async function getSchedulesForStates(stateIds: string[]): Promise<StateSchedule[]> {
  if (stateIds.length === 0) return [];

  const { data, error } = await supabase
    .from('state_schedules')
    .select('*')
    .in('state_id', stateIds)
    .eq('enabled', true)
    .order('reminder_time', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
