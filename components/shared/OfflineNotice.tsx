// components/OfflineNotice.tsx
import { useNetworkStatus } from "@/lib/utils/network";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function OfflineNotice() {
  const { isOffline } = useNetworkStatus();
  const colors = useThemeColors();

  if (!isOffline) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.error }]}>
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color={colors.text.inverse}
      />
      <Text style={[styles.text, { color: colors.text.inverse }]}>
        No internet connection
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  text: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
