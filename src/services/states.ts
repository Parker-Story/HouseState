import { supabase } from '@/src/lib/supabase';
import { State, StateEvent, StateSchedule } from '@/src/types/database';

/**
 * Retry helper for PostgREST schema-cache errors (PGRST204).
 */
async function insertWithFallback<T>(
  table: string,
  payload: Record<string, unknown>,
  selectQuery: string = '*'
): Promise<{ data: T | null; error: Error | null }> {
  let attemptPayload = { ...payload };
  let retries = 0;
  const maxRetries = 5;

  while (retries <= maxRetries) {
    const { data, error } = await supabase
      .from(table)
      .insert(attemptPayload)
      .select(selectQuery)
      .single();

    if (!error) {
      return { data: data as T, error: null };
    }

    const err = error as any;
    if (err.code === 'PGRST204' && err.message) {
      const match = err.message.match(/Could not find the '([^']+)' column/);
      if (match) {
        const missingColumn = match[1];
        console.warn(
          `[Migration fallback] Column '${missingColumn}' missing on '${table}'. Retrying without it.`
        );
        delete attemptPayload[missingColumn];
        retries++;
        continue;
      }
    }

    return { data: null, error: error as Error };
  }

  return { data: null, error: new Error('Failed after fallback retries') };
}

async function insertManyWithFallback(
  table: string,
  payload: Record<string, unknown>[]
): Promise<{ data: unknown[] | null; error: Error | null }> {
  let attemptPayload = payload.map((p) => ({ ...p }));
  let retries = 0;
  const maxRetries = 5;

  while (retries <= maxRetries) {
    const { data, error } = await supabase.from(table).insert(attemptPayload).select();

    if (!error) {
      return { data: data ?? [], error: null };
    }

    const err = error as any;
    if (err.code === 'PGRST204' && err.message) {
      const match = err.message.match(/Could not find the '([^']+)' column/);
      if (match) {
        const missingColumn = match[1];
        console.warn(
          `[Migration fallback] Column '${missingColumn}' missing on '${table}'. Retrying without it.`
        );
        attemptPayload = attemptPayload.map((p) => {
          const copy = { ...p };
          delete copy[missingColumn];
          return copy;
        });
        retries++;
        continue;
      }
    }

    return { data: null, error: error as Error };
  }

  return { data: null, error: new Error('Failed after fallback retries') };
}

async function updateWithFallback<T>(
  table: string,
  idColumn: string,
  idValue: string,
  payload: Record<string, unknown>,
  originalUpdatedAt?: string
): Promise<{ data: T | null; error: Error | null }> {
  let attemptPayload = { ...payload };
  const strippedColumns = new Set<string>();
  let retries = 0;
  const maxRetries = 5;

  while (retries <= maxRetries) {
    let query = supabase
      .from(table)
      .update(attemptPayload)
      .eq(idColumn, idValue);

    if (originalUpdatedAt && !strippedColumns.has('updated_at')) {
      query = query.eq('updated_at', originalUpdatedAt);
    }

    const { data, error } = await query.select().single();

    if (!error) {
      return { data: data as T, error: null };
    }

    const err = error as any;
    if (err.code === 'PGRST204' && err.message) {
      const match = err.message.match(/Could not find the '([^']+)' column/);
      if (match) {
        const missingColumn = match[1];
        console.warn(
          `[Migration fallback] Column '${missingColumn}' missing on '${table}'. Retrying without it.`
        );
        delete attemptPayload[missingColumn];
        strippedColumns.add(missingColumn);
        retries++;
        continue;
      }
    }

    return { data: null, error: error as Error };
  }

  return { data: null, error: new Error('Failed after fallback retries') };
}

