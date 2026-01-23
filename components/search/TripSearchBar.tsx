import CityDropdown from "@/components/forms/CityDropdown";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function TripSearchBar() {
  const { filters, setFilters } = useSearchStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Where are you sending?</Text>

      <View style={styles.routeContainer}>
        <View style={styles.cityField}>
          <CityDropdown
            label="From"
            value={filters.source}
            onChange={(city) => setFilters({ source: city })}
            placeholder="Source city"
          />
        </View>

        <View style={styles.swapIcon}>
          <Ionicons
            name="swap-horizontal"
            size={24}
            color={Colors.text.secondary}
          />
        </View>

        <View style={styles.cityField}>
          <CityDropdown
            label="To"
            value={filters.destination}
            onChange={(city) => setFilters({ destination: city })}
            placeholder="Destination city"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cityField: {
    flex: 1,
  },
  swapIcon: {
    paddingTop: 20,
  },
});
