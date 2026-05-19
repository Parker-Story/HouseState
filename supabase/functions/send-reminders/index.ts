import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Convert a UTC Date to local time in the configured timezone.
// Uses the "locale string re-parse" trick: toLocaleString produces a
// timezone-shifted string, and parsing it back gives a Date whose
// .getHours()/.getDay() return local values.
function inTimezone(date: Date, tz: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: tz }));
}

Deno.serve(async () => {
  try {
    const timezone = Deno.env.get('REMINDER_TIMEZONE') ?? 'UTC';
    const local = inTimezone(new Date(), timezone);
    const hh = local.getHours().toString().padStart(2, '0');
    const mm = local.getMinutes().toString().padStart(2, '0');
    const timePrefix = `${hh}:${mm}`;
    const dayOfWeek = local.getDay(); // 0 = Sun, 6 = Sat

    // Schedules matching the current minute
    const { data: schedules, error: schedErr } = await db
      .from('state_schedules')
      .select(`
        id,
        state_id,
        reminder_time,
        days_of_week,
        notify_user_ids,
        state:states!inner (
          id,
          title,
          notifications_enabled,
          active
        )
      `)
      .eq('enabled', true)
      .like('reminder_time', `${timePrefix}%`);

    if (schedErr) {
      return json({ error: schedErr.message }, 500);
    }

    // Filter by day-of-week and state flags
    const due = (schedules ?? []).filter((s: any) => {
      if (!s.state?.notifications_enabled || !s.state?.active) return false;
      if (!s.days_of_week || s.days_of_week.length === 0) return true;
      return s.days_of_week.includes(dayOfWeek);
    });

    if (due.length === 0) return json({ sent: 0 });

    // Skip tasks already completed today
    const stateIds = [...new Set(due.map((s: any) => s.state_id as string))];
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: doneToday } = await db
      .from('state_events')
      .select('state_id')
      .in('state_id', stateIds)
      .gte('created_at', todayStart.toISOString());

    const doneSet = new Set((doneToday ?? []).map((e: any) => e.state_id as string));
    const pending = due.filter((s: any) => !doneSet.has(s.state_id));

    if (pending.length === 0) return json({ sent: 0 });

    // Collect user IDs to notify
    const userIds = [
      ...new Set(pending.flatMap((s: any) => (s.notify_user_ids ?? []) as string[])),
    ];
    if (userIds.length === 0) return json({ sent: 0 });

    // Look up push tokens
    const { data: profiles } = await db
      .from('profiles')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    const tokenByUser = new Map(
      (profiles ?? []).map((p: any) => [p.id as string, p.push_token as string])
    );

    // Build Expo push messages
    const messages: object[] = [];
    for (const s of pending) {
      for (const uid of (s.notify_user_ids ?? []) as string[]) {
        const token = tokenByUser.get(uid);
        if (token) {
          messages.push({
            to: token,
            sound: 'default',
            title: 'HouseState',
            body: `Reminder: ${s.state.title}`,
            data: { stateId: s.state_id },
          });
        }
      }
    }

    if (messages.length === 0) return json({ sent: 0 });

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await expoRes.json();
    return json({ sent: messages.length, result });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
