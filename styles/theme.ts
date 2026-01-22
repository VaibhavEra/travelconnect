// styles/theme.ts
/**
 * Centralized theme configuration for TravelConnect
 * All colors, spacing, typography, and design tokens in one place
 */

export const Colors = {
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
