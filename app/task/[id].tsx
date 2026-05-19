import { useCallback, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Text,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useTaskDetail } from '@/src/hooks/useTaskDetail';
import {
  getCategoryConfig,
  formatScheduleTime,
  formatRelativeDate,
  getFrequencyLabel,
  getAvatarColor,
  calculateStreak,
  hexToRgba,
} from '@/src/utils/categoryConfig';
import { createStateEvent, deleteState } from '@/src/services/states';
import { useAuth } from '@/src/hooks/useAuth';
import * as Haptics from 'expo-haptics';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { task, loading, error, refresh } = useTaskDetail(
    typeof id === 'string' ? id : undefined
  );
  const { user, profile } = useAuth();
  const [marking, setMarking] = useState(false);

  const handleMarkDone = useCallback(async () => {
    if (!id || !task || task.completedToday) return;
    if (!user?.id || !profile?.display_name) {
      Alert.alert('Not Ready', 'Your session is still loading. Please try again in a moment.');
      return;
    }
    try {
      setMarking(true);
      await createStateEvent(
        id,
        user.id,
        profile.display_name
      );
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      await refresh();
    } catch {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      Alert.alert('Error', 'Failed to mark task as done. Please try again.');
    } finally {
      setMarking(false);
    }
  }, [id, task, refresh, user?.id, profile?.display_name]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Task?',
      'This will permanently remove this task and all its history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await deleteState(id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              ).catch(() => {});
              router.back();
            } catch {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              ).catch(() => {});
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          },
        },
      ]
    );
  }, [id, router]);

  const config = useMemo(
    () => (task ? getCategoryConfig(task.state.category) : null),
    [task]
  );

  const stats = useMemo(() => {
    if (!task || !config) return null;

    const events = task.events ?? [];
    const schedules = task.schedules ?? [];
    const totalDone = events.length;
    const streak = calculateStreak(events);
    const freqLabel = getFrequencyLabel(schedules, task.state.recurrence_pattern);

    return { totalDone, streak, freqLabel };
  }, [task, config]);

  const recurrenceDisplay = useMemo(() => {
    if (!task) return null;
    const pattern = task.state.recurrence_pattern ?? 'daily';
    if (pattern === 'daily') return 'Every Day';
    if (pattern === 'weekdays') return 'Weekdays';
    if (pattern === 'weekends') return 'Weekends';
    const days = task.state.recurrence_days;
    if (pattern === 'custom' && Array.isArray(days) && days.length > 0) {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days
        .map((d) => dayLabels[typeof d === 'number' ? d : NaN])
        .filter((d): d is string => typeof d === 'string')
        .join(', ') || 'Custom';
    }
    return 'Custom';
  }, [task]);

  if (loading) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme].background,
            paddingTop: insets.top,
          },
        ]}
      >
        <ThemedText style={styles.centerText}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (error || !task || !config || !stats) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme].background,
            paddingTop: insets.top,
          },
        ]}
      >
        <ThemedText style={styles.centerText}>
          {error?.message ?? 'Task not found'}
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: Colors[colorScheme].tint },
          ]}
        >
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(8, insets.top + 4),
            paddingBottom: Math.max(24, insets.bottom + 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backRow,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <IconSymbol
              name="chevron.left"
              size={20}
              color={Colors[colorScheme].text}
            />
            <ThemedText style={styles.backText}>Today</ThemedText>
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                router.push({ pathname: '/task/edit/[id]', params: { id: id as string } });
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={8}
            >
              <IconSymbol
                name="pencil"
                size={20}
                color={Colors[colorScheme].text}
              />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: hexToRgba('#FF3B30', 0.1) },
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={8}
            >
              <IconSymbol name="trash.fill" size={18} color="#FF3B30" />
            </Pressable>
          </View>
        </View>
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: isDark
                  ? hexToRgba(config.color, 0.18)
                  : config.bgColor,
              },
            ]}
          >
            <Text style={styles.heroEmoji}>{config.emoji}</Text>
          </View>

          <View style={styles.heroText}>
            <ThemedText type="title" style={styles.heroTitle}>
              {task.state.title}
            </ThemedText>

            <View style={styles.heroMeta}>
              <View
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isDark
                      ? hexToRgba(config.color, 0.13)
                      : config.lightColor,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.categoryPillText,
                    { color: config.color },
                  ]}
                >
                  {task.state.category
                    ? task.state.category.charAt(0).toUpperCase() +
                      task.state.category.slice(1)
                    : 'Task'}
                </ThemedText>
              </View>
              <ThemedText style={styles.freqLabel}>{stats.freqLabel}</ThemedText>
              {task.state.notifications_enabled === false ? (
                <View style={styles.mutedBell}>
                  <IconSymbol
                    name="bell.slash"
                    size={14}
                    color={Colors[colorScheme].muted}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {/* Streak */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: Colors[colorScheme].card,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            <Text style={styles.statIcon}>🔥</Text>
            <ThemedText style={styles.statValue}>{stats.streak}</ThemedText>
            <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
          </View>

          {/* Total Done */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: Colors[colorScheme].card,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            <IconSymbol
              name="checkmark.circle"
              size={20}
              color={config.color}
            />
            <ThemedText style={styles.statValue}>
              {stats.totalDone}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Total Done</ThemedText>
          </View>

          {/* Last Done */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: Colors[colorScheme].card,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            <IconSymbol
              name="clock"
              size={20}
              color={config.color}
            />
            <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {(task.events ?? []).length > 0
                ? formatRelativeDate(task.events[0].created_at)
                : 'Never'}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Last Done</ThemedText>
          </View>
        </View>

        {/* Notes */}
        {Boolean(task.state.notes) ? (
          <View
            style={[
              styles.notesCard,
              {
                backgroundColor: Colors[colorScheme].card,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            <ThemedText style={styles.notesLabel}>NOTES</ThemedText>
            <ThemedText style={styles.notesText}>
              {task.state.notes}
            </ThemedText>
          </View>
        ) : null}

        {/* Reminder Times */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>REMINDER TIMES</ThemedText>

          <View
            style={[
              styles.scheduleCard,
              {
                backgroundColor: Colors[colorScheme].card,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            {/* Recurrence pattern pill */}
            <View style={styles.recurrenceRow}>
              <IconSymbol
                name="calendar"
                size={16}
                color={Colors[colorScheme].text}
                style={{ opacity: 0.5 }}
              />
              <ThemedText style={styles.recurrenceText}>
                {recurrenceDisplay}
              </ThemedText>
            </View>

            {(task.schedules ?? []).length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No reminder times set.
              </ThemedText>
            ) : (
              <View style={styles.timesList}>
                {(task.schedules ?? []).map((s, idx) => (
                  <View
                    key={s.id ?? idx}
                    style={[
                      styles.timeRow,
                      idx < (task.schedules ?? []).length - 1
                        ? {
                            borderBottomWidth: 1,
                            borderBottomColor: Colors[colorScheme].cardBorder,
                          }
                        : null,
                    ]}
                  >
                    <View style={styles.timeLeft}>
                      <IconSymbol
                        name={s.enabled ? 'bell' : 'bell.slash'}
                        size={16}
                        color={
                          s.enabled
                            ? config.color
                            : Colors[colorScheme].muted
                        }
                      />
                      <ThemedText
                        style={[
                          styles.timeText,
                          !s.enabled
                            ? {
                                color: Colors[colorScheme].muted,
                                textDecorationLine: 'line-through',
                              }
                            : null,
                        ]}
                      >
                        {formatScheduleTime(s.reminder_time) ?? '--'}
                      </ThemedText>
                    </View>

                    <View style={styles.timeRight}>
                      {(s.notify_user_ids ?? []).length === 0 ? (
                        <ThemedText style={styles.noAssigneeText}>
                          No one assigned
                        </ThemedText>
                      ) : (
                        <View style={styles.avatarRow}>
                          {(s.notify_user_ids ?? []).map((userId, i, arr) => (
                            <View
                              key={userId ?? i}
                              style={[
                                styles.timeAvatar,
                                {
                                  backgroundColor: getAvatarColor(
                                    typeof userId === 'string' ? userId : ''
                                  ),
                                  borderColor: Colors[colorScheme].card,
                                  marginLeft: i > 0 ? -8 : 0,
                                  zIndex: arr.length - i,
                                },
                              ]}
                            >
                              <ThemedText style={styles.timeAvatarText}>
                                {typeof userId === 'string'
                                  ? userId.charAt(0).toUpperCase()
                                  : '?'}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>RECENT ACTIVITY</ThemedText>
          {(task.events ?? []).length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No completions yet. Be the first!
              </ThemedText>
            ) : (
              <View
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: Colors[colorScheme].card,
                    borderColor: Colors[colorScheme].cardBorder,
                  },
                ]}
              >
                {(task.events ?? []).map((e, idx) => {
                  const name =
                    e.profile?.display_name ??
                    (typeof e.completed_by === 'string' && e.completed_by.length > 0
                      ? e.completed_by
                      : 'Someone');
                  const initial = name.charAt(0).toUpperCase();
                  const avatarColor = getAvatarColor(name);

                  return (
                    <View
                      key={e.id ?? idx}
                      style={[
                        styles.activityRow,
                        idx < (task.events ?? []).length - 1
                          ? {
                              borderBottomWidth: 1,
                              borderBottomColor: Colors[colorScheme].cardBorder,
                            }
                          : null,
                      ]}
                    >
                    <View
                      style={[
                        styles.activityAvatar,
                        { backgroundColor: avatarColor },
                      ]}
                    >
                      <ThemedText style={styles.activityAvatarText}>
                        {initial}
                      </ThemedText>
                    </View>

                    <View style={styles.activityInfo}>
                      <ThemedText style={styles.activityName}>
                        {name}
                      </ThemedText>
                      <ThemedText style={styles.activityDate}>
                        {formatRelativeDate(e.created_at)}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.activityTime}>
                      {new Date(e.created_at).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Mark as Done */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(12, insets.bottom + 4),
            backgroundColor: Colors[colorScheme].background,
          },
        ]}
      >
        {!task.completedToday ? (
          <Pressable
            onPress={handleMarkDone}
            disabled={marking}
            style={({ pressed }) => [
              styles.markDoneBtn,
              { backgroundColor: config.color },
              pressed
                ? { opacity: 0.85, transform: [{ scale: 0.98 }] }
                : null,
              marking ? { opacity: 0.6 } : null,
            ]}
          >
            <IconSymbol name="checkmark" size={18} color="#fff" />
            <ThemedText style={styles.markDoneText}>
              {marking ? 'Marking…' : 'Mark as Done'}
            </ThemedText>
          </Pressable>
        ) : (
          <View
            style={[
              styles.completedBar,
              {
                backgroundColor:
                  hexToRgba(Colors[colorScheme].success, 0.1),
                borderColor: Colors[colorScheme].success,
              },
            ]}
          >
            <IconSymbol
              name="checkmark.seal.fill"
              size={20}
              color={Colors[colorScheme].success}
            />
            <ThemedText
              style={[
                styles.completedText,
                { color: Colors[colorScheme].success },
              ]}
            >
              Completed today
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 20,
  },
  centerText: {
    textAlign: 'center',
    marginTop: 120,
    fontSize: 16,
    opacity: 0.6,
  },
  backBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  freqLabel: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: '500',
  },
  mutedBell: {
    marginLeft: 4,
    opacity: 0.55,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.5,
    fontWeight: '500',
  },

  /* Notes */
  notesCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.45,
    letterSpacing: 0.6,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },

  /* Activity */
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.45,
    letterSpacing: 0.6,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.45,
    paddingVertical: 4,
  },
  activityCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: 13,
    opacity: 0.45,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.55,
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
  },
  markDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  markDoneText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  completedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  completedText: {
    fontSize: 17,
    fontWeight: '700',
  },

  /* Reminder Times */
  scheduleCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  recurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurrenceText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  timesList: {
    gap: 0,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAssigneeText: {
    fontSize: 13,
    opacity: 0.4,
    fontStyle: 'italic',
  },
  avatarRow: {
    flexDirection: 'row',
  },
  timeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  timeAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
