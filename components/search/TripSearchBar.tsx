import CityDropdown from "@/components/forms/CityDropdown";
import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function TripSearchBar() {
  const colors = useThemeColors();
  const { filters, setFilters } = useSearchStore();

  const handleSwap = () => {
    if (!filters.source && !filters.destination) return;

    haptics.light();
    setFilters({
      source: filters.destination,
      destination: filters.source,
    });
  };

  const canSwap = filters.source || filters.destination;

  return (
    <View style={styles.container}>
      {/* From City */}
      <CityDropdown
        label="From"
        value={filters.source}
        onChange={(city) => setFilters({ source: city })}
        placeholder="Select origin city"
      />

      {/* Swap Button */}
      <View style={styles.swapContainer}>
        <View
          style={[styles.swapLine, { backgroundColor: colors.border.default }]}
        />
        <TouchableOpacity
          style={[
            styles.swapButton,
            {
              backgroundColor: colors.background.primary,
              borderColor: colors.border.default,
            },
            !canSwap && styles.swapButtonDisabled,
          ]}
          onPress={handleSwap}
          disabled={!canSwap}
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-vertical"
            size={20}
            color={canSwap ? colors.primary : colors.text.tertiary}
          />
        </TouchableOpacity>
        <View
          style={[styles.swapLine, { backgroundColor: colors.border.default }]}
        />
      </View>

      {/* To City */}
      <CityDropdown
        label="To"
        value={filters.destination}
        onChange={(city) => setFilters({ destination: city })}
        placeholder="Select destination city"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  swapContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  swapLine: {
    flex: 1,
    height: 1,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginHorizontal: Spacing.sm,
  },
  swapButtonDisabled: {
    opacity: 0.5,
  },
});
