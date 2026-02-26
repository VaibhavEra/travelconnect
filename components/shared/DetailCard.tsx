import { BorderRadius, Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { StyleSheet, View, ViewStyle } from "react-native";

interface DetailCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function DetailCard({ children, style }: DetailCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.background.secondary },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
