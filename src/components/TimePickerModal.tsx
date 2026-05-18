import { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TimePickerModalProps {
  visible: boolean;
  initialTime: string; // "HH:mm"
  onSelect: (time: string) => void;
  onCancel: () => void;
}

function parseTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const isPM = h >= 12;
  const hour12 = h % 12 || 12;
  return { hour: hour12, minute: m, period: isPM ? 'PM' : ('AM' as 'AM' | 'PM') };
}

function formatTime(hour: number, minute: number, period: 'AM' | 'PM') {
  let h24 = hour;
  if (period === 'PM' && hour !== 12) h24 += 12;
  if (period === 'AM' && hour === 12) h24 = 0;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePickerModal({
  visible,
  initialTime,
  onSelect,
  onCancel,
}: TimePickerModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const parsed = parseTime(initialTime || '08:00');
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  useEffect(() => {
    const p = parseTime(initialTime || '08:00');
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [initialTime, visible]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleDone = () => {
    onSelect(formatTime(hour, minute, period));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <ThemedView
          style={[
            styles.sheet,
            { backgroundColor: Colors[colorScheme].card },
          ]}
        >
          <ThemedView style={styles.header}>
            <Pressable onPress={onCancel} hitSlop={8}>
              <ThemedText
                style={[styles.headerBtn, { color: Colors[colorScheme].muted }]}
              >
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              Select Time
            </ThemedText>
            <Pressable onPress={handleDone} hitSlop={8}>
              <ThemedText
                style={[styles.headerBtn, { color: Colors[colorScheme].tint }]}
              >
                Done
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Time preview */}
          <ThemedView style={styles.previewRow}>
            <ThemedText type="title" style={styles.previewTime}>
              {hour}:{String(minute).padStart(2, '0')}
            </ThemedText>
            <ThemedText style={[styles.previewPeriod, { color: Colors[colorScheme].muted }]}>
              {period}
            </ThemedText>
          </ThemedView>

          {/* Hour picker */}
          <ThemedView style={styles.pickerSection}>
            <ThemedText
              style={[
                styles.pickerLabel,
                { color: Colors[colorScheme].muted },
              ]}
            >
              Hour
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {hours.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setHour(h)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        hour === h
                          ? Colors[colorScheme].tint
                          : isDark
                            ? Colors.dark.cardBorder
                            : Colors.light.cardBorder,
                      borderColor:
                        hour === h
                          ? Colors[colorScheme].tint
                          : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      {
                        color:
                          hour === h
                            ? '#fff'
                            : Colors[colorScheme].text,
                      },
                    ]}
                  >
                    {h}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Minute picker */}
          <ThemedView style={styles.pickerSection}>
            <ThemedText
              style={[
                styles.pickerLabel,
                { color: Colors[colorScheme].muted },
              ]}
            >
              Minute
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {minutes.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMinute(m)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        minute === m
                          ? Colors[colorScheme].tint
                          : isDark
                            ? Colors.dark.cardBorder
                            : Colors.light.cardBorder,
                      borderColor:
                        minute === m
                          ? Colors[colorScheme].tint
                          : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      {
                        color:
                          minute === m
                            ? '#fff'
                            : Colors[colorScheme].text,
                      },
                    ]}
                  >
                    {String(m).padStart(2, '0')}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>

          {/* AM / PM */}
          <ThemedView style={styles.periodRow}>
            {(['AM', 'PM'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.periodBtn,
                  {
                    backgroundColor:
                      period === p
                        ? Colors[colorScheme].tint
                        : isDark
                          ? Colors.dark.cardBorder
                          : Colors.light.cardBorder,
                    borderColor:
                      period === p
                        ? Colors[colorScheme].tint
                        : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.periodBtnText,
                    {
                      color:
                        period === p
                          ? '#fff'
                          : Colors[colorScheme].text,
                    },
                  ]}
                >
                  {p}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  headerTitle: {
    fontSize: 17,
  },
  headerBtn: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 55,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  previewTime: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '300',
  },
  previewPeriod: {
    fontSize: 20,
    fontWeight: '500',
  },
  pickerSection: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillRow: {
    gap: 8,
    paddingRight: 20,
  },
  pill: {
    height: 44,
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillText: {
    fontSize: 17,
    fontWeight: '500',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 4,
  },
  periodBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    maxWidth: 140,
  },
  periodBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
