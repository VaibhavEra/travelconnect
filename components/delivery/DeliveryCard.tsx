import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants";
import { formatDateShort } from "@/lib/utils/dateTime";
import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface DeliveryCardProps {
  request: ParcelRequest;
  onMarkPickup?: (requestId: string) => void;
  onMarkDelivery?: (requestId: string) => void;
}

export default function DeliveryCard({
  request,
  onMarkPickup,
  onMarkDelivery,
}: DeliveryCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const handlePress = () => {
    router.push({
      pathname: "/incoming-request-details/[id]" as any,
      params: { id: request.id },
    });
  };

  const status = request.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = statusConfig
    ? colors[statusConfig.colorKey]
    : colors.text.secondary;
  const statusLabel = statusConfig?.label || request.status;

  const showPickupButton = status === "accepted";
  const showDeliveryButton = status === "picked_up";

  return (
    <View style={styles.card}>
      <Pressable onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.routeInfo}>
            <Text style={[styles.cityText, { color: colors.text.primary }]}>
              {request.trip?.source}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.text.secondary}
            />
            <Text style={[styles.cityText, { color: colors.text.primary }]}>
              {request.trip?.destination}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: withOpacity(statusColor, "medium") },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.photoSection}>
            {request.parcel_photos && request.parcel_photos.length > 0 && (
              <Image
                source={{ uri: request.parcel_photos[0] }}
                style={[
                  styles.thumbnail,
                  { backgroundColor: colors.background.primary },
                ]}
              />
            )}
            {request.parcel_photos && request.parcel_photos.length > 1 && (
              <View
                style={[
                  styles.photoCount,
                  { backgroundColor: "rgba(0, 0, 0, 0.7)" },
                ]}
              >
                <Ionicons name="images" size={12} color={colors.text.inverse} />
                <Text
                  style={[
                    styles.photoCountText,
                    { color: colors.text.inverse },
                  ]}
                >
                  {request.parcel_photos.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.details}>
            <Text
              style={[styles.description, { color: colors.text.primary }]}
              numberOfLines={2}
            >
              {request.item_description}
            </Text>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color={colors.text.secondary}
                />
                <Text
                  style={[styles.metaText, { color: colors.text.secondary }]}
                >
                  {request.size.charAt(0).toUpperCase() + request.size.slice(1)}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.text.secondary}
                />
                <Text
                  style={[styles.metaText, { color: colors.text.secondary }]}
                >
                  {request.sender?.full_name || "Sender"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {request.trip && (
            <View style={styles.tripDate}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.text.tertiary}
              />
              <Text
                style={[styles.tripDateText, { color: colors.text.tertiary }]}
              >
                {formatDateShort(request.trip.departure_date)}
              </Text>
            </View>
          )}

          <View style={styles.receiver}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.text.tertiary}
            />
            <Text
              style={[styles.receiverText, { color: colors.text.tertiary }]}
            >
              {request.delivery_contact_name}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Action Buttons */}
      {(showPickupButton || showDeliveryButton) && (
        <View
          style={[
            styles.actionContainer,
            { borderTopColor: colors.border.light },
          ]}
        >
          {showPickupButton && onMarkPickup && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => onMarkPickup(request.id)}
            >
              <Ionicons name="cube" size={18} color={colors.text.inverse} />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Mark as Picked Up
              </Text>
            </Pressable>
          )}

          {showDeliveryButton && onMarkDelivery && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => onMarkDelivery(request.id)}
            >
              <Ionicons
                name="checkmark-done"
                size={18}
                color={colors.text.inverse}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Mark as Delivered
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent", // Will use parent background
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "transparent", // Set dynamically in component
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  cityText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  body: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  photoSection: {
    position: "relative",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  photoCount: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  description: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.sizes.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "transparent", // Set dynamically
  },
  tripDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  tripDateText: {
    fontSize: Typography.sizes.xs,
  },
  receiver: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  receiverText: {
    fontSize: Typography.sizes.xs,
  },
  actionContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
