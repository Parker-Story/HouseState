import { supabase } from '@/src/lib/supabase';
import { Household, HouseholdMember, User } from '@/src/types/database';

export async function getHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createHousehold(name: string): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .insert({ name })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('*, user:users(*)')
    .eq('household_id', householdId);

  if (error) {
    throw error;
  }

  return data ?? [];
}export async function updateHousehold(
  householdId: string,
  name: string,
  originalUpdatedAt?: string
): Promise<Household> {
  const updatePayload = {
    name,
    updated_at: new Date().toISOString(),
  };

  let query = supabase
    .from('households')
    .update(updatePayload)
    .eq('id', householdId);

  if (originalUpdatedAt) {
    query = query.eq('updated_at', originalUpdatedAt);
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'This household was modified by someone else. Please refresh and try again.'
    );
  }

  return data;
}

export async function deleteHousehold(householdId: string): Promise<void> {
  const { error } = await supabase
    .from('households')
    .delete()
    .eq('id', householdId);

  if (error) {
    throw error;
  }
}

export async function addHouseholdMember(
  householdId: string,
  displayName: string
): Promise<{ member: HouseholdMember; user: User }> {
  // Create user first
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ display_name: displayName })
    .select()
    .single();

  if (userError || !user) {
    throw userError ?? new Error('Failed to create user');
  }

  // Then add as household member
  const { data: member, error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: householdId, user_id: user.id })
    .select()
    .single();

  if (memberError || !member) {
    throw memberError ?? new Error('Failed to add household member');
  }

  return { member, user };
}
