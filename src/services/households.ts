import { supabase } from '@/src/lib/supabase';
import { Household, HouseholdMember, Profile } from '@/src/types/database';

export async function getHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Household[];
}

export async function getHouseholdById(householdId: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Household;
}

export async function getHouseholdByInviteCode(inviteCode: string): Promise<Household | null> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as Household;
}

export async function createHousehold(name: string): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create household');
  }

  return data as Household;
}

export async function updateHousehold(
  householdId: string,
  name: string,
  originalUpdatedAt?: string
): Promise<Household> {
  const updatePayload = {
    name: name.trim(),
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

  return data as Household;
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

export async function getHouseholdMembers(householdId: string): Promise<(HouseholdMember & { profile: Profile })[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('*, profile:profiles(*)')
    .eq('household_id', householdId);

  if (error) {
    throw error;
  }

  return (data ?? []) as (HouseholdMember & { profile: Profile })[];
}

export async function addHouseholdMember(
  householdId: string,
  userId: string
): Promise<HouseholdMember> {
  const { data, error } = await supabase
    .from('household_members')
    .insert({ household_id: householdId, user_id: userId })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to add household member');
  }

  return data as HouseholdMember;
}

export async function joinHouseholdByInviteCode(
  inviteCode: string,
  userId: string
): Promise<{ household: Household; member: HouseholdMember }> {
  const code = inviteCode.toUpperCase().trim();

  const household = await getHouseholdByInviteCode(code);
  if (!household) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', household.id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    throw new Error('You are already a member of this household.');
  }

  const member = await addHouseholdMember(household.id, userId);
  return { household, member };
}

export async function removeHouseholdMember(
  householdId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  const { data, error } = await supabase
    .from('households')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', householdId)
    .select('invite_code')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to regenerate invite code');

  // Trigger will generate a new code on update if we clear it first, 
  // but our trigger only runs on INSERT. For updates, we need a different approach.
  // Let's generate a new code directly.
  const { data: refreshed, error: refreshErr } = await supabase.rpc('refresh_invite_code', {
    p_household_id: householdId,
  });

  if (refreshErr) {
    // Fallback: just update with a random code manually
    const newCode = generateRandomCode();
    const { data: updated } = await supabase
      .from('households')
      .update({ invite_code: newCode })
      .eq('id', householdId)
      .select('invite_code')
      .single();
    if (!updated) throw new Error('Failed to regenerate invite code');
    return updated.invite_code!;
  }

  return refreshed as string;
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
