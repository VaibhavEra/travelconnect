import { haptics } from "@/lib/utils/haptics";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

interface BackButtonProps {
  onPress?: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    haptics.light();
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      style={[
        styles.backButton,
        { backgroundColor: colors.background.secondary },
      ]}
    >
      <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
