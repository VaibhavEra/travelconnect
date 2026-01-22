// styles/commonStyles.ts
import { StyleSheet } from "react-native";
import {
  BorderRadius,
  Colors,
  Layout,
  Shadows,
  Spacing,
  Typography,
} from "./theme";

export const commonStyles = StyleSheet.create({
  // LAYOUT
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },

  cardFlat: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.background.secondary,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },

  // TYPOGRAPHY
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },

  heading: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  subheading: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  body: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
    color: Colors.text.primary,
  },

  bodySecondary: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.normal,
    color: Colors.text.secondary,
  },

  caption: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.normal,
    color: Colors.text.secondary,
  },

  small: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.normal,
    color: Colors.text.tertiary,
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
    backgroundColor: Colors.primary,
  },

  buttonSecondary: {
    backgroundColor: Colors.secondary,
  },

  buttonSuccess: {
    backgroundColor: Colors.success,
  },

  buttonError: {
    backgroundColor: Colors.error,
  },

  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  buttonTextOutline: {
    color: Colors.text.primary,
  },

  // INPUTS
  inputContainer: {
    marginBottom: Spacing.md,
  },

  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 6,
    fontSize: Typography.sizes.md,
    backgroundColor: Colors.background.primary,
    color: Colors.text.primary,
  },

  inputFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },

  inputError: {
    borderColor: Colors.border.error,
  },

  inputErrorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },

  // MISC
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },

  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },

  badgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },

  link: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
});
