import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface RequestCardProps {
  request: ParcelRequest;
  variant?: "sender" | "traveller"; // Add variant prop
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
  accepted: "Accepted",
  rejected: "Rejected",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function RequestCard({
  request,
  variant = "traveller",
}: RequestCardProps) {
  const router = useRouter();

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handlePress = () => {
    if (variant === "sender") {
      // Sender viewing their own requests - navigate to request-details
      router.push({
        pathname: "/request-details/[id]" as any,
        params: { id: request.id },
      });
    } else {
      // Traveller viewing incoming requests - navigate to incoming-request-details
      router.push({
        pathname: "/incoming-request-details/[id]" as any,
        params: { id: request.id },
      });
    }
  };

  const status = request.status as RequestStatus;
  const statusColor = STATUS_COLORS[status] || Colors.text.secondary;
  const statusLabel = STATUS_LABELS[status] || request.status;

  // Check if cancelled and determine who cancelled
  const isCancelled = request.status === "cancelled";
  const cancelledBySender = request.cancelled_by === "sender";
  const cancelledByTraveller = request.cancelled_by === "traveller";

  // Get cancellation info text
  const getCancellationInfo = () => {
    if (!isCancelled) return null;

    if (variant === "sender") {
      return cancelledBySender ? "You cancelled" : "Traveller cancelled";
    } else {
      return cancelledByTraveller ? "You cancelled" : "Sender cancelled";
    }
  };

  return (
    <Pressable
      style={[styles.card, isCancelled && styles.cardCancelled]}
      onPress={handlePress}
    >
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
        <View style={styles.statusGroup}>
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
          {isCancelled && (
            <View style={styles.cancelledByBadge}>
              <Ionicons name="close-circle" size={12} color={Colors.error} />
              <Text style={styles.cancelledByText}>
                {getCancellationInfo()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.photoSection}>
          {request.parcel_photos && request.parcel_photos.length > 0 && (
            <Image
              source={{ uri: request.parcel_photos[0] }}
              style={[
                styles.thumbnail,
                isCancelled && styles.thumbnailCancelled,
              ]}
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
          <Text
            style={[
              styles.description,
              isCancelled && styles.descriptionCancelled,
            ]}
            numberOfLines={2}
          >
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
                name="pricetag-outline"
                size={14}
                color={Colors.text.secondary}
              />
              <Text style={styles.metaText}>
                {request.category.charAt(0).toUpperCase() +
                  request.category.slice(1)}
              </Text>
            </View>
          </View>

          {/* Show cancellation reason if cancelled and reason exists */}
          {isCancelled && request.rejection_reason && (
            <View style={styles.cancellationReasonBox}>
              <Text style={styles.cancellationReasonText} numberOfLines={1}>
                {request.rejection_reason}
              </Text>
            </View>
          )}
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
            name="person-outline"
            size={14}
            color={Colors.text.tertiary}
          />
          <Text style={styles.receiverText}>
            {request.delivery_contact_name}
          </Text>
        </View>
      </View>
    </Pressable>
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
  cardCancelled: {
    opacity: 0.7,
    borderColor: Colors.text.tertiary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  statusGroup: {
    alignItems: "flex-end",
    gap: Spacing.xs,
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
  cancelledByBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.error + "10",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  cancelledByText: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
    color: Colors.error,
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
  thumbnailCancelled: {
    opacity: 0.5,
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
  descriptionCancelled: {
    color: Colors.text.secondary,
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
  cancellationReasonBox: {
    backgroundColor: Colors.error + "10",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  cancellationReasonText: {
    fontSize: 10,
    color: Colors.error,
    fontStyle: "italic",
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
});
