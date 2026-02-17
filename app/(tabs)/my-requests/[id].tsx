// app/my-requests/[id].tsx
import CancelRequestModal from "@/components/request/CancelRequestModal";
import EditReceiverDetailsModal from "@/components/request/EditReceiverDetailsModal";
import EditRequestDetailsModal from "@/components/request/EditRequestDetailsModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentRequest,
    loading,
    getRequestById,
    cancelRequest,
    canEditRequestDetails,
    canEditReceiverDetails,
  } = useRequestStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showEditReceiverModal, setShowEditReceiverModal] = useState(false);

  // Permission states
  const [canEditDetails, setCanEditDetails] = useState(false);
  const [canEditReceiver, setCanEditReceiver] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

  // Check edit permissions when request loads or status changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (id) {
        const detailsPermission = await canEditRequestDetails(id);
        const receiverPermission = await canEditReceiverDetails(id);
        setCanEditDetails(detailsPermission);
        setCanEditReceiver(receiverPermission);
      }
    };

    checkPermissions();
  }, [id, currentRequest?.status]);

  const handleCancel = async (reason?: string) => {
    try {
      await cancelRequest(id, reason);
      haptics.success();
      Alert.alert(
        "Request Cancelled",
        "Your parcel request has been cancelled.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to cancel request");
    }
  };

  const handleOpenTicket = (url: string) => {
    haptics.light();
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open ticket file");
    });
  };

  const handleEditDetailsSuccess = async () => {
    await getRequestById(id);
    setShowEditDetailsModal(false);
  };

  const handleEditReceiverSuccess = async () => {
    await getRequestById(id);
    setShowEditReceiverModal(false);
  };

  if (loading || !currentRequest) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const status = currentRequest.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  const canCancel = status === "pending" || status === "accepted";

  const categoryConfig =
    CATEGORY_CONFIG[currentRequest.category as keyof typeof CATEGORY_CONFIG];

  const isAccepted =
    status === "accepted" || status === "picked_up" || status === "delivered";

  // Get trip data
  const tripData = currentRequest.trip as any;
  const travellerInfo = tripData?.traveller || null;

  // Get allowed categories for edit modal
  const allowedCategories = tripData?.allowed_categories || [];

  // Get transport icon and capacity label
  const transportMode = tripData?.transport_mode || "";
  const transportIcon =
    TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ||
    "arrow-forward";
  const sizeCapacityLabel = getSizeCapacityLabel(
    tripData?.parcel_size_capacity || "",
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <Pressable
          onPress={() => {
            haptics.light();
            router.back();
          }}
          style={[
            styles.backButton,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Request Details
          </Text>
          <View style={styles.statusBadge}>
            <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Route Card */}
        {currentRequest.trip && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="map" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Trip Route
              </Text>
            </View>

            {/* Vertical Route Layout */}
            <View style={styles.routeContainer}>
              {/* Source */}
              <View style={styles.locationRow}>
                <View style={styles.locationDot}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.success }]}
                  />
                  <View
                    style={[
                      styles.verticalLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                </View>
                <View style={styles.locationContent}>
                  <Text
                    style={[
                      styles.locationLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    From
                  </Text>
                  <Text
                    style={[
                      styles.locationCity,
                      { color: colors.text.primary },
                    ]}
                  >
                    {currentRequest.trip.source}
                  </Text>
                  <Text
                    style={[
                      styles.locationTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatDate(currentRequest.trip.departure_date)} •{" "}
                    {formatTime(currentRequest.trip.departure_time)}
                  </Text>
                </View>
              </View>

              {/* Transport Mode */}
              <View style={styles.transportRow}>
                <View style={styles.transportIconContainer}>
                  <Ionicons
                    name={transportIcon}
                    size={20}
                    color={colors.text.tertiary}
                  />
                </View>
                <Text
                  style={[
                    styles.transportText,
                    { color: colors.text.tertiary },
                  ]}
                >
                  {transportMode}
                </Text>
              </View>

              {/* Destination */}
              <View style={styles.locationRow}>
                <View style={styles.locationDot}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.error }]}
                  />
                </View>
                <View style={styles.locationContent}>
                  <Text
                    style={[
                      styles.locationLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    To
                  </Text>
                  <Text
                    style={[
                      styles.locationCity,
                      { color: colors.text.primary },
                    ]}
                  >
                    {currentRequest.trip.destination}
                  </Text>
                  <Text
                    style={[
                      styles.locationTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatDate(currentRequest.trip.arrival_date)} •{" "}
                    {formatTime(currentRequest.trip.arrival_time)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Parcel Size Capacity */}
            <View
              style={[
                styles.capacityBadge,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons name="resize" size={16} color={colors.primary} />
              <Text style={[styles.capacityText, { color: colors.primary }]}>
                Accepts: {sizeCapacityLabel}
              </Text>
            </View>
          </View>
        )}

        {/* Parcel Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="cube" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Parcel Details
              </Text>
            </View>
            {canEditDetails && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditDetailsModal(true);
                }}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text
              style={[styles.detailLabel, { color: colors.text.secondary }]}
            >
              Category
            </Text>
            <View style={styles.categoryBadge}>
              {categoryConfig && (
                <Ionicons
                  name={categoryConfig.icon}
                  size={14}
                  color={colors.primary}
                />
              )}
              <Text
                style={[styles.categoryText, { color: colors.text.primary }]}
              >
                {categoryConfig?.label || currentRequest.category}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text
              style={[styles.detailLabel, { color: colors.text.secondary }]}
            >
              Description
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {currentRequest.item_description}
            </Text>
          </View>

          {currentRequest.parcel_photos &&
            currentRequest.parcel_photos.length > 0 && (
              <View style={styles.photosSection}>
                <Text
                  style={[styles.detailLabel, { color: colors.text.secondary }]}
                >
                  Photos
                </Text>
                <PhotoGallery photos={currentRequest.parcel_photos} />
              </View>
            )}
        </View>

        {/* Receiver Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Receiver Details
              </Text>
            </View>
            {canEditReceiver && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditReceiverModal(true);
                }}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text
              style={[styles.detailLabel, { color: colors.text.secondary }]}
            >
              Name
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {currentRequest.delivery_contact_name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text
              style={[styles.detailLabel, { color: colors.text.secondary }]}
            >
              Phone
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {currentRequest.delivery_contact_phone}
            </Text>
          </View>
        </View>

        {/* Traveller Info Card (only show if accepted) */}
        {isAccepted && travellerInfo && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name="person-circle"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Traveller Information
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.text.secondary }]}
              >
                Name
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {travellerInfo.full_name}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.text.secondary }]}
              >
                Phone
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {travellerInfo.phone}
              </Text>
            </View>
          </View>
        )}

        {/* Rejection Reason (if rejected or cancelled) */}
        {(status === "rejected" || status === "cancelled") &&
          currentRequest.rejection_reason && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.error + "10",
                  borderColor: colors.error + "30",
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconContainer,
                    { backgroundColor: colors.error + "15" },
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.error}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: colors.error }]}>
                  {status === "rejected"
                    ? "Rejection Reason"
                    : "Cancellation Reason"}
                </Text>
              </View>

              <Text
                style={[styles.rejectionText, { color: colors.text.primary }]}
              >
                {currentRequest.rejection_reason}
              </Text>
            </View>
          )}

        {/* Cancel Button */}
        {canCancel && (
          <Pressable
            style={[styles.cancelButton, { backgroundColor: colors.error }]}
            onPress={() => {
              haptics.light();
              setShowCancelModal(true);
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.text.inverse}
            />
            <Text
              style={[styles.cancelButtonText, { color: colors.text.inverse }]}
            >
              Cancel Request
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modals */}
      <CancelRequestModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={handleCancel}
        requestStatus={status}
      />

      <EditRequestDetailsModal
        visible={showEditDetailsModal}
        onClose={() => setShowEditDetailsModal(false)}
        request={currentRequest}
        allowedCategories={allowedCategories}
        onSuccess={handleEditDetailsSuccess}
      />

      <EditReceiverDetailsModal
        visible={showEditReceiverModal}
        onClose={() => setShowEditReceiverModal(false)}
        request={currentRequest}
        onSuccess={handleEditReceiverSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  editButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  routeContainer: {
    gap: 0,
  },
  locationRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  locationDot: {
    alignItems: "center",
    width: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    marginVertical: Spacing.xs,
  },
  locationContent: {
    flex: 1,
    paddingBottom: Spacing.sm,
  },
  locationLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  locationCity: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  locationTime: {
    fontSize: Typography.sizes.sm,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: 24,
    marginVertical: -Spacing.xs,
  },
  transportIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  transportText: {
    fontSize: Typography.sizes.sm,
    textTransform: "capitalize",
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  capacityText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  detailRow: {
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  detailValue: {
    fontSize: Typography.sizes.md,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    textTransform: "capitalize",
  },
  photosSection: {
    gap: Spacing.sm,
  },
  rejectionText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
