import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "./ScreenContainer";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const colors = useThemeColors();
  return (
    <ScreenContainer>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && (
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {message}
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
  },
});
