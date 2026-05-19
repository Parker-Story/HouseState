import { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ICONS = ['🏠', '🏡', '🏘️', '🏢', '🏰', '⛺', '🏕️', '🏖️'];
const COLORS = ['#D4A03A', '#5BB5B0', '#A78BFA', '#7A9E7E', '#E07B5E', '#C9748A'];

interface NewHouseholdModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string, color: string) => Promise<void>;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
  title?: string;
  submitLabel?: string;
}

function iconBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

export function NewHouseholdModal({
  visible,
  onClose,
  onCreate,
  initialName,
  initialIcon,
  initialColor,
  title = 'New Household',
  submitLabel = 'Create',
}: NewHouseholdModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const [name, setName] = useState(initialName ?? '');
  const [icon, setIcon] = useState(initialIcon ?? '🏠');
  const [color, setColor] = useState(initialColor ?? '#D4A03A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName ?? '');
      setIcon(initialIcon ?? '🏠');
      setColor(initialColor ?? '#D4A03A');
      setError(null);
    }
  }, [visible, initialName, initialIcon, initialColor]);

  const reset = () => {
    setName(initialName ?? '');
    setIcon(initialIcon ?? '🏠');
    setColor(initialColor ?? '#D4A03A');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a household name');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onCreate(name.trim(), icon, color);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <ThemedView
          style={[styles.sheet, { backgroundColor: Colors[colorScheme].card }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <ThemedView style={[styles.header, { borderBottomColor: Colors[colorScheme].cardBorder }]}>
            <Pressable onPress={handleClose} hitSlop={8}>
              <ThemedText style={[styles.headerBtn, { color: Colors[colorScheme].muted }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              {title}
            </ThemedText>
            <Pressable onPress={handleCreate} disabled={loading} hitSlop={8}>
              <ThemedText
                style={[
                  styles.headerBtn,
                  { color: Colors[colorScheme].amber },
                  loading && { opacity: 0.4 },
                ]}
              >
                {loading ? '…' : submitLabel}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Name input with icon preview */}
          <View
            style={[
              styles.nameRow,
              {
                backgroundColor: Colors[colorScheme].background,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
          >
            <View style={[styles.nameIconBg, { backgroundColor: iconBg(color) }]}>
              <Text style={styles.nameIconEmoji}>{icon}</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError(null);
              }}
              placeholder="Household name..."
              placeholderTextColor={Colors[colorScheme].muted}
              style={[styles.nameInput, { color: Colors[colorScheme].text }]}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          {/* Icon picker */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: Colors[colorScheme].muted }]}>
              ICON
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconRow}
            >
              {ICONS.map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setIcon(i)}
                  style={[
                    styles.iconPill,
                    { backgroundColor: iconBg(color) },
                    icon === i && { borderColor: color, borderWidth: 2.5 },
                  ]}
                >
                  <Text style={styles.iconEmoji}>{i}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Color picker */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: Colors[colorScheme].muted }]}>
              COLOR
            </ThemedText>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <View
                  key={c}
                  style={[
                    styles.colorRing,
                    color === c && { borderColor: c },
                  ]}
                >
                  <Pressable
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }]}
                  />
                </View>
              ))}
            </View>
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
    paddingBottom: 48,
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
  },
  headerBtn: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nameIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameIconEmoji: {
    fontSize: 26,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  iconRow: {
    gap: 10,
    paddingRight: 4,
  },
  iconPill: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  iconEmoji: {
    fontSize: 28,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
