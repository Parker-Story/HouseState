import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getHouseholdMembers } from '@/src/services/households';
import { createStateWithSchedules } from '@/src/services/states';
import { HouseholdMember, User } from '@/src/types/database';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function CreateTaskScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { householdId } = useLocalSearchParams<{ householdId: string }>();
  const [members, setMembers] = useState<(HouseholdMember & { user: User })[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    setMembersLoading(true);
    getHouseholdMembers(householdId)
      .then((data) => {
        setMembers(data as (HouseholdMember & { user: User })[]);
      })
      .catch(() => {
        setMembers([]);
      })
      .finally(() => {
        setMembersLoading(false);
      });
  }, [householdId]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [schedules, setSchedules] = useState<
    { id: string; time: string; selectedUserIds: string[] }[]
  >([{ id: '1', time: '08:00', selectedUserIds: [] }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), time: '18:00', selectedUserIds: [] },
    ]);
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const updateScheduleTime = (id: string, time: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, time } : s))
    );
  };

  const toggleUserForSchedule = (scheduleId: string, userId: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s;
        const selected = s.selectedUserIds.includes(userId)
          ? s.selectedUserIds.filter((id) => id !== userId)
          : [...s.selectedUserIds, userId];
        return { ...s, selectedUserIds: selected };
      })
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a task name');
      return;
    }
    if (!householdId) {
      setError('No household selected');
      return;
    }
    const invalidTimes = schedules.filter((s) => !TIME_REGEX.test(s.time));
    if (invalidTimes.length > 0) {
      setError('Please use HH:mm format for all times (e.g., 08:00)');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await createStateWithSchedules({
        householdId,
        title: title.trim(),
        category: category.trim() || null,
        schedules: schedules.map((s) => ({
          reminderTime: s.time,
          notifyUserIds: s.selectedUserIds,
        })),
      });
      router.back();
    } catch (err) {
      console.error('Task creation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create task. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.header}>
          <ThemedText type="title">New Task</ThemedText>
          <ThemedText style={styles.subtitle}>
            Create a recurring household task with reminder schedules.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
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

          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Category (optional)
            </ThemedText>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="e.g., Pets, Chores"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, isDark && styles.inputDark]}
              autoCapitalize="words"
              returnKeyType="done"
              autoCorrect={false}
            />
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Reminder Times
              </ThemedText>
              <Pressable onPress={addSchedule} hitSlop={8}>
                <IconSymbol name="plus.circle.fill" size={22} color={Colors[colorScheme].tint} />
              </Pressable>
            </ThemedView>

            {schedules.map((schedule) => (
              <ThemedView key={schedule.id} style={[styles.scheduleCard, isDark && styles.scheduleCardDark]}>
                <ThemedView style={styles.scheduleRow}>
                  <TextInput
                    value={schedule.time}
                    onChangeText={(text) => updateScheduleTime(schedule.id, text)}
                    placeholder="HH:mm"
                    placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
                    style={[styles.timeInput, isDark && styles.inputDark]}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Reminder time"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                  <Pressable
                    onPress={() => removeSchedule(schedule.id)}
                    hitSlop={8}
                    disabled={schedules.length === 1}
                  >                      <IconSymbol
                      name="minus.circle.fill"
                      size={22}
                      color={schedules.length === 1 ? Colors[colorScheme].muted : '#ff3b30'}
                    />
                  </Pressable>
                </ThemedView>

                {members.length > 0 && (
                  <ThemedView style={styles.membersRow}>
                    <ThemedText style={styles.membersLabel}>Notify:</ThemedText>
                    <View style={styles.memberChips}>
                      {members.map((m) => (
                        <Pressable
                          key={m.user.id}
                          onPress={() =>
                            toggleUserForSchedule(schedule.id, m.user.id)
                          }
                          style={[
                            styles.memberChip,
                            isDark && styles.memberChipDark,
                            schedule.selectedUserIds.includes(m.user.id) && {
                              backgroundColor: Colors[colorScheme].tint,
                              borderColor: Colors[colorScheme].tint,
                            },
                          ]}
                          accessibilityLabel={`${m.user.display_name} ${schedule.selectedUserIds.includes(m.user.id) ? 'selected' : 'not selected'} for notifications`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: schedule.selectedUserIds.includes(m.user.id) }}
                        >
                          <ThemedText
                            style={[
                              styles.memberChipText,
                              isDark && styles.memberChipTextDark,
                              schedule.selectedUserIds.includes(m.user.id) &&
                                styles.memberChipTextSelected,
                            ]}
                          >
                            {m.user.display_name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </ThemedView>
                )}
              </ThemedView>
            ))}
          </ThemedView>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <Pressable
            onPress={handleCreate}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors[colorScheme].tint },
              pressed && !loading && { opacity: 0.8 },
              loading && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? 'Creating...' : 'Create Task'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
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
    gap: 8,
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
  inputDark: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.cardBorder,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    padding: 16,
    gap: 12,
  },
  scheduleCardDark: {
    borderColor: Colors.dark.cardBorder,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    height: 44,
    width: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    textAlign: 'center',
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
