import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  Text,
  Switch,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getHouseholdMembers } from '@/src/services/households';
import {
  updateState,
  updateSchedule,
  createSchedule,
  deleteSchedule,
} from '@/src/services/states';
import { HouseholdMember, Profile } from '@/src/types/database';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { TimePickerModal } from '@/src/components/TimePickerModal';
import {
  getCategoryConfig,
  AVAILABLE_CATEGORIES,
  formatScheduleTime,
  hexToRgba,
} from '@/src/utils/categoryConfig';
import { useTaskDetail } from '@/src/hooks/useTaskDetail';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type RecurrencePattern = 'daily' | 'weekdays' | 'weekends' | 'custom';

type ReminderTimeForm = {
  id: string;
  time: string;
  notifyUserIds: string[];
  enabled: boolean;
  originalUpdatedAt?: string;
};

/** Detect if an ID is a temporary local ID (not from Supabase) */
function isTempId(id: string) {
  return id.startsWith('tmp_');
}

function derivePatternFromDays(days: number[] | null): {
  pattern: RecurrencePattern;
  days: number[];
} {
  if (!days || days.length === 0 || days.length === 7) {
    return { pattern: 'daily', days: [] };
  }
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) {
    return { pattern: 'weekdays', days: [1, 2, 3, 4, 5] };
  }
  if (set.size === 2 && set.has(0) && set.has(6)) {
    return { pattern: 'weekends', days: [0, 6] };
  }
  return { pattern: 'custom', days: [...days].sort((a, b) => a - b) };
}

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { task, loading: taskLoading, refresh } = useTaskDetail(
    typeof id === 'string' ? id : undefined
  );

  const householdId = task?.state.household_id;
  const [members, setMembers] = useState<(HouseholdMember & { profile: Profile })[]>([]);

  useEffect(() => {
    if (!householdId) return;
    getHouseholdMembers(householdId)
      .then((data) => {
        setMembers(data as (HouseholdMember & { profile: Profile })[]);
      })
      .catch(() => setMembers([]));
  }, [householdId]);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [reminderTimes, setReminderTimes] = useState<ReminderTimeForm[]>([]);
  const [originalStateUpdatedAt, setOriginalStateUpdatedAt] = useState<string>('');

  // Populate form when task loads
  useEffect(() => {
    if (!task) return;
    setTitle(task.state.title);
    setCategory(task.state.category ?? '');
    setNotes(task.state.notes ?? '');
    setNotificationsEnabled(task.state.notifications_enabled ?? true);
    setOriginalStateUpdatedAt(task.state.updated_at);

    // Recurrence
    if (task.state.recurrence_pattern) {
      setRecurrencePattern(task.state.recurrence_pattern as RecurrencePattern);
      setRecurrenceDays(task.state.recurrence_days ?? []);
    } else {
      // Derive from first schedule
      const firstSchedule = task.schedules[0];
      const derived = derivePatternFromDays(firstSchedule?.days_of_week ?? null);
      setRecurrencePattern(derived.pattern);
      setRecurrenceDays(derived.days);
    }

    // Reminder times
    const mapped = task.schedules.map((s) => ({
      id: s.id,
      time: s.reminder_time,
      notifyUserIds: s.notify_user_ids ?? [],
      enabled: s.enabled ?? true,
      originalUpdatedAt: s.updated_at,
    }));
    setReminderTimes(mapped);
  }, [task]);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addReminderTime = () => {
    setReminderTimes((prev) => [
      ...prev,
      {
        id: `tmp_${Math.random().toString(36).slice(2)}`,
        time: '18:00',
        notifyUserIds: [],
        enabled: true,
      },
    ]);
  };

  const removeReminderTime = (timeId: string) => {
    setReminderTimes((prev) => prev.filter((t) => t.id !== timeId));
  };

  const openTimePicker = (timeId: string) => {
    setEditingTimeId(timeId);
    setTimePickerVisible(true);
  };

  const handleTimeSelect = (time: string) => {
    if (!editingTimeId) return;
    setReminderTimes((prev) =>
      prev.map((t) => (t.id === editingTimeId ? { ...t, time } : t))
    );
    setTimePickerVisible(false);
    setEditingTimeId(null);
  };

  const toggleRecurrencePattern = (pattern: RecurrencePattern) => {
    setRecurrencePattern(pattern);
    if (pattern === 'daily') setRecurrenceDays([]);
    else if (pattern === 'weekdays') setRecurrenceDays([1, 2, 3, 4, 5]);
    else if (pattern === 'weekends') setRecurrenceDays([0, 6]);
    // custom keeps existing days
  };

  const toggleDay = (dayIndex: number) => {
    setRecurrenceDays((prev) => {
      const hasDay = prev.includes(dayIndex);
      const next = hasDay
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b);
      return next;
    });
  };

  const toggleUserForTime = (timeId: string, userId: string) => {
    setReminderTimes((prev) =>
      prev.map((t) => {
        if (t.id !== timeId) return t;
        const selected = t.notifyUserIds.includes(userId)
          ? t.notifyUserIds.filter((id) => id !== userId)
          : [...t.notifyUserIds, userId];
        return { ...t, notifyUserIds: selected };
      })
    );
  };

  const toggleTimeEnabled = (timeId: string) => {
    setReminderTimes((prev) =>
      prev.map((t) =>
        t.id === timeId ? { ...t, enabled: !t.enabled } : t
      )
    );
  };

  const currentEditingTime =
    reminderTimes.find((t) => t.id === editingTimeId)?.time ?? '08:00';

  const handleSave = useCallback(async () => {
    if (!id || !task) return;
    if (!title.trim()) {
      setError('Please enter a task name');
      return;
    }
    if (recurrencePattern === 'custom' && recurrenceDays.length === 0) {
      setError('Please select at least one day for the custom pattern');
      return;
    }

    try {
      setError(null);
      setSaving(true);

      const daysOfWeek =
        recurrencePattern === 'daily'
          ? [0, 1, 2, 3, 4, 5, 6]
          : recurrencePattern === 'weekdays'
          ? [1, 2, 3, 4, 5]
          : recurrencePattern === 'weekends'
          ? [0, 6]
          : recurrenceDays.length > 0
          ? recurrenceDays
          : null;

      // Update state fields with optimistic locking
      await updateState(
        id,
        {
          title: title.trim(),
          category: category.trim() || null,
          notes: notes.trim() || null,
          recurrence_pattern: recurrencePattern,
          recurrence_days: recurrencePattern === 'custom' ? recurrenceDays : null,
          notifications_enabled: notificationsEnabled,
        },
        originalStateUpdatedAt
      );

      const currentIds = new Set(reminderTimes.map((t) => t.id));

      // Delete removed schedules
      for (const oldSchedule of task.schedules) {
        if (!currentIds.has(oldSchedule.id)) {
          await deleteSchedule(oldSchedule.id);
        }
      }

      // Update or create schedules
      for (const t of reminderTimes) {
        if (isTempId(t.id)) {
          await createSchedule(id, {
            reminderTime: t.time,
            daysOfWeek,
            notifyUserIds: t.notifyUserIds,
            enabled: t.enabled,
          });
        } else {
          await updateSchedule(
            t.id,
            {
              reminder_time: t.time,
              days_of_week: daysOfWeek,
              notify_user_ids: t.notifyUserIds,
              enabled: t.enabled,
            },
            t.originalUpdatedAt
          );
        }
      }

      await refresh();
      router.back();
    } catch (err) {
      console.error('Task update error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update task. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [
    id,
    task,
    title,
    category,
    notes,
    notificationsEnabled,
    recurrencePattern,
    recurrenceDays,
    reminderTimes,
    originalStateUpdatedAt,
    refresh,
    router,
  ]);

  if (taskLoading || !task) {
    return (
      <ThemedView
        style={[
          styles.container,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        <ThemedText style={styles.centerText}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  const recurrenceOptions: { key: RecurrencePattern; label: string }[] = [
    { key: 'daily', label: 'Every Day' },
    { key: 'weekdays', label: 'Weekdays' },
    { key: 'weekends', label: 'Weekends' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title">Edit Task</ThemedText>
          <ThemedText style={styles.subtitle}>
            Update details, schedules, and notifications for this task.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          {/* Task Name */}
          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Task Name
            </ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Feed the Dogs"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, isDark && styles.inputDark]}
              autoCapitalize="words"
              returnKeyType="next"
              autoCorrect={false}
            />
          </ThemedView>

          {/* Category Picker */}
          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Category
            </ThemedText>
            <View style={styles.categoryGrid}>
              {AVAILABLE_CATEGORIES.map((cat) => {
                const config = getCategoryConfig(cat.key);
                const isSelected = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() =>
                      setCategory(isSelected ? '' : cat.key)
                    }
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        backgroundColor: isDark
                          ? hexToRgba(config.color, 0.13)
                          : config.bgColor,
                        borderColor: isSelected
                          ? config.color
                          : 'transparent',
                      },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    ]}
                    accessibilityLabel={`${cat.label} category ${isSelected ? 'selected' : 'not selected'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.categoryEmoji}>
                      {config.emoji}
                    </Text>
                    <ThemedText
                      style={[
                        styles.categoryLabel,
                        isSelected && {
                          color: config.color,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {cat.label}
                    </ThemedText>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: config.color },
                        ]}
                      >
                        <IconSymbol
                          name="checkmark"
                          size={10}
                          color="#fff"
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          {/* Notes */}
          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Notes
            </ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add instructions, tips, or details…"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, styles.notesInput, isDark && styles.inputDark]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              autoCorrect
            />
          </ThemedView>

          {/* Push Notifications Toggle */}
          <ThemedView style={styles.toggleField}>
            <View style={styles.toggleRow}>
              <IconSymbol
                name="bell"
                size={20}
                color={Colors[colorScheme].text}
              />
              <View style={styles.toggleTextGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Push Notifications
                </ThemedText>
                <ThemedText style={styles.toggleSubLabel}>
                  {notificationsEnabled
                    ? 'Notify assigned members at reminder times'
                    : 'No push notifications for this task'}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: Colors[colorScheme].cardBorder,
                true: hexToRgba(Colors[colorScheme].tint, 0.5),
              }}
              thumbColor={
                notificationsEnabled
                  ? Colors[colorScheme].tint
                  : '#f4f3f4'
              }
            />
          </ThemedView>

          {/* Repeat Section */}
          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Repeat
            </ThemedText>
            <View style={styles.recurrenceGrid}>
              {recurrenceOptions.map((opt) => {
                const isSelected = recurrencePattern === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => toggleRecurrencePattern(opt.key)}
                    style={({ pressed }) => [
                      styles.recurrenceChip,
                      {
                        backgroundColor: isSelected
                          ? Colors[colorScheme].tint
                          : isDark
                            ? Colors.dark.card
                            : Colors.light.card,
                        borderColor: isSelected
                          ? Colors[colorScheme].tint
                          : Colors[colorScheme].cardBorder,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityLabel={`${opt.label} ${isSelected ? 'selected' : 'not selected'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <ThemedText
                      style={[
                        styles.recurrenceChipText,
                        {
                          color: isSelected ? '#fff' : Colors[colorScheme].text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom day selector */}
            {recurrencePattern === 'custom' && (
              <ThemedView style={styles.daysRow}>
                {DAY_LABELS.map((label, idx) => {
                  const active = recurrenceDays.includes(idx);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => toggleDay(idx)}
                      style={[
                        styles.dayChip,
                        {
                          borderColor: active
                            ? Colors[colorScheme].tint
                            : Colors[colorScheme].cardBorder,
                        },
                        active && {
                          backgroundColor: Colors[colorScheme].tint,
                        },
                      ]}
                      accessibilityLabel={`${label} ${active ? 'selected' : 'not selected'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <ThemedText
                        style={[
                          styles.dayChipText,
                          active && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            )}
          </ThemedView>

          {/* Reminder Times Section */}
          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Reminder Times
              </ThemedText>
              <Pressable onPress={addReminderTime} hitSlop={8}>
                <IconSymbol
                  name="plus.circle.fill"
                  size={22}
                  color={Colors[colorScheme].tint}
                />
              </Pressable>
            </ThemedView>

            {reminderTimes.map((timeItem) => (
              <ThemedView
                key={timeItem.id}
                style={[
                  styles.timeCard,
                  isDark && styles.timeCardDark,
                ]}
              >
                {/* Top row: time + enable toggle */}
                <View style={styles.timeCardTop}>
                  <Pressable
                    onPress={() => openTimePicker(timeItem.id)}
                    style={({ pressed }) => [
                      styles.timeBtn,
                      {
                        backgroundColor: isDark
                          ? Colors.dark.cardBorder
                          : Colors.light.cardBorder,
                        borderColor: isDark
                          ? Colors.dark.cardBorder
                          : Colors.light.cardBorder,
                      },
                      pressed && {
                        borderColor: Colors[colorScheme].tint,
                      },
                    ]}
                  >
                    <IconSymbol
                      name="clock"
                      size={18}
                      color={Colors[colorScheme].tint}
                    />
                    <ThemedText style={styles.timeBtnText}>
                      {formatScheduleTime(timeItem.time)}
                    </ThemedText>
                    <IconSymbol
                      name="chevron.right"
                      size={14}
                      color={Colors[colorScheme].muted}
                    />
                  </Pressable>

                  <View style={styles.toggleRowCompact}>
                    <ThemedText style={styles.toggleLabel}>
                      {timeItem.enabled ? 'On' : 'Off'}
                    </ThemedText>
                    <Switch
                      value={timeItem.enabled}
                      onValueChange={() => toggleTimeEnabled(timeItem.id)}
                      trackColor={{
                        false: Colors[colorScheme].cardBorder,
                        true: hexToRgba(Colors[colorScheme].tint, 0.5),
                      }}
                      thumbColor={
                        timeItem.enabled
                          ? Colors[colorScheme].tint
                          : '#f4f3f4'
                      }
                    />
                  </View>
                </View>

                {/* Notify members */}
                {members.length > 0 && (
                  <ThemedView style={styles.membersRow}>
                    <ThemedText style={styles.membersLabel}>
                      Notify:
                    </ThemedText>
                    <View style={styles.memberChips}>
                      {members.map((m) => (
                        <Pressable
                          key={m.user_id}
                          onPress={() =>
                            toggleUserForTime(timeItem.id, m.user_id)
                          }
                          style={[
                            styles.memberChip,
                            isDark && styles.memberChipDark,
                            timeItem.notifyUserIds.includes(m.user_id) && {
                              backgroundColor: Colors[colorScheme].tint,
                              borderColor: Colors[colorScheme].tint,
                            },
                          ]}
                          accessibilityLabel={`${m.profile.display_name} ${timeItem.notifyUserIds.includes(m.user_id) ? 'selected' : 'not selected'} for notifications`}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: timeItem.notifyUserIds.includes(m.user_id),
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.memberChipText,
                              isDark && styles.memberChipTextDark,
                              timeItem.notifyUserIds.includes(m.user_id) &&
                                styles.memberChipTextSelected,
                            ]}
                          >
                            {m.profile.display_name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </ThemedView>
                )}

                {/* Remove time */}
                {reminderTimes.length > 1 && (
                  <Pressable
                    onPress={() => removeReminderTime(timeItem.id)}
                    style={({ pressed }) => [
                      styles.removeTimeBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol
                      name="trash.fill"
                      size={14}
                      color="#ff3b30"
                    />
                    <ThemedText style={styles.removeTimeText}>
                      Remove time
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            ))}
          </ThemedView>

          {error && (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors[colorScheme].tint },
              pressed && !saving && { opacity: 0.8 },
              saving && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {saving ? 'Saving…' : 'Save Changes'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>

      <TimePickerModal
        visible={timePickerVisible}
        initialTime={currentEditingTime}
        onSelect={handleTimeSelect}
        onCancel={() => {
          setTimePickerVisible(false);
          setEditingTimeId(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  centerText: {
    textAlign: 'center',
    marginTop: 120,
    fontSize: 16,
    opacity: 0.6,
  },
  header: {
    gap: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  notesInput: {
    height: 88,
    paddingTop: 14,
    paddingBottom: 14,
  },
  inputDark: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.cardBorder,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    minWidth: 90,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  toggleField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextGroup: {
    gap: 2,
  },
  toggleSubLabel: {
    fontSize: 13,
    opacity: 0.5,
  },

  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurrenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurrenceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
  },
  recurrenceChipText: {
    fontSize: 14,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  timeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    padding: 16,
    gap: 14,
    backgroundColor: Colors.light.card,
  },
  timeCardDark: {
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  timeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  membersRow: {
    gap: 8,
  },
  membersLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  memberChipDark: {
    borderColor: Colors.dark.cardBorder,
  },
  memberChipText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  memberChipTextDark: {
    color: Colors.dark.text,
  },
  memberChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  removeTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  removeTimeText: {
    fontSize: 13,
    color: '#ff3b30',
    fontWeight: '500',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
