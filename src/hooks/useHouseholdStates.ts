import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { getStates, getStateEventsForToday, createStateEvent } from '@/src/services/states';
import { State, StateEvent } from '@/src/types/database';

export type StateWithStatus = State & {
  completedToday: boolean;
  latestEvent: StateEvent | null;
};

export function useHouseholdStates(householdId?: string) {
  const [states, setStates] = useState<StateWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!householdId) {
      setStates([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const statesData = await getStates(householdId);
      if (statesData.length === 0) {
        setStates([]);
        return;
      }

      const stateIds = statesData.map((s) => s.id);
      const events = await getStateEventsForToday(stateIds);

      const eventsByStateId = new Map<string, StateEvent[]>();
      for (const event of events) {
        const list = eventsByStateId.get(event.state_id) ?? [];
        list.push(event);
        eventsByStateId.set(event.state_id, list);
      }

      const enriched = statesData.map((state) => {
        const stateEvents = eventsByStateId.get(state.id) ?? [];
        const latestEvent = stateEvents[0] ?? null;
        return {
          ...state,
          completedToday: stateEvents.length > 0,
          latestEvent,
        };
      });

      setStates(enriched);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch states'));
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  const markComplete = useCallback(
    async (stateId: string, completedBy?: string) => {
      try {
        const newEvent = await createStateEvent(stateId, completedBy);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        setStates((prev) =>
          prev.map((s) =>
            s.id === stateId
              ? { ...s, completedToday: true, latestEvent: newEvent }
              : s
          )
        );
      } catch (err) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(err instanceof Error ? err : new Error('Failed to mark complete'));
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { states, loading, error, refresh: fetchData, markComplete };
}
