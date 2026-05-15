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

export function getFrequencyLabel(scheduleCount: number): string {
  if (scheduleCount === 0) return 'As needed';
  if (scheduleCount === 1) return 'Daily';
  if (scheduleCount === 2) return 'Twice daily';
  return `${scheduleCount}x daily`;
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
