import { Pressable, StyleSheet, View, Text } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StateWithStatus } from '@/src/hooks/useHouseholdStates';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getCategoryConfig,
  getFrequencyLabel,
  formatRelativeTime,
  formatScheduleTime,
  formatDaysOfWeek,
  hexToRgba,
} from '@/src/utils/categoryConfig';

interface StateCardProps {
  state: StateWithStatus;
  onMarkComplete: (stateId: string) => void;
  onPress?: (stateId: string) => void;
}

export function StateCard({ state, onMarkComplete, onPress }: StateCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const config = getCategoryConfig(state.category);
  const categoryColor = config.color;

  const frequency = getFrequencyLabel(state.schedules, state.recurrence_pattern);
  const categoryDisplay = state.category
    ? `${state.category.charAt(0).toUpperCase() + state.category.slice(1)}`
    : 'Task';

  const lastInfo = state.lastEvent
    ? `Last: ${state.lastEvent.completed_by ?? 'someone'} · ${formatRelativeTime(state.lastEvent.created_at)}`
    : 'Not completed yet';

  const nextSchedule = state.schedules?.[0];
  const scheduleTime = nextSchedule ? formatScheduleTime(nextSchedule.reminder_time) : null;
  const scheduleDays = nextSchedule ? formatDaysOfWeek(nextSchedule.days_of_week) : null;

  return (
    <Pressable
      onPress={() => onPress?.(state.id)}
      style={({ pressed }) => [
        { opacity: pressed ? 0.92 : 1 },
      ]}
    >
    <ThemedView
      style={[ 
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
          borderColor: isDark ? Colors.dark.cardBorder : Colors.light.cardBorder,
        },
        state.completedToday && styles.cardCompleted,
      ]}
    >
      {/* Top Row: Icon + Info + Button */}
      <View style={styles.topRow}>
        {/* Icon Circle */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isDark ? hexToRgba(config.color, 0.19) : config.bgColor },
          ]}
        >
          <Text style={styles.emoji}>{config.emoji}</Text>
        </View>

        {/* Text Info */}
        <View style={styles.infoContainer}>
          <ThemedText
            type="defaultSemiBold"
            style={[
              styles.title,
              state.completedToday && { color: Colors[colorScheme].success },
            ]}
          >
            {state.title}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {categoryDisplay} · {frequency}
          </ThemedText>
          <ThemedText style={styles.lastInfo}>{lastInfo}</ThemedText>
        </View>

        {/* Action Button */}
        {!state.completedToday ? (
          <Pressable
            onPress={() => onMarkComplete(state.id)}
            style={({ pressed }) => [
              styles.markDoneBtn,
              {
                borderColor: categoryColor,
                backgroundColor: isDark ? hexToRgba(categoryColor, 0.13) : config.lightColor,
              },
              pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
            ]}
            hitSlop={12}
            accessibilityLabel={`Mark ${state.title} complete`}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.markDoneText, { color: categoryColor }]}>
              Mark Done
            </ThemedText>
          </Pressable>
        ) : (
          <View
            style={[
              styles.doneBtn,
              { backgroundColor: Colors[colorScheme].success },
            ]}
            accessible
            accessibilityLabel="Completed"
          >
            <IconSymbol name="checkmark" size={14} color="#fff" />
            <ThemedText style={styles.doneText}>Done</ThemedText>
          </View>
        )}
      </View>

      {/* Bottom Row: Streak + Schedule Time */}
      <View style={[styles.bottomRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <View style={styles.streakContainer}>
          <IconSymbol name="flame.fill" size={14} color={categoryColor} />
          <ThemedText style={[styles.streakText, { color: categoryColor }]}>
            0 day streak
          </ThemedText>
        </View>

        {Boolean(scheduleTime) ? (
          <View style={styles.scheduleContainer}>
            <IconSymbol name="alarm" size={14} color={Colors[colorScheme].muted} />
            <ThemedText style={styles.scheduleText}>
              {scheduleDays === 'Daily' ? scheduleTime : `${scheduleDays} · ${scheduleTime}`}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.55,
  },
  lastInfo: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.45,
    marginTop: 2,
  },
  markDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  markDoneText: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 12,
    opacity: 0.5,
  },
});
