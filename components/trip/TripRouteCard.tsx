import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { StyleSheet, Text, View } from "react-native";

interface TripRouteCardProps {
  source: string;
  destination: string;
}

export default function TripRouteCard({
  source,
  destination,
}: TripRouteCardProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.routeContainer}>
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
        <View style={styles.routeInfo}>
          <Text style={[styles.routeLabel, { color: colors.text.tertiary }]}>
            From
          </Text>
          <Text style={[styles.routeCity, { color: colors.text.primary }]}>
            {source}
          </Text>
        </View>
      </View>

      <View
        style={[styles.routeConnector, { borderColor: colors.border.default }]}
      />

      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
        <View style={styles.routeInfo}>
          <Text style={[styles.routeLabel, { color: colors.text.tertiary }]}>
            To
          </Text>
          <Text style={[styles.routeCity, { color: colors.text.primary }]}>
            {destination}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  routeContainer: {
    marginBottom: Spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInfo: {},
  routeLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  routeConnector: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: Spacing.xs,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
});
