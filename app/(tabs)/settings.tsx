import { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useHouseholds } from '@/src/hooks/useHouseholds';
import { useAuth } from '@/src/hooks/useAuth';
import { NewHouseholdModal } from '@/src/components/NewHouseholdModal';
import {
  updateHousehold,
  updateHouseholdDetails,
  deleteHousehold,
} from '@/src/services/households';

function SectionHeader({ title }: { title: string }) {
  return <ThemedText style={styles.sectionHeader}>{title}</ThemedText>;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: Colors[colorScheme].card,
          borderColor: Colors[colorScheme].cardBorder,
          opacity: pressed && onPress ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: destructive
              ? hexToRgba('#FF3B30', 0.1)
              : hexToRgba(Colors[colorScheme].tint, 0.12),
          },
        ]}
      >
        <IconSymbol
          name={icon as any}
          size={20}
          color={destructive ? '#FF3B30' : Colors[colorScheme].tint}
        />
      </View>
      <View style={styles.rowText}>
        <ThemedText
          style={[
            styles.rowLabel,
            destructive && { color: '#FF3B30' },
          ]}
        >
          {label}
        </ThemedText>
        {value !== undefined && value.length > 0 && (
          <ThemedText style={styles.rowValue}>{value}</ThemedText>
        )}
      </View>
      {onPress && (
        <IconSymbol
          name="chevron.right"
          size={16}
          color={Colors[colorScheme].muted}
        />
      )}
    </Pressable>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { profile, signOut } = useAuth();
  const {
    households,
    currentHouseholdId,
    selectHousehold,
    refresh,
    createNewHousehold: createHouseholdViaHook,
  } = useHouseholds();

  const currentHousehold = households.find(
    (h) => h.id === currentHouseholdId
  );

  const [loading, setLoading] = useState(false);
  const [showAddHousehold, setShowAddHousehold] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<typeof households[0] | null>(null);

  const handleEditHousehold = useCallback(async (name: string, icon: string, color: string) => {
    if (!editingHousehold) return;
    await updateHouseholdDetails(editingHousehold.id, { name, icon, color });
    await refresh();
  }, [editingHousehold, refresh]);

  const handleDeleteHousehold = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Household?',
        `This will permanently remove "${name}" and all its tasks and history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                await deleteHousehold(id);
                if (currentHouseholdId === id) {
                  selectHousehold(null);
                }
                await refresh();
              } catch {
                Alert.alert('Error', 'Failed to delete household.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [currentHouseholdId, selectHousehold, refresh]
  );

  const handleCreateHousehold = useCallback(async (name: string, icon: string, color: string) => {
    await createHouseholdViaHook(name, icon, color);
  }, [createHouseholdViaHook]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out?',
      'This will sign you out and erase your local session. Your data remains in the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              Alert.alert('Error', 'Failed to sign out.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  const displayName = profile?.display_name ?? 'You';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(16, insets.top + 8),
            paddingBottom: Math.max(32, insets.bottom + 16),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={styles.pageTitle}>
          Settings
        </ThemedText>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.card}>
          <SettingRow
            icon="person.fill"
            label="Display Name"
            value={displayName}
          />
        </View>

        {/* Households */}
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="HOUSEHOLDS" />
          <Pressable
            onPress={() => setShowAddHousehold((s) => !s)}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <IconSymbol
              name="plus.circle.fill"
              size={22}
              color={Colors[colorScheme].tint}
            />
          </Pressable>
        </View>

        <NewHouseholdModal
          visible={showAddHousehold}
          onClose={() => setShowAddHousehold(false)}
          onCreate={handleCreateHousehold}
        />

        <NewHouseholdModal
          visible={editingHousehold !== null}
          onClose={() => setEditingHousehold(null)}
          onCreate={handleEditHousehold}
          initialName={editingHousehold?.name}
          initialIcon={editingHousehold?.icon ?? undefined}
          initialColor={editingHousehold?.color ?? undefined}
          title="Edit Household"
          submitLabel="Save"
        />

        <View style={styles.card}>
          {households.map((h, idx) => {
            const isSelected = currentHouseholdId === h.id;
            return (
              <View
                key={h.id}
                style={[
                  styles.householdRow,
                  idx < households.length - 1
                    ? {
                        borderBottomWidth: 1,
                        borderBottomColor: Colors[colorScheme].cardBorder,
                      }
                    : undefined,
                ]}
              >
                  <>
                    <Pressable
                      onPress={() => selectHousehold(h.id)}
                      style={({ pressed }) => [
                        styles.householdMain,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View
                        style={[
                          styles.householdDot,
                          {
                            backgroundColor: isSelected
                              ? Colors[colorScheme].tint
                              : Colors[colorScheme].cardBorder,
                          },
                        ]}
                      />
                      <View style={styles.householdText}>
                        <ThemedText style={styles.householdName}>
                          {h.name}
                        </ThemedText>
                        <ThemedText style={styles.householdDate}>
                          Created{' '}
                          {new Date(h.created_at).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <IconSymbol
                          name="checkmark"
                          size={16}
                          color={Colors[colorScheme].success}
                        />
                      )}
                    </Pressable>

                    <View style={styles.householdActions}>
                      <Pressable
                        onPress={() => setEditingHousehold(h)}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        hitSlop={6}
                      >
                        <IconSymbol
                          name="pencil"
                          size={16}
                          color={Colors[colorScheme].muted}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleDeleteHousehold(h.id, h.name)
                        }
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        hitSlop={6}
                      >
                        <IconSymbol
                          name="trash.fill"
                          size={16}
                          color="#FF3B30"
                        />
                      </Pressable>
                    </View>
                  </>
              </View>
            );
          })}

          {households.length === 0 && (
            <ThemedText style={styles.emptyText}>
              No households yet. Tap + above to create one.
            </ThemedText>
          )}
        </View>

        {/* Invite Code */}
        {currentHousehold?.invite_code && (
          <>
            <SectionHeader title="INVITE" />
            <View style={styles.card}>
              <Pressable
                onPress={() => {
                  if (!currentHousehold.invite_code) return;
                  // In a real app, use Clipboard.setStringAsync
                  Alert.alert(
                    'Invite Code',
                    `Share this code with others to join "${currentHousehold.name}":\n\n${currentHousehold.invite_code}`
                  );
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: Colors[colorScheme].card,
                    borderColor: Colors[colorScheme].cardBorder,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    {
                      backgroundColor: hexToRgba(
                        Colors[colorScheme].tint,
                        0.12
                      ),
                    },
                  ]}
                >
                  <IconSymbol
                    name="person.badge.plus"
                    size={20}
                    color={Colors[colorScheme].tint}
                  />
                </View>
                <View style={styles.rowText}>
                  <ThemedText style={styles.rowLabel}>
                    Invite Code
                  </ThemedText>
                  <ThemedText style={[styles.rowValue, styles.inviteCodeValue]}>
                    {currentHousehold.invite_code}
                  </ThemedText>
                </View>
                <IconSymbol
                  name="doc.on.doc"
                  size={16}
                  color={Colors[colorScheme].muted}
                />
              </Pressable>
            </View>
          </>
        )}

        {/* Sign Out */}
        <SectionHeader title="SESSION" />
        <View style={styles.card}>
          <SettingRow
            icon="arrow.right.square"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          <SettingRow icon="sparkles" label="Version" value="1.0.0" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.45,
    letterSpacing: 0.8,
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    marginTop: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    opacity: 0.5,
  },
  inviteCodeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    opacity: 0.85,
    letterSpacing: 1,
  },
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 4,
  },
  addCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  addInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  addInputDark: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.cardBorder,
  },
  hintText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: -4,
  },
  addActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  addActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  householdMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  householdDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  householdText: {
    flex: 1,
    gap: 2,
  },
  householdName: {
    fontSize: 15,
    fontWeight: '600',
  },
  householdDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  householdActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  editInputDark: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.cardBorder,
  },
  editAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
