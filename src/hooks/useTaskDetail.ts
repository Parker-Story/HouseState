import { useCallback, useEffect, useState } from 'react';
import {
  getStateById,
  getSchedulesForState,
  getEventsForState,
  getStateEventsForToday,
} from '@/src/services/states';
import { State, StateSchedule, StateEvent } from '@/src/types/database';

export type TaskDetail = {
  state: State;
  schedules: StateSchedule[];
  events: StateEvent[];
  completedToday: boolean;
};

export function useTaskDetail(stateId?: string) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!stateId) {
      setTask(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [state, schedules, events, todayEvents] = await Promise.all([
        getStateById(stateId),
        getSchedulesForState(stateId),
        getEventsForState(stateId, 20),
        getStateEventsForToday([stateId]),
      ]);

      if (!state) {
        setError(new Error('Task not found'));
        setLoading(false);
        return;
      }

      setTask({
        state,
        schedules,
        events,
        completedToday: todayEvents.length > 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch task')
      );
    } finally {
      setLoading(false);
    }
  }, [stateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { task, loading, error, refresh: fetchData };
}
