import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';

export function useRealtimeHousehold(
  householdId: string | null,
  onChange: () => void
) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!householdId) return;

    // Subscribe to all relevant tables for this household
    const channels = [
      // States changes
      supabase
        .channel(`household-states-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'states',
            filter: `household_id=eq.${householdId}`,
          },
          stableCallback
        )
        .subscribe(),

      // State events changes (completions)
      supabase
        .channel(`household-events-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'state_events',
          },
          (payload) => {
            // We filter client-side since state_events doesn't have household_id directly
            // The stableCallback will re-fetch anyway
            stableCallback();
          }
        )
        .subscribe(),

      // Schedule changes
      supabase
        .channel(`household-schedules-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'state_schedules',
          },
          stableCallback
        )
        .subscribe(),

      // Household member changes
      supabase
        .channel(`household-members-${householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'household_members',
            filter: `household_id=eq.${householdId}`,
          },
          stableCallback
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [householdId, stableCallback]);
}
