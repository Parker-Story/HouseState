import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

  const busy = loading || authLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? Colors.dark.cardBorder : `rgba(212,160,58,0.15)` },
            ]}
          >
            <Text style={styles.iconEmoji}>🏠</Text>
          </View>
          <ThemedText style={[styles.appLabel, { color: Colors[colorScheme].muted }]}>
            HouseState
          </ThemedText>
          <ThemedText type="title" style={styles.heading}>
            Welcome!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: Colors[colorScheme].muted }]}>
            What should we call you? Your name appears when you complete tasks and in household activity.
          </ThemedText>
        </View>

        {/* Form card */}
        <ThemedView
          style={[
            styles.card,
            {
              backgroundColor: Colors[colorScheme].card,
              borderColor: Colors[colorScheme].cardBorder,
            },
          ]}
        >
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
            style={[
              styles.input,
              {
                color: Colors[colorScheme].text,
                backgroundColor: Colors[colorScheme].background,
                borderColor: Colors[colorScheme].cardBorder,
              },
            ]}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            autoCorrect={false}
            editable={!busy}
          />

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <Pressable
            onPress={handleContinue}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: Colors[colorScheme].amber },
              pressed && !busy && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              busy && { opacity: 0.5 },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {busy ? 'Saving…' : 'Continue'}
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
    gap: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconEmoji: {
    fontSize: 52,
  },
  appLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  label: {
    fontSize: 15,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
