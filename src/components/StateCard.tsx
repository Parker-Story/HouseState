import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StateWithStatus } from '@/src/hooks/useHouseholdStates';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface StateCardProps {
  state: StateWithStatus;
  onMarkComplete: (stateId: string) => void;
}

export function StateCard({ state, onMarkComplete }: StateCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const tint = Colors[colorScheme].tint;

  return (
    <ThemedView style={[styles.card, state.completedToday && styles.cardCompleted]}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.textContainer}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {state.title}
          </ThemedText>
          {state.category && (
            <ThemedText style={styles.category}>{state.category}</ThemedText>
          )}
          {state.completedToday && state.latestEvent && (
            <ThemedText style={styles.completedText}>
              Done by {state.latestEvent.completed_by ?? 'someone'} at{' '}
              {new Date(state.latestEvent.created_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </ThemedText>
          )}
        </ThemedView>

        {!state.completedToday ? (
          <Pressable
            onPress={() => onMarkComplete(state.id)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tint },
              pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
            ]}
            hitSlop={16}
            accessibilityLabel={`Mark ${state.title} complete`}
            accessibilityRole="button"
            accessibilityHint="Double tap to confirm this task is done"
          >
            <IconSymbol name="checkmark" size={20} color="#fff" />
          </Pressable>
        ) : (
          <ThemedView
            style={[styles.checkCircle, { borderColor: tint }]}
            accessibilityLabel={`${state.title} is complete`}
            accessibilityRole="text"
          >
            <IconSymbol name="checkmark" size={18} color={tint} />
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
  },
  category: {
    fontSize: 13,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  completedText: {
    fontSize: 13,
    opacity: 0.5,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
