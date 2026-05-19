import { useCallback, useEffect, useState } from 'react';
import {
  getHouseholds,
  createHousehold,
  getHouseholdMembers,
  addHouseholdMember,
  joinHouseholdByInviteCode,
} from '@/src/services/households';
import { Household, HouseholdMember, Profile } from '@/src/types/database';
import { useAuth } from '@/src/hooks/useAuth';

export function useHouseholds() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<(HouseholdMember & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHouseholds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHouseholds();
      setHouseholds(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch households'));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectHousehold = useCallback((householdId: string | null) => {
    setCurrentHouseholdId(householdId);
  }, []);

  const createNewHousehold = useCallback(
    async (name: string) => {
      if (!userId) throw new Error('Not authenticated');
      try {
        setError(null);
        const household = await createHousehold(name);
        await addHouseholdMember(household.id, userId);

        setHouseholds((prev) => [household, ...prev]);
        setCurrentHouseholdId(household.id);

        return household;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create household'));
        throw err;
      }
    },
    [userId]
  );

  const joinByInviteCode = useCallback(
    async (code: string) => {
      if (!userId) throw new Error('Not authenticated');
      try {
        setError(null);
        const { household } = await joinHouseholdByInviteCode(code, userId);
        setHouseholds((prev) => {
          if (prev.some((h) => h.id === household.id)) return prev;
          return [household, ...prev];
        });
        setCurrentHouseholdId(household.id);
        return household;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to join household'));
        throw err;
      }
    },
    [userId]
  );

  const fetchMembers = useCallback(async (householdId: string) => {
    try {
      const data = await getHouseholdMembers(householdId);
      setMembers(data as (HouseholdMember & { profile: Profile })[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch members'));
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setHouseholds([]);
      setCurrentHouseholdId(null);
      setMembers([]);
      setLoading(false);
      setError(null);
      return;
    }
    fetchHouseholds();
  }, [userId, fetchHouseholds]);

  useEffect(() => {
    if (currentHouseholdId) {
      fetchMembers(currentHouseholdId);
    } else {
      setMembers([]);
    }
  }, [currentHouseholdId, fetchMembers]);

  return {
    households,
    currentHouseholdId,
    members,
    loading,
    error,
    refresh: fetchHouseholds,
    selectHousehold,
    createNewHousehold,
    joinByInviteCode,
  };
}
