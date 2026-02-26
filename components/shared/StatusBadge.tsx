import { BorderRadius, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface StatusBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

export default function StatusBadge({ icon, label, color }: StatusBadgeProps) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
