// components/forms/CitySwapPair.tsx
import CityDropdown from "@/components/forms/CityDropdown";
import { haptics } from "@/lib/utils/haptics";
import { Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

interface CitySwapPairProps {
  sourceValue: string;
  destinationValue: string;
  onSourceChange: (city: string) => void;
  onDestinationChange: (city: string) => void;
  sourceError?: string;
  destinationError?: string;
}

export default function CitySwapPair({
  sourceValue,
  destinationValue,
  onSourceChange,
  onDestinationChange,
  sourceError,
  destinationError,
}: CitySwapPairProps) {
  const colors = useThemeColors();

  const canSwap = !!sourceValue || !!destinationValue;

  const handleSwap = () => {
    if (!canSwap) return;
    haptics.light();
    const temp = sourceValue;
    onSourceChange(destinationValue);
    onDestinationChange(temp);
  };

  return (
    <View style={styles.container}>
      <CityDropdown
        label="From"
        value={sourceValue}
        onChange={onSourceChange}
        placeholder="Select origin city"
        error={sourceError}
      />

      <View style={styles.swapContainer}>
        <View
          style={[styles.swapLine, { backgroundColor: colors.border.default }]}
        />
        <Pressable
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
        >
          <Ionicons
            name="swap-vertical"
            size={20}
            color={canSwap ? colors.primary : colors.text.tertiary}
          />
        </Pressable>
        <View
          style={[styles.swapLine, { backgroundColor: colors.border.default }]}
        />
      </View>

      <CityDropdown
        label="To"
        value={destinationValue}
        onChange={onDestinationChange}
        placeholder="Select destination city"
        error={destinationError}
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
