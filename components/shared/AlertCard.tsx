import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface AlertCardProps {
  title: string;
  message: string;
}

export default function AlertCard({ title, message }: AlertCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.alertCard,
        {
          backgroundColor: colors.error + "10",
          borderColor: colors.error + "30",
        },
      ]}
    >
      <View
        style={[
          styles.alertIconContainer,
          { backgroundColor: colors.error + "20" },
        ]}
      >
        <Ionicons name="alert-circle" size={20} color={colors.error} />
      </View>
      <View style={styles.alertContent}>
        <Text style={[styles.alertTitle, { color: colors.error }]}>
          {title}
        </Text>
        <Text style={[styles.alertText, { color: colors.text.primary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  alertText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
});
