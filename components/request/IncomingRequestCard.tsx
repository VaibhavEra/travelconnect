import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants";
import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
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
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
    scale.value = withSpring(
      Animations.scale.pressed,
      Animations.spring.gentle,
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Animations.spring.gentle);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = request.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];
  const statusBgColor = withOpacity(statusColor, "light");

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];
  const sizeConfig = SIZE_CONFIG[request.size as keyof typeof SIZE_CONFIG];

  const isPending = status === "pending";

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.background.secondary,
            borderColor: isPending
              ? withOpacity(statusColor, "strong")
              : colors.border.default,
          },
          isPending && styles.pendingCard,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Header Row */}
        <View style={styles.header}>
          {/* Status Badge */}
          <View
            style={[styles.statusBadge, { backgroundColor: statusBgColor }]}
          >
            <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>

          {/* Arrow */}
          <View
            style={[
              styles.arrowContainer,
              { backgroundColor: colors.background.primary },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.mainContent}>
            {/* Parcel Image */}
            {request.parcel_photos && request.parcel_photos.length > 0 ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: request.parcel_photos[0] }}
                  style={[
                    styles.parcelImage,
                    { backgroundColor: colors.background.primary },
                  ]}
                />
                {request.parcel_photos.length > 1 && (
                  <View
                    style={[
                      styles.imageCount,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons
                      name="images"
                      size={10}
                      color={colors.text.inverse}
                    />
                    <Text
                      style={[
                        styles.imageCountText,
                        { color: colors.text.inverse },
                      ]}
                    >
                      {request.parcel_photos.length}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.parcelImagePlaceholder,
                  { backgroundColor: colors.background.primary },
                ]}
              >
                <Ionicons name="cube" size={24} color={colors.text.tertiary} />
              </View>
            )}

            {/* Description & Details */}
            <View style={styles.descriptionContainer}>
              <Text
                style={[styles.description, { color: colors.text.primary }]}
                numberOfLines={2}
              >
                {request.item_description}
              </Text>

              {/* Tags */}
              <View style={styles.tagsRow}>
                <View
                  style={[
                    styles.tag,
                    { backgroundColor: withOpacity(colors.primary, "subtle") },
                  ]}
                >
                  <Ionicons
                    name={categoryConfig.icon}
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    {categoryConfig.label}
                  </Text>
                </View>

                <View
                  style={[
                    styles.tag,
                    { backgroundColor: colors.background.primary },
                  ]}
                >
                  <Ionicons
                    name={sizeConfig.icon}
                    size={12}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[styles.tagText, { color: colors.text.secondary }]}
                  >
                    {sizeConfig.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer - Sender Info */}
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.background.primary },
            ]}
          >
            <View style={styles.senderInfo}>
              <View
                style={[
                  styles.senderIcon,
                  { backgroundColor: withOpacity(colors.primary, "subtle") },
                ]}
              >
                <Ionicons name="person" size={12} color={colors.primary} />
              </View>
              <View style={styles.senderDetails}>
                <Text
                  style={[styles.senderLabel, { color: colors.text.tertiary }]}
                >
                  From
                </Text>
                <Text
                  style={[styles.senderName, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {request.sender?.full_name || "Unknown Sender"}
                </Text>
              </View>
            </View>

            {isPending && (
              <View
                style={[
                  styles.actionHint,
                  { backgroundColor: withOpacity(statusColor, "light") },
                ]}
              >
                <Text style={[styles.actionHintText, { color: statusColor }]}>
                  Tap to review
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pendingCard: {
    borderWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mainContent: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  imageContainer: {
    position: "relative",
  },
  parcelImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
  },
  parcelImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  imageCount: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  imageCountText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
  },
  descriptionContainer: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: "center",
  },
  description: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.sizes.md * 1.4,
  },
  tagsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  senderInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  senderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  senderDetails: {
    flex: 1,
  },
  senderLabel: {
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.sizes.xs * 1.2,
  },
  senderName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.sizes.sm * 1.2,
  },
  actionHint: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  actionHintText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
