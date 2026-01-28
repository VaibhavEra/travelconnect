import { Animations, BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

interface ModalButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "error" | "outline";
  disabled?: boolean;
  loading?: boolean;
}

export default function ModalButton({
  onPress,
  children,
  variant = "primary",
  disabled = false,
  loading = false,
}: ModalButtonProps) {
  const colors = useThemeColors();

  const getButtonStyle = () => {
    switch (variant) {
      case "success":
        return { backgroundColor: colors.success };
      case "error":
        return { backgroundColor: colors.error };
      case "secondary":
        return { backgroundColor: colors.secondary };
      case "outline":
        return {
          backgroundColor: colors.background.secondary,
          borderWidth: 1,
          borderColor: colors.border.default,
        };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getTextColor = () => {
    return variant === "outline" ? colors.text.secondary : colors.text.inverse;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        getButtonStyle(),
        (disabled || loading) && styles.disabled,
        pressed && { opacity: Animations.scale.pressed },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  text: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  disabled: {
    opacity: 0.6,
  },
});
