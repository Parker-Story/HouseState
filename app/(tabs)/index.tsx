import { StyleSheet, FlatList, RefreshControl, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
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

function HouseholdCard({
  household,
  onPress,
}: {
  household: Household;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.householdCard,
        { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#fff' },
        colorScheme !== 'dark' && styles.householdCardShadow,
        colorScheme === 'dark' && { borderWidth: 1, borderColor: '#2C2C2E' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityLabel={`Enter ${household.name}`}
      accessibilityRole="button"
    >
      <ThemedView
        style={[
          styles.householdIcon,
          { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' },
        ]}
      >
        <IconSymbol
          name="house.fill"
          size={28}
          color={Colors[colorScheme].tint}
        />
      </ThemedView>
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

  const { states, loading: statesLoading, error: statesError, refresh: refreshStates, markComplete } =
    useHouseholdStates(currentHouseholdId ?? undefined);

  const loading = householdLoading || statesLoading;
  const completedCount = states.filter((s) => s.completedToday).length;

  return (
    <ThemedView style={styles.container}>
      {/* === HOUSEHOLD LIST VIEW === */}
      {!currentHouseholdId && (
        <>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Your Households</ThemedText>
            <ThemedText style={styles.subtitle}>
              {households.length} {households.length === 1 ? 'household' : 'households'}
            </ThemedText>
          </ThemedView>

          {(householdError || statesError) && (
            <ThemedView style={styles.errorBanner}>
              <IconSymbol name="exclamationmark.triangle" size={16} color="#ff3b30" />
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
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  accessibilityLabel="Create household"
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.setupButtonText}>Create Household</ThemedText>
                </Pressable>
              </ThemedView>
            }
            contentContainerStyle={styles.listContent}
          />

          <Pressable
            onPress={() => router.push('/household-setup')}
            style={({ pressed }) => [
              styles.fab,
              { bottom: Math.max(16, insets.bottom + 8) },
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
          <ThemedView style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => selectHousehold(null)}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityLabel="Back to households"
                accessibilityRole="button"
              >
                <IconSymbol
                  name="chevron.left"
                  size={22}
                  color={Colors[colorScheme].tint}
                />
                <ThemedText style={[styles.backText, { color: Colors[colorScheme].tint }]}>
                  Households
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="title">HouseState</ThemedText>
            <ThemedText style={styles.subtitle}>
              {completedCount} of {states.length} done today
            </ThemedText>
          </ThemedView>

          {(householdError || statesError) && (
            <ThemedView style={styles.errorBanner}>
              <IconSymbol name="exclamationmark.triangle" size={16} color="#ff3b30" />
              <ThemedText style={styles.errorText}>
                {statesError?.message ?? householdError?.message}
              </ThemedText>
            </ThemedView>
          )}

          <FlatList
            data={states}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refreshStates}
                tintColor={Colors[colorScheme].tint}
              />
            }
            renderItem={({ item }) => (
              <StateCard state={item} onMarkComplete={markComplete} />
            )}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <IconSymbol
                  name="house.fill"
                  size={48}
                  color={Colors[colorScheme].icon}
                />
                <ThemedText style={styles.emptyTitle}>No tasks yet</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Tap the + button to add your first household task.
                </ThemedText>
              </ThemedView>
            }
            contentContainerStyle={styles.listContent}
          />

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/create-task',
                params: { householdId: currentHouseholdId },
              })
            }
            style={({ pressed }) => [
              styles.fab,
              { bottom: Math.max(16, insets.bottom + 8) },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
            accessibilityLabel="Add new task"
            accessibilityRole="button"
          >
            <IconSymbol name="plus" size={28} color="#fff" />
          </Pressable>
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
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginLeft: -8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
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
    backgroundColor: '#0a7ea4',
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
    borderRadius: 14,
  },
  householdCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
