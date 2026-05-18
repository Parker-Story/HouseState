import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { getRecentActivityForUser } from '@/src/services/states';
import { getCategoryConfig, formatRelativeDate } from '@/src/utils/categoryConfig';
import type { StateEvent } from '@/src/types/database';

type ActivityItem = {
  event: StateEvent;
  stateTitle: string;
  stateCategory: string | null;
};

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const { profile } = useAuth();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await getRecentActivityForUser(50);
      setItems(data);
    } catch (err) {
      console.error('Activity fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivity();
  }, [fetchActivity]);

  const displayName = profile?.display_name ?? 'You';

  return (
    <View
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedText type="title" style={styles.pageTitle}>
          Activity
        </ThemedText>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors[colorScheme].tint}
            style={styles.spinner}
          />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              name="checkmark.circle"
              size={48}
              color={Colors[colorScheme].muted}
            />
            <ThemedText style={styles.emptyTitle}>
              No activity yet
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Complete tasks to see them here.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item, idx) => {
              const config = item.stateCategory
                ? getCategoryConfig(item.stateCategory)
                : null;
              const isYou =
                (item.event.profile?.display_name ?? item.event.completed_by) === displayName;
              const name =
                item.event.profile?.display_name ??
                item.event.completed_by ??
                'Someone';
              const initial = name.charAt(0).toUpperCase();

              return (
                <View
                  key={item.event.id ?? idx}
                  style={[
                    styles.row,
                    {
                      backgroundColor: Colors[colorScheme].card,
                      borderColor: Colors[colorScheme].cardBorder,
                    },
                    idx < items.length - 1 && {
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          config?.color ?? Colors[colorScheme].tint,
                      },
                    ]}
                  >
                    <ThemedText style={styles.avatarText}>
                      {initial}
                    </ThemedText>
                  </View>

                  <View style={styles.info}>
                    <ThemedText style={styles.name}>
                      {name}
                      {isYou && (
                        <ThemedText style={styles.youBadge}>
                          {' '}
                          (You)
                        </ThemedText>
                      )}
                    </ThemedText>
                    <ThemedText style={styles.action}>
                      completed{' '}
                      <ThemedText style={styles.taskName}>
                        {item.stateTitle}
                      </ThemedText>
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.time}>
                    {formatRelativeDate(item.event.created_at)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
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
  spinner: {
    marginTop: 80,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.45,
  },
  list: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  youBadge: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.5,
  },
  action: {
    fontSize: 14,
    opacity: 0.6,
  },
  taskName: {
    fontWeight: '700',
    opacity: 1,
  },
  time: {
    fontSize: 13,
    opacity: 0.4,
  },
});
