import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHouseholds } from '@/src/hooks/useHouseholds';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function HouseholdSetupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { createNewHousehold, loading } = useHouseholds();
  const [householdName, setHouseholdName] = useState('');
  const [yourName, setYourName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!householdName.trim() || !yourName.trim()) {
      setError('Please fill in both fields');
      return;
    }
    try {
      setError(null);
      await createNewHousehold(householdName.trim(), yourName.trim());
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Household creation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create household. Please try again.';
      setError(message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.header}>
          <IconSymbol name="house.fill" size={48} color={Colors[colorScheme].tint} />
          <ThemedText type="title">Welcome to HouseState</ThemedText>
          <ThemedText style={styles.subtitle}>
            Create your household to start tracking shared tasks.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Household Name
            </ThemedText>
            <TextInput
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g., The Smith Home"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, isDark && styles.inputDark]}
              autoCapitalize="words"
              returnKeyType="next"
              autoCorrect={false}
            />
          </ThemedView>

          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Your Name
            </ThemedText>
            <TextInput
              value={yourName}
              onChangeText={setYourName}
              placeholder="e.g., Parker"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, isDark && styles.inputDark]}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              autoCorrect={false}
            />
          </ThemedView>

          {error && (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          )}

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
              {loading ? 'Creating...' : 'Create Household'}
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 20,
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
