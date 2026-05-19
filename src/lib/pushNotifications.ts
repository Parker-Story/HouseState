import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HouseState Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = (Constants.expoConfig?.extra?.eas?.projectId ?? '') as string;
    if (!projectId) {
      console.warn('[Push] No EAS projectId found in app.json');
      return;
    }

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: tokenData })
      .eq('id', userId);

    if (error) console.warn('[Push] Failed to save push token:', error.message);
  } catch (err) {
    console.warn('[Push] Registration error:', err);
  }
}
