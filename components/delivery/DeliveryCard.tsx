import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface DeliveryCardProps {
  request: ParcelRequest;
}

type RequestStatus = "accepted" | "picked_up" | "delivered";

const STATUS_COLORS: Record<RequestStatus, string> = {
  accepted: Colors.warning,
  picked_up: Colors.primary,
  delivered: Colors.success,
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  accepted: "Ready to Pick Up",
  picked_up: "In Transit",
  delivered: "Delivered",
};

export default function DeliveryCard({ request }: DeliveryCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handlePress = () => {
    router.push({
      pathname: "/delivery-details/[id]" as any,
      params: { id: request.id },
    });
  };

  const status = request.status as RequestStatus;
  const statusColor = STATUS_COLORS[status] || Colors.text.secondary;
  const statusLabel = STATUS_LABELS[status] || request.status;

  return (
    <Pressable style={styles.card} onPress={handlePress}>
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
          style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}
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
        </View>

        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={2}>
            {request.item_description}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="cube" size={14} color={Colors.text.secondary} />
              <Text style={styles.metaText}>
                {request.size.charAt(0).toUpperCase() + request.size.slice(1)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="pricetag"
                size={14}
                color={Colors.text.secondary}
              />
              <Text style={styles.metaText}>
                {request.category.charAt(0).toUpperCase() +
                  request.category.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {request.trip && (
          <View style={styles.tripDate}>
            <Ionicons name="calendar" size={14} color={Colors.text.tertiary} />
            <Text style={styles.tripDateText}>
              {formatDate(request.trip.departure_date)}
            </Text>
          </View>
        )}

        <View style={styles.sender}>
          <Ionicons name="person" size={14} color={Colors.text.tertiary} />
          <Text style={styles.senderText}>
            {request.sender?.full_name || "Sender"}
          </Text>
        </View>
      </View>

      {status === "accepted" && (
        <View style={styles.actionHint}>
          <Ionicons
            name="information-circle"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.actionHintText}>Tap to mark as picked up</Text>
        </View>
      )}

      {status === "picked_up" && (
        <View style={styles.actionHint}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.actionHintText}>Tap to mark as delivered</Text>
        </View>
      )}
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
  sender: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  senderText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionHintText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontStyle: "italic",
  },
});
