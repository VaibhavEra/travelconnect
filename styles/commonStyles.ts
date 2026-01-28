// styles/commonStyles.ts
import { StyleSheet } from "react-native";
import {
  BorderRadius,
  Layout,
  Shadows,
  Spacing,
  Typography,
  useThemeColors,
} from "./theme";

/**
 * Factory function that creates theme-aware common styles
 * This allows styles to respond to dark/light mode changes
 */
export const createCommonStyles = (
  colors: ReturnType<typeof useThemeColors>,
) => {
  return StyleSheet.create({
    // LAYOUT
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },

    contentContainer: {
      flex: 1,
      padding: Layout.screenPadding,
    },

    scrollContent: {
      flexGrow: 1,
    },

    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
    },

    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    // CARDS & SURFACES
    card: {
      backgroundColor: colors.background.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      ...Shadows.md,
    },

    cardFlat: {
      backgroundColor: colors.background.secondary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },

    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.background.secondary,
      padding: Spacing.sm + 4,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },

    // TYPOGRAPHY
    title: {
      fontSize: Typography.sizes.xxxl,
      fontWeight: Typography.weights.bold,
      color: colors.text.primary,
    },

    heading: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.semibold,
      color: colors.text.primary,
    },

    subheading: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.semibold,
      color: colors.text.primary,
    },

    body: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.normal,
      color: colors.text.primary,
    },

    bodySecondary: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.normal,
      color: colors.text.secondary,
    },

    caption: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.normal,
      color: colors.text.secondary,
    },

    small: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.normal,
      color: colors.text.tertiary,
    },

    // BUTTONS
    button: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: Layout.minTouchSize,
    },

    buttonPrimary: {
      backgroundColor: colors.primary,
    },

    buttonSecondary: {
      backgroundColor: colors.secondary,
    },

    buttonSuccess: {
      backgroundColor: colors.success,
    },

    buttonError: {
      backgroundColor: colors.error,
    },

    buttonOutline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border.default,
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    buttonText: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.semibold,
      color: colors.text.inverse,
    },

    buttonTextOutline: {
      color: colors.text.primary,
    },

    // INPUTS
    inputContainer: {
      marginBottom: Spacing.md,
    },

    inputLabel: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.semibold,
      color: colors.text.primary,
      marginBottom: Spacing.sm,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 6,
      fontSize: Typography.sizes.md,
      backgroundColor: colors.background.primary,
      color: colors.text.primary,
    },

    inputFocused: {
      borderColor: colors.border.focus,
      borderWidth: 2,
    },

    inputError: {
      borderColor: colors.border.error,
    },

    inputErrorText: {
      color: colors.error,
      fontSize: Typography.sizes.xs,
      marginTop: Spacing.xs,
    },

    // MISC
    divider: {
      height: 1,
      backgroundColor: colors.border.light,
      marginVertical: Spacing.md,
    },

    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primary,
    },

    badgeText: {
      color: colors.text.inverse,
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.semibold,
    },

    link: {
      color: colors.primary,
      fontWeight: Typography.weights.semibold,
    },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
  });
};

/**
 * Hook to get theme-aware common styles
 * Use this in your components instead of importing commonStyles directly
 */
export const useCommonStyles = () => {
  const colors = useThemeColors();
  return createCommonStyles(colors);
};
