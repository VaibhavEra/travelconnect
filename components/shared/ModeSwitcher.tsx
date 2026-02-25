import { haptics } from "@/lib/utils/haptics";
import { useModeStore } from "@/stores/modeStore";
import { BorderRadius, Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function ModeSwitcher() {
  const colors = useThemeColors();
  const { currentMode, switchMode, switching } = useModeStore();

  const handleSwitch = async () => {
    if (switching) return;
    haptics.selection();
    const newMode = currentMode === "sender" ? "traveller" : "sender";
    try {
      await switchMode(newMode);
      router.replace(
        newMode === "sender" ? "/(tabs)/explore" : "/(tabs)/create-trip",
      );
    } catch (error) {
      haptics.error();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.background.secondary },
        switching && styles.containerDisabled,
      ]}
      onPress={handleSwitch}
      activeOpacity={0.7}
      disabled={switching}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              currentMode === "sender" ? colors.primary : "transparent",
          },
        ]}
      >
        <Ionicons
          name="search"
          size={16}
          color={
            currentMode === "sender"
              ? colors.text.inverse
              : colors.text.tertiary
          }
        />
      </View>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              currentMode === "traveller" ? colors.primary : "transparent",
          },
        ]}
      >
        <Ionicons
          name="airplane"
          size={16}
          color={
            currentMode === "traveller"
              ? colors.text.inverse
              : colors.text.tertiary
          }
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    padding: Spacing.xs - 2,
    gap: Spacing.xs - 2,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
