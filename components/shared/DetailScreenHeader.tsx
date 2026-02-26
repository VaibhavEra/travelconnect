import BackButton from "@/components/shared/BackButton";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { StyleSheet, Text, View } from "react-native";

interface DetailScreenHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export default function DetailScreenHeader({
  title,
  right,
}: DetailScreenHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
      <BackButton />
      <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
