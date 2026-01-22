import { haptics } from "@/lib/utils/haptics";
import { useModeStore } from "@/stores/modeStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ModeSwitcher() {
  const { currentMode, switchMode } = useModeStore();
  const router = useRouter();

  const handleModeSwitch = async (mode: "sender" | "traveller") => {
    if (mode === currentMode) return;

    haptics.selection();
    await switchMode(mode);

    // Navigate to first tab of new mode
    if (mode === "sender") {
      router.replace("/(tabs)/explore");
    } else {
      router.replace("/(tabs)/my-trips");
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.button,
            currentMode === "sender" && styles.buttonActive,
          ]}
          onPress={() => handleModeSwitch("sender")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={
              currentMode === "sender"
                ? Colors.text.inverse
                : Colors.text.secondary
            }
          />
          <Text
            style={[
              styles.buttonText,
              currentMode === "sender" && styles.buttonTextActive,
            ]}
          >
            Sender
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            currentMode === "traveller" && styles.buttonActive,
          ]}
          onPress={() => handleModeSwitch("traveller")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="airplane-outline"
            size={18}
            color={
              currentMode === "traveller"
                ? Colors.text.inverse
                : Colors.text.secondary
            }
          />
          <Text
            style={[
              styles.buttonText,
              currentMode === "traveller" && styles.buttonTextActive,
            ]}
          >
            Traveller
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginRight: Spacing.md,
  },
  container: {
    flexDirection: "row",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
  },
  buttonActive: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },
  buttonTextActive: {
    color: Colors.text.inverse,
  },
});
