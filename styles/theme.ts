import { useColorScheme } from "react-native";

/**
 * Centralized theme configuration for TravelConnect
 * Supports light and dark modes with automatic system detection
 */

// Light Mode Colors
export const LightColors = {
  // Primary palette
  primary: "#007AFF",
  primaryDark: "#0051D5",
  primaryLight: "#4DA2FF",

  // Secondary palette
  secondary: "#5856D6",
  secondaryDark: "#3634A3",
  secondaryLight: "#7D7AFF",

  // Semantic colors
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  info: "#007AFF",

  // Text colors
  text: {
    primary: "#000000",
    secondary: "#666666",
    tertiary: "#999999",
    placeholder: "#999999",
    inverse: "#FFFFFF",
  },

  // Background colors
  background: {
    primary: "#FFFFFF",
    secondary: "#F5F5F5",
    tertiary: "#F9F9F9",
    overlay: "rgba(0, 0, 0, 0.5)",
  },

  // Border colors
  border: {
    default: "#DDDDDD",
    light: "#EEEEEE",
    focus: "#007AFF",
    error: "#FF3B30",
  },

  // State colors
  disabled: "#CCCCCC",
  overlay: "rgba(0, 0, 0, 0.5)",
} as const;

// Dark Mode Colors
export const DarkColors = {
  // Primary palette (adjusted for dark backgrounds)
  primary: "#0A84FF",
  primaryDark: "#409CFF",
  primaryLight: "#006DD9",

  // Secondary palette
  secondary: "#5E5CE6",
  secondaryDark: "#7D7AFF",
  secondaryLight: "#4A48CC",

  // Semantic colors
  success: "#32D74B",
  error: "#FF453A",
  warning: "#FF9F0A",
  info: "#0A84FF",

  // Text colors
  text: {
    primary: "#FFFFFF",
    secondary: "#EBEBF5",
    tertiary: "#EBEBF599",
    placeholder: "#EBEBF560",
    inverse: "#000000",
  },

  // Background colors
  background: {
    primary: "#000000",
    secondary: "#1C1C1E",
    tertiary: "#2C2C2E",
    overlay: "rgba(0, 0, 0, 0.7)",
  },

  // Border colors
  border: {
    default: "#38383A",
    light: "#48484A",
    focus: "#0A84FF",
    error: "#FF453A",
  },

  // State colors
  disabled: "#48484A",
  overlay: "rgba(0, 0, 0, 0.7)",
} as const;

// Hook to get colors based on color scheme
export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? DarkColors : LightColors;
};

// Export light colors as default for backward compatibility
export const Colors = LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },
  weights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.lg,
  contentMaxWidth: 600,
  minTouchSize: 44,
} as const;

// styles/theme.ts
// ... (keep all existing code above)

// NEW: Opacity/Alpha values for consistent transparency
export const Opacity = {
  transparent: "00",
  subtle: "10",
  light: "15",
  medium: "30",
  strong: "40",
} as const;

// NEW: Helper function to add opacity to hex colors
export const withOpacity = (
  color: string,
  opacity: keyof typeof Opacity,
): string => {
  return color + Opacity[opacity];
};

// NEW: Modal overlay colors
export const Overlays = {
  light: "rgba(0, 0, 0, 0.5)",
  dark: "rgba(0, 0, 0, 0.7)",
  heavy: "rgba(0, 0, 0, 0.95)",
} as const;

// NEW: Animation configs for consistent motion
export const Animations = {
  spring: {
    gentle: { damping: 15, stiffness: 150 },
    default: { damping: 20, stiffness: 200 },
    bouncy: { damping: 12, stiffness: 180 },
  },
  timing: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  scale: {
    pressed: 0.97,
    card: 0.98,
  },
} as const;

// NEW: Common dimensions
export const Dimensions = {
  icons: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  avatars: {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  },
  touchTarget: {
    min: 44, // iOS minimum
    comfortable: 48,
  },
  slots: {
    dotSize: 12,
    dotRadius: 6,
    maxVisible: 5,
  },
} as const;
