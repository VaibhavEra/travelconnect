import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface OtpCardProps {
  title: string;
  otp: string;
  expiryText: string | null;
  helperText: string;
  accentColor: "primary" | "success" | "error";
  isRegenerating: boolean;
  onRegenerate: () => void;
}

export default function OtpCard({
  title,
  otp,
  expiryText,
  helperText,
  accentColor,
  isRegenerating,
  onRegenerate,
}: OtpCardProps) {
  const colors = useThemeColors();
  const color = colors[accentColor];

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {title}
      </Text>

      <View
        style={[styles.otpBox, { backgroundColor: colors.background.primary }]}
      >
        <Text style={[styles.otpCode, { color: colors.text.primary }]}>
          {otp}
        </Text>
        {expiryText && (
          <Text style={[styles.otpExpiry, { color: colors.text.secondary }]}>
            {expiryText}
          </Text>
        )}
      </View>

      <Text style={[styles.helperText, { color: colors.text.secondary }]}>
        {helperText}
      </Text>

      <View
        style={[styles.divider, { backgroundColor: colors.border.light }]}
      />

      <Pressable
        style={[
          styles.regenerateButton,
          { backgroundColor: color + "10" },
          isRegenerating && styles.buttonDisabled,
        ]}
        onPress={onRegenerate}
        disabled={isRegenerating}
      >
        {isRegenerating ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons name="refresh" size={18} color={color} />
        )}
        <Text style={[styles.regenerateButtonText, { color }]}>
          {isRegenerating ? "Regenerating…" : "Regenerate OTP"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  otpBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  otpCode: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 8,
  },
  otpExpiry: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  helperText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  regenerateButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