export async function getStates(householdId: string): Promise<State[]> {
  const { data, error } = await supabase
    .from('states')
    .select('*')
    .eq('household_id', householdId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (!error) {
    return (data ?? []) as State[];
  }

  const err = error as any;
  if (err.code === 'PGRST204' && err.message?.includes("'active'")) {
    console.warn("[Migration fallback] Column 'active' missing on 'states'. Fetching without filter.");
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('states')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (fallbackError) throw fallbackError;
    return (fallbackData ?? []) as State[];
  }

  throw error;
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

  return (data ?? []) as StateEvent[];
}

export async function createStateEvent(
  stateId: string,
  completedById: string,
  completedByName: string
): Promise<StateEvent> {
  const { data, error } = await supabase
    .from('state_events')
    .insert({
      state_id: stateId,
      completed_by_id: completedById,
      completed_by: completedByName,
      value: 'completed',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as StateEvent;
}

export type CreateStateInput = {
  householdId: string;
  title: string;
  category: string | null;
  notes: string | null;
  recurrencePattern: 'daily' | 'weekdays' | 'weekends' | 'custom';
  recurrenceDays: number[] | null;
  notificationsEnabled: boolean;
  schedules: {
    reminderTime: string;
    notifyUserIds: string[];
    enabled: boolean;
  }[];
};

function getDaysFromPattern(
  pattern: 'daily' | 'weekdays' | 'weekends' | 'custom',
  customDays: number[] | null
): number[] | null {
  if (pattern === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  if (pattern === 'weekdays') return [1, 2, 3, 4, 5];
  if (pattern === 'weekends') return [0, 6];
  return customDays && customDays.length > 0 ? customDays : null;
}

export async function createStateWithSchedules(input: CreateStateInput): Promise<State> {
  const { data: state, error: stateError } = await insertWithFallback<State>(
    'states',
    {
      household_id: input.householdId,
      title: input.title,
      category: input.category,
      notes: input.notes,
      active: true,
      recurrence_pattern: input.recurrencePattern,
      recurrence_days: input.recurrencePattern === 'custom' ? input.recurrenceDays : null,
      notifications_enabled: input.notificationsEnabled,
    }
  );

  if (stateError || !state) {
    throw stateError ?? new Error('Failed to create state');
  }

  if (input.schedules.length > 0) {
    const daysOfWeek = getDaysFromPattern(input.recurrencePattern, input.recurrenceDays);
    const scheduleInserts = input.schedules.map((s) => ({
      state_id: state.id,
      reminder_time: s.reminderTime,
      days_of_week: daysOfWeek,
      notify_user_ids: s.notifyUserIds,
      enabled: s.enabled,
    }));

    const { error: scheduleError } = await insertManyWithFallback(
      'state_schedules',
      scheduleInserts
    );

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
    .order('reminder_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as StateSchedule[];
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

  return data as StateEvent;
}

export async function getStateById(stateId: string): Promise<State | null> {
  const { data, error } = await supabase
    .from('states')
    .select('*')
    .eq('id', stateId)
    .eq('active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as State;
}

export async function deleteState(stateId: string): Promise<void> {
  const { error } = await supabase
    .from('states')
    .delete()
    .eq('id', stateId);

  if (error) {
    throw error;
  }
}

export async function updateState(
  stateId: string,
  updates: {
    title?: string;
    category?: string | null;
    notes?: string | null;
    active?: boolean;
    recurrence_pattern?: 'daily' | 'weekdays' | 'weekends' | 'custom';
    recurrence_days?: number[] | null;
    notifications_enabled?: boolean;
  },
  originalUpdatedAt?: string
): Promise<State> {
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await updateWithFallback<State>(
    'states',
    'id',
    stateId,
    updatePayload,
    originalUpdatedAt
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'This task was modified by someone else. Please refresh and try again.'
    );
  }

  return data as State;
}

export async function createSchedule(
  stateId: string,
  schedule: {
    reminderTime: string;
    daysOfWeek: number[] | null;
    notifyUserIds: string[];
    enabled?: boolean;
  }
): Promise<StateSchedule> {
  const { data, error } = await insertWithFallback<StateSchedule>(
    'state_schedules',
    {
      state_id: stateId,
      reminder_time: schedule.reminderTime,
      days_of_week: schedule.daysOfWeek,
      notify_user_ids: schedule.notifyUserIds,
      enabled: schedule.enabled ?? true,
    }
  );

  if (error || !data) {
    throw error ?? new Error('Failed to create schedule');
  }

  return data as StateSchedule;
}

export async function updateSchedule(
  scheduleId: string,
  updates: {
    reminder_time?: string;
    days_of_week?: number[] | null;
    notify_user_ids?: string[];
    enabled?: boolean;
  },
  originalUpdatedAt?: string
): Promise<StateSchedule> {
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await updateWithFallback<StateSchedule>(
    'state_schedules',
    'id',
    scheduleId,
    updatePayload,
    originalUpdatedAt
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'This schedule was modified by someone else. Please refresh and try again.'
    );
  }

  return data as StateSchedule;
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('state_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    throw error;
  }
}

export async function getEventsForState(stateId: string, limit: number = 20): Promise<StateEvent[]> {
  const { data, error } = await supabase
    .from('state_events')
    .select('*')
    .eq('state_id', stateId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as StateEvent[];
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

  const latestByState = new Map<string, StateEvent>();
  for (const event of (data ?? []) as StateEvent[]) {
    if (!latestByState.has(event.state_id)) {
      latestByState.set(event.state_id, event);
    }
  }

  return latestByState;
}

export async function getSchedulesForStates(stateIds: string[]): Promise<StateSchedule[]> {
  if (stateIds.length === 0) return [];

  const { data: dataWithFilter, error: filterError } = await supabase
    .from('state_schedules')
    .select('*')
    .in('state_id', stateIds)
    .eq('enabled', true)
    .order('reminder_time', { ascending: true });

  if (!filterError) {
    return (dataWithFilter ?? []) as StateSchedule[];
  }

  const err = filterError as any;
  if (err.code === 'PGRST204' && err.message?.includes("'enabled'")) {
    console.warn(
      "[Migration fallback] Column 'enabled' missing on 'state_schedules'. Fetching all schedules without filter."
    );
    const { data, error } = await supabase
      .from('state_schedules')
      .select('*')
      .in('state_id', stateIds)
      .order('reminder_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as StateSchedule[];
  }

  throw filterError;
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function getRecentActivityForUser(
  limit: number = 30
): Promise<
  {
    event: StateEvent;
    stateTitle: string;
    stateCategory: string | null;
  }[]
> {
  const userId = await getCurrentUserId();

  const { data: memberships, error: mErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId);
  if (mErr) throw mErr;

  const householdIds = memberships?.map((m) => m.household_id) ?? [];
  if (householdIds.length === 0) return [];

  const { data: states, error: sErr } = await supabase
    .from('states')
    .select('id, title, category')
    .in('household_id', householdIds);
  if (sErr) throw sErr;

  const stateMap = new Map(states?.map((s) => [s.id, s]) ?? []);
  const stateIds = Array.from(stateMap.keys());
  if (stateIds.length === 0) return [];

  const { data: events, error: eErr } = await supabase
    .from('state_events')
    .select('*')
    .in('state_id', stateIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (eErr) throw eErr;

  return (events ?? []).map((e) => ({
    event: e as StateEvent,
    stateTitle: stateMap.get(e.state_id)?.title ?? 'Unknown Task',
    stateCategory: stateMap.get(e.state_id)?.category ?? null,
  }));
}
