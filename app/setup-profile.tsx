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
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

export default function SetupProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { setDisplayName, isLoading: authLoading } = useAuth();

  const [displayName, setDisplayNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await setDisplayName(trimmed);
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save name. Please try again.';
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.header}>
          <IconSymbol name="person.fill" size={48} color={Colors[colorScheme].tint} />
          <ThemedText type="title">Welcome!</ThemedText>
          <ThemedText style={styles.subtitle}>
            What should we call you? This name will appear when you complete tasks and in your household activity.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.field}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Your Name
            </ThemedText>
            <TextInput
              value={displayName}
              onChangeText={(text) => {
                setDisplayNameInput(text);
                if (error) setError(null);
              }}
              placeholder="e.g., Parker"
              placeholderTextColor={isDark ? '#555' : '#9BA1A6'}
              style={[styles.input, isDark && styles.inputDark]}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              autoCorrect={false}
              editable={!loading && !authLoading}
            />
          </ThemedView>

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <Pressable
            onPress={handleContinue}
            disabled={loading || authLoading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors[colorScheme].tint },
              pressed && !loading && !authLoading && { opacity: 0.8 },
              (loading || authLoading) && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {loading || authLoading ? 'Saving…' : 'Continue'}
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
