import { Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function MyTripsScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="airplane-outline" size={64} color={Colors.primary} />
      <Text style={styles.title}>My Trips</Text>
      <Text style={styles.subtitle}>View and manage your posted trips</Text>
      <Text style={styles.comingSoon}>Coming in Phase 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  comingSoon: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
    fontStyle: "italic",
  },
});
