import { useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StateCard } from '@/src/components/StateCard';
import { useHouseholdStates } from '@/src/hooks/useHouseholdStates';
import { useHouseholds } from '@/src/hooks/useHouseholds';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Household } from '@/src/types/database';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function formatHeaderDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function HouseholdCard({
  household,
  onPress,
}: {
  household: Household;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.householdCard,
        {
          backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
          borderColor: isDark ? Colors.dark.cardBorder : Colors.light.cardBorder,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityLabel={`Enter ${household.name}`}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.householdIcon,
          {
            backgroundColor: isDark
              ? Colors.dark.cardBorder
              : Colors.light.cardBorder,
          },
        ]}
      >
        <IconSymbol
          name="house.fill"
          size={28}
          color={Colors[colorScheme].tint}
        />
      </View>
      <View style={styles.householdText}>
        <ThemedText type="defaultSemiBold">{household.name}</ThemedText>
        <ThemedText style={styles.householdDate}>
          Created {new Date(household.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
      <IconSymbol
        name="chevron.right"
        size={20}
        color={Colors[colorScheme].icon}
      />
    </Pressable>
  );
}

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const progress = total > 0 ? completed / total : 0;
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextRow}>
        <ThemedText style={styles.progressLabel}>
          {completed} of {total} completed
        </ThemedText>
        <ThemedText style={[styles.progressPercent, { color: Colors[colorScheme].tint }]}>
          {percent}%
        </ThemedText>
      </View>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: Colors[colorScheme].track },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: Colors[colorScheme].amber,
            },
          ]}
        />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  return (
    <ThemedText
      style={[
        styles.sectionHeader,
        { color: Colors[colorScheme].muted },
      ]}
      accessibilityRole="header"
    >
      {title}
    </ThemedText>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const {
    households,
    currentHouseholdId,
    selectHousehold,
    loading: householdLoading,
    error: householdError,
    refresh: refreshHouseholds,
  } = useHouseholds();

  const {
    states,
    loading: statesLoading,
    error: statesError,
    refresh: refreshStates,
    markComplete,
  } = useHouseholdStates(currentHouseholdId ?? undefined);

  // Auto-refresh when this screen regains focus (e.g., after creating/editing/deleting a task)
  useFocusEffect(
    useCallback(() => {
      refreshStates();
      refreshHouseholds();
    }, [refreshStates, refreshHouseholds])
  );

  const loading = householdLoading || statesLoading;
  const completedCount = states.filter((s) => s.completedToday).length;
  const totalCount = states.length;

  const attentionStates = states.filter((s) => !s.completedToday);
  const completedStates = states.filter((s) => s.completedToday);

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* === HOUSEHOLD LIST VIEW === */}
      {!currentHouseholdId && (
        <>
          <ThemedView style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
            <ThemedText style={styles.greetingDate}>
              {formatHeaderDate(new Date())}
            </ThemedText>
            <View style={styles.greetingRow}>
              <ThemedText type="title" style={styles.greetingTitle}>
                {getGreeting()}
              </ThemedText>
              <IconSymbol
                name="sparkles"
                size={20}
                color={Colors[colorScheme].tint}
              />
            </View>
          </ThemedView>

          {(householdError || statesError) && (
            <ThemedView style={styles.errorBanner}>
              <IconSymbol
                name="exclamationmark.triangle"
                size={16}
                color="#ff3b30"
              />
              <ThemedText style={styles.errorText}>
                {householdError?.message ?? statesError?.message}
              </ThemedText>
            </ThemedView>
          )}

          <FlatList
            data={households}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={householdLoading}
                onRefresh={refreshHouseholds}
                tintColor={Colors[colorScheme].tint}
              />
            }
            renderItem={({ item }) => (
              <HouseholdCard
                household={item}
                onPress={() => selectHousehold(item.id)}
              />
            )}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <IconSymbol
                  name="house.fill"
                  size={48}
                  color={Colors[colorScheme].icon}
                />
                <ThemedText style={styles.emptyTitle}>
                  No households yet
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Create your first household to start tracking tasks together.
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/household-setup')}
                  style={({ pressed }) => [
                    styles.setupButton,
                    {
                      backgroundColor: Colors[colorScheme].tint,
                    },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  accessibilityLabel="Create household"
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.setupButtonText}>
                    Create Household
                  </ThemedText>
                </Pressable>
              </ThemedView>
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(32, insets.bottom + 16) },
            ]}
          />

          <Pressable
            onPress={() => router.push('/household-setup')}
            style={({ pressed }) => [
              styles.fab,
              { bottom: Math.max(16, insets.bottom + 8) },
              { backgroundColor: Colors[colorScheme].tint },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
            accessibilityLabel="Create new household"
            accessibilityRole="button"
          >
            <IconSymbol name="plus" size={28} color="#fff" />
          </Pressable>
        </>
      )}

      {/* === DASHBOARD VIEW (inside a household) === */}
      {currentHouseholdId && (
        <>
          <ThemedView style={[styles.header, { paddingTop: Math.max(16, insets.top + 8) }]}>
            <Pressable
              onPress={() => selectHousehold(null)}
              style={({ pressed }) => [
                styles.backToHouseholds,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <IconSymbol
                name="chevron.left"
                size={14}
                color={Colors[colorScheme].tint}
              />
              <ThemedText style={[styles.backToHouseholdsText, { color: Colors[colorScheme].tint }]}>
                Households
              </ThemedText>
            </Pressable>
            <ThemedText style={styles.greetingDate}>
              {formatHeaderDate(new Date())}
            </ThemedText>
            <View style={styles.greetingRow}>
              <ThemedText type="title" style={styles.greetingTitle}>
                {getGreeting()}
              </ThemedText>
              <IconSymbol
                name="sparkles"
                size={20}
                color={Colors[colorScheme].tint}
              />
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/create-task',
                    params: { householdId: currentHouseholdId },
                  })
                }
                style={({ pressed }) => [
                  styles.headerAddBtn,
                  {
                    backgroundColor: Colors[colorScheme].amber,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.92 }] },
                ]}
                accessibilityLabel="Add new task"
                accessibilityRole="button"
              >
                <IconSymbol name="plus" size={22} color="#fff" />
              </Pressable>
            </View>
            <ProgressBar completed={completedCount} total={totalCount} />
          </ThemedView>

          {(householdError || statesError) && (
            <ThemedView style={styles.errorBanner}>
              <IconSymbol
                name="exclamationmark.triangle"
                size={16}
                color="#ff3b30"
              />
              <ThemedText style={styles.errorText}>
                {statesError?.message ?? householdError?.message}
              </ThemedText>
            </ThemedView>
          )}

          <FlatList
            data={[...attentionStates, ...completedStates]}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refreshStates}
                tintColor={Colors[colorScheme].tint}
              />
            }
            renderItem={({ item, index }) => {
              const isFirstCompleted =
                index === attentionStates.length && completedStates.length > 0;
              return (
                <View>
                  {index === 0 && attentionStates.length > 0 && (
                    <SectionHeader title="NEEDS ATTENTION" />
                  )}
                  {isFirstCompleted && (
                    <SectionHeader title="COMPLETED TODAY" />
                  )}
                  <StateCard
                    state={item}
                    onMarkComplete={markComplete}
                    onPress={(id) =>
                      router.push({
                        pathname: '/task/[id]',
                        params: { id },
                      })
                    }
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <IconSymbol
                  name="sparkles"
                  size={48}
                  color={Colors[colorScheme].icon}
                />
                <ThemedText style={styles.emptyTitle}>No tasks yet</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Tap the + button to add your first household task.
                </ThemedText>
              </ThemedView>
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(32, insets.bottom + 16) },
            ]}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 6,
  },
  backToHouseholds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  backToHouseholdsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  greetingDate: {
    fontSize: 14,
    opacity: 0.55,
    marginBottom: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    marginTop: 12,
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 8,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 120,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ff3b3015',
  },
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
  },
  setupButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  householdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  householdIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  householdText: {
    flex: 1,
    gap: 2,
  },
  householdDate: {
    fontSize: 13,
    opacity: 0.5,
  },
});
