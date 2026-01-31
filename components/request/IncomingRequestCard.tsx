import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { haptics } from "@/lib/utils/haptics";
import { ParcelRequest } from "@/stores/requestStore";
import {
  Animations,
  BorderRadius,
  Spacing,
  Typography,
  withOpacity,
} from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface IncomingRequestCardProps {
  request: ParcelRequest;
}

export default function IncomingRequestCard({
  request,
}: IncomingRequestCardProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const handlePress = () => {
    haptics.light();
    router.push(`/(tabs)/requests/${request.id}`);
  };

  const handlePressIn = () => {
    scale.value = withSpring(Animations.scale.card);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = request.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];
  const sizeConfig = SIZE_CONFIG[request.size as keyof typeof SIZE_CONFIG];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.background.secondary,
            borderColor: colors.border.default,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: withOpacity(statusColor, "light") },
          ]}
        >
          <Ionicons name={statusConfig.icon} size={16} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Description */}
          <Text
            style={[styles.description, { color: colors.text.primary }]}
            numberOfLines={2}
          >
            {request.item_description}
          </Text>

          {/* Category & Weight */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name={categoryConfig.icon}
                size={14}
                color={colors.text.tertiary}
              />
              <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                {categoryConfig.label}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name={sizeConfig.icon}
                size={14}
                color={colors.text.tertiary}
              />
              <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                {sizeConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            View Details
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.text.tertiary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.md * 1.4,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});
