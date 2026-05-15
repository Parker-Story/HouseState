/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#5C5548';
const tintColorDark = '#B8B0A4';

export const Colors = {
  light: {
    text: '#2D2D2D',
    background: '#F7F3EE',
    tint: tintColorLight,
    icon: '#9C958C',
    tabIconDefault: '#9C958C',
    tabIconSelected: tintColorLight,
    card: '#FBF7F1',
    cardBorder: '#E8E2D6',
    success: '#7A9E7E',
    purple: '#A78BFA',
    green: '#7A9E7E',
    amber: '#D4A03A',
    muted: '#9C958C',
    track: '#C5BDB0',
  },
  dark: {
    text: '#F5F5F4',
    background: '#1C1917',
    tint: tintColorDark,
    icon: '#A8A29E',
    tabIconDefault: '#A8A29E',
    tabIconSelected: tintColorDark,
    card: '#292524',
    cardBorder: '#44403C',
    success: '#8FB996',
    purple: '#B794F6',
    green: '#8FB996',
    amber: '#E8C466',
    muted: '#A8A29E',
    track: '#44403C',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
