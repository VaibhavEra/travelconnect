import { useThemeColors } from "@/styles/theme";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: React.ComponentProps<typeof SafeAreaView>["edges"];
}

export default function ScreenContainer({
  children,
  edges = ["top"],
}: ScreenContainerProps) {
  const colors = useThemeColors();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
