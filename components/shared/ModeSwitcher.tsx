import { haptics } from "@/lib/utils/haptics";
import { useModeStore } from "@/stores/modeStore";
import { BorderRadius, Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function ModeSwitcher() {
  const colors = useThemeColors();
  const { currentMode, switchMode } = useModeStore();
  const router = useRouter();

  const handleSwitch = async () => {
    haptics.selection();
    const newMode = currentMode === "sender" ? "traveller" : "sender";
    await switchMode(newMode);

    // Navigate to appropriate default tab
    if (newMode === "sender") {
      router.replace("/(tabs)/explore");
    } else {
      router.replace("/(tabs)/create-trip");
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.background.secondary },
      ]}
      onPress={handleSwitch}
      activeOpacity={0.7}
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
    marginRight: Spacing.md,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs - 2,
    gap: Spacing.xs - 2,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
