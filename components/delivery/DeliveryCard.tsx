import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface DeliveryCardProps {
  request: ParcelRequest;
  onMarkPickup?: (requestId: string) => void;
  onMarkDelivery?: (requestId: string) => void;
}

type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "picked_up"
  | "delivered"
  | "cancelled";

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: Colors.warning,
  accepted: Colors.success,
  rejected: Colors.error,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.text.tertiary,
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Ready for Pickup",
  rejected: "Rejected",
  picked_up: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function DeliveryCard({
  request,
  onMarkPickup,
  onMarkDelivery,
}: DeliveryCardProps) {
  const router = useRouter();

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handlePress = () => {
    // Navigate to incoming request details
    router.push({
      pathname: "/incoming-request-details/[id]" as any,
      params: { id: request.id },
    });
  };

  const status = request.status as RequestStatus;
  const statusColor = STATUS_COLORS[status] || Colors.text.secondary;
  const statusLabel = STATUS_LABELS[status] || request.status;

  const showPickupButton = status === "accepted";
  const showDeliveryButton = status === "picked_up";

  return (
    <View style={styles.card}>
      <Pressable onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.routeInfo}>
            <Text style={styles.cityText}>{request.trip?.source}</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={Colors.text.secondary}
            />
            <Text style={styles.cityText}>{request.trip?.destination}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
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
                style={styles.thumbnail}
              />
            )}
            {request.parcel_photos && request.parcel_photos.length > 1 && (
              <View style={styles.photoCount}>
                <Ionicons name="images" size={12} color={Colors.text.inverse} />
                <Text style={styles.photoCountText}>
                  {request.parcel_photos.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.details}>
            <Text style={styles.description} numberOfLines={2}>
              {request.item_description}
            </Text>

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color={Colors.text.secondary}
                />
                <Text style={styles.metaText}>
                  {request.size.charAt(0).toUpperCase() + request.size.slice(1)}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={Colors.text.secondary}
                />
                <Text style={styles.metaText}>
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
                color={Colors.text.tertiary}
              />
              <Text style={styles.tripDateText}>
                {formatDate(request.trip.departure_date)}
              </Text>
            </View>
          )}

          <View style={styles.receiver}>
            <Ionicons
              name="location-outline"
              size={14}
              color={Colors.text.tertiary}
            />
            <Text style={styles.receiverText}>
              {request.delivery_contact_name}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Action Buttons */}
      {(showPickupButton || showDeliveryButton) && (
        <View style={styles.actionContainer}>
          {showPickupButton && onMarkPickup && (
            <Pressable
              style={[styles.actionButton, styles.pickupButton]}
              onPress={() => onMarkPickup(request.id)}
            >
              <Ionicons name="cube" size={18} color={Colors.text.inverse} />
              <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
            </Pressable>
          )}

          {showDeliveryButton && onMarkDelivery && (
            <Pressable
              style={[styles.actionButton, styles.deliveryButton]}
              onPress={() => onMarkDelivery(request.id)}
            >
              <Ionicons
                name="checkmark-done"
                size={18}
                color={Colors.text.inverse}
              />
              <Text style={styles.actionButtonText}>Mark as Delivered</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    color: Colors.text.primary,
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
    backgroundColor: Colors.background.primary,
  },
  photoCount: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  description: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
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
    color: Colors.text.secondary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  tripDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  tripDateText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },
  receiver: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  receiverText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },
  actionContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
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
  pickupButton: {
    backgroundColor: Colors.primary,
  },
  deliveryButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
