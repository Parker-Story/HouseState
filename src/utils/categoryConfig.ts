export type CategoryConfig = {
  emoji: string;
  color: string;
  bgColor: string;
  lightColor: string;
};

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  pets: {
    emoji: '🐕',
    color: '#D4A03A',
    bgColor: '#FDF5E6',
    lightColor: '#F5E6C8',
  },
  health: {
    emoji: '💊',
    color: '#A78BFA',
    bgColor: '#F3F0FD',
    lightColor: '#E9E0FC',
  },
  home: {
    emoji: '🗑️',
    color: '#7A9E7E',
    bgColor: '#E8F2EC',
    lightColor: '#D4E8DD',
  },
  kitchen: {
    emoji: '🍽️',
    color: '#3D8F8F',
    bgColor: '#E6F5F5',
    lightColor: '#D4E8E8',
  },
  default: {
    emoji: '✨',
    color: '#7A9E7E',
    bgColor: '#E8F2EC',
    lightColor: '#D4E8DD',
  },
};

export function getCategoryConfig(category: string | null): CategoryConfig {
  if (!category) return CATEGORY_MAP.default;
  const key = category.toLowerCase().trim();
  return CATEGORY_MAP[key] ?? CATEGORY_MAP.default;
}

export const AVAILABLE_CATEGORIES = [
  { key: 'pets', label: 'Pets' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'health', label: 'Health' },
  { key: 'home', label: 'Home' },
] as const;

export type CategoryKey = (typeof AVAILABLE_CATEGORIES)[number]['key'];

const PATTERN_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom',
};

export function getFrequencyLabel(
  schedules: { reminder_time: string; days_of_week?: number[] | null }[],
  recurrencePattern?: string | null
): string {
  if (schedules.length === 0) return 'As needed';

  if (recurrencePattern && recurrencePattern !== 'custom') {
    if (schedules.length === 1) return PATTERN_LABELS[recurrencePattern] ?? 'Recurring';
    return `${schedules.length}x ${PATTERN_LABELS[recurrencePattern] ?? 'daily'}`;
  }

  // Fallback: derive from schedules
  const dailyCount = schedules.filter(
    (s) =>
      !s.days_of_week ||
      s.days_of_week.length === 0 ||
      s.days_of_week.length === 7
  ).length;
  const specificDayCount = schedules.filter(
    (s) =>
      s.days_of_week &&
      s.days_of_week.length > 0 &&
      s.days_of_week.length < 7
  ).length;

  if (dailyCount > 0 && specificDayCount === 0) {
    if (dailyCount === 1) return 'Daily';
    return `${dailyCount}x daily`;
  }

  if (specificDayCount > 0 && dailyCount === 0) {
    const allDays = new Set(schedules.flatMap((s) => s.days_of_week ?? []));
    if (allDays.size === 1) {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `Weekly · ${dayLabels[Array.from(allDays)[0]]}`;
    }
    if (allDays.size === 7) return 'Daily';
    return `${allDays.size} days/wk`;
  }

  return `${schedules.length} reminders`;
}

export function formatDaysOfWeek(days: number[] | null): string {
  if (!days || days.length === 0) return 'Daily';
  if (days.length === 7) return 'Daily';

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 1) return dayLabels[days[0]];
  if (days.length === 2)
    return `${dayLabels[days[0]]} & ${dayLabels[days[1]]}`;

  return days.map((d) => dayLabels[d]).join(', ');
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatScheduleTime(timeString: string): string | null {
  if (!timeString || !timeString.includes(':')) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Convert a 6-digit hex color to an rgba string with the given alpha (0-1) */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Deterministic avatar color based on a name string */
const AVATAR_PALETTE = [
  '#E08E45', // warm orange
  '#3D8F8F', // teal
  '#A78BFA', // lavender
  '#7A9E7E', // sage
  '#D4A03A', // gold
  '#E86A92', // rose
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % AVATAR_PALETTE.length);
  return AVATAR_PALETTE[index];
}

/** Simple consecutive-day streak from completion events */
export function calculateStreak(events: { created_at: string }[]): number {
  if (events.length === 0) return 0;

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentCheck = new Date(today);

  for (const event of sorted) {
    const eventDate = new Date(event.created_at);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === currentCheck.getTime()) {
      streak++;
      currentCheck.setDate(currentCheck.getDate() - 1);
    } else if (eventDate.getTime() === currentCheck.getTime() + 24 * 60 * 60 * 1000) {
      // duplicate from the original same day (currentCheck was already decremented)
      continue;
    } else {
      break;
    }
  }

  return streak;
}
