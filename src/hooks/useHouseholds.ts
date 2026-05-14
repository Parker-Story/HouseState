import { useCallback, useEffect, useState } from 'react';
import { getHouseholds, createHousehold, getHouseholdMembers, addHouseholdMember } from '@/src/services/households';
import { Household, HouseholdMember, User } from '@/src/types/database';

export function useHouseholds() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<(HouseholdMember & { user: User })[]>([]);
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
    async (name: string, firstMemberName: string) => {
      try {
        setError(null);
        const household = await createHousehold(name);
        const { user } = await addHouseholdMember(household.id, firstMemberName);

        setHouseholds((prev) => [household, ...prev]);
        setCurrentHouseholdId(household.id);

        return { household, user };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create household'));
        throw err;
      }
    },
    []
  );

  const fetchMembers = useCallback(async (householdId: string) => {
    try {
      const data = await getHouseholdMembers(householdId);
      setMembers(data as (HouseholdMember & { user: User })[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch members'));
    }
  }, []);

  const addMember = useCallback(
    async (householdId: string, displayName: string) => {
      try {
        setError(null);
        const { member, user } = await addHouseholdMember(householdId, displayName);
        setMembers((prev) => [...prev, { ...member, user }]);
        return { member, user };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add member'));
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

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
    addMember,
  };
}
