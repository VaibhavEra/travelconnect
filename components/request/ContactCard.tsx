import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface ContactCardProps {
  name: string;
  phone: string;
  iconColor: string;
}

export default function ContactCard({
  name,
  phone,
  iconColor,
}: ContactCardProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCall = () => {
    haptics.light();
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View
      style={[
        styles.contactCard,
        { backgroundColor: colors.background.primary },
      ]}
    >
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text.primary }]}>
          {name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.text.secondary }]}>
          {phone}
        </Text>
      </View>
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[styles.callButton, { backgroundColor: iconColor + "15" }]}
          onPress={handleCall}
          onPressIn={() => {
            scale.value = withSpring(0.9);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
        >
          <Ionicons name="call" size={20} color={iconColor} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: Typography.sizes.sm,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
