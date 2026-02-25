import ModeSwitcher from "@/components/shared/ModeSwitcher";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { StyleSheet, Text, View } from "react-native";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showModeSwitcher?: boolean;
  right?: React.ReactNode; // optional custom right element
}

export default function ScreenHeader({
  title,
  subtitle,
  showModeSwitcher = true,
  right,
}: ScreenHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ?? (showModeSwitcher ? <ModeSwitcher /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
  },
});
