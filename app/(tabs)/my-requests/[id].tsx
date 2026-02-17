// app/my-requests/[id].tsx
import CancelRequestModal from "@/components/request/CancelRequestModal";
import EditReceiverDetailsModal from "@/components/request/EditReceiverDetailsModal";
import EditRequestDetailsModal from "@/components/request/EditRequestDetailsModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { formatCountdown, formatDate, formatTime } from "@/lib/utils/dateTime";
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
    regeneratePickupOtp,
    regenerateDeliveryOtp,
  } = useRequestStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showEditReceiverModal, setShowEditReceiverModal] = useState(false);
  const [regeneratingPickup, setRegeneratingPickup] = useState(false);
  const [regeneratingDelivery, setRegeneratingDelivery] = useState(false);

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

  const handleCallTraveller = (phone: string) => {
    haptics.light();
    Linking.openURL(`tel:${phone}`);
  };

  const handleRegeneratePickupOtp = async () => {
    try {
      setRegeneratingPickup(true);
      haptics.light();
      await regeneratePickupOtp(id);
      haptics.success();
      Alert.alert("Success", "Pickup OTP regenerated successfully");
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to regenerate OTP");
    } finally {
      setRegeneratingPickup(false);
    }
  };

  const handleRegenerateDeliveryOtp = async () => {
    try {
      setRegeneratingDelivery(true);
      haptics.light();
      await regenerateDeliveryOtp(id);
      haptics.success();
      Alert.alert("Success", "Delivery OTP regenerated successfully");
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to regenerate OTP");
    } finally {
      setRegeneratingDelivery(false);
    }
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

  // Trip / traveller data
  const tripData = currentRequest.trip as any;
  const travellerInfo = tripData?.traveller || null;
  const transportMode = tripData?.transport_mode || "";
  const transportIcon =
    TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ||
    "arrow-forward";
  const sizeCapacityLabel = getSizeCapacityLabel(
    tripData?.parcel_size_capacity || "",
  );

  const pickupExpiryText =
    currentRequest.pickup_otp_expiry != null
      ? formatCountdown(currentRequest.pickup_otp_expiry).text
      : null;
  const deliveryExpiryText =
    currentRequest.delivery_otp_expiry != null
      ? formatCountdown(currentRequest.delivery_otp_expiry).text
      : null;

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

            {/* Trip extra info: only after acceptance */}
            {isAccepted && (
              <>
                <View style={styles.detailRow}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    PNR
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {tripData?.pnr_number}
                  </Text>
                </View>

                {tripData?.ticket_file_url && (
                  <Pressable
                    style={[
                      styles.ticketButton,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                    onPress={() => handleOpenTicket(tripData.ticket_file_url)}
                  >
                    <Ionicons
                      name="document-text"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.ticketButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      View Ticket
                    </Text>
                  </Pressable>
                )}
              </>
            )}
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
            <View style={styles.cardHeaderRow}>
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
                <Text
                  style={[styles.cardTitle, { color: colors.text.primary }]}
                >
                  Traveller Information
                </Text>
              </View>
              {travellerInfo.phone && (
                <Pressable
                  onPress={() => handleCallTraveller(travellerInfo.phone)}
                  style={[
                    styles.callButton,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Ionicons name="call" size={18} color={colors.primary} />
                  <Text
                    style={[styles.callButtonText, { color: colors.primary }]}
                  >
                    Call
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

        {/* Pickup OTP Card */}
        {status === "accepted" && currentRequest.pickup_otp && (
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
                <Ionicons name="keypad" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Pickup OTP
              </Text>
            </View>

            <View style={styles.otpRow}>
              <Text style={[styles.otpCode, { color: colors.text.primary }]}>
                {currentRequest.pickup_otp}
              </Text>
              {pickupExpiryText && (
                <Text
                  style={[
                    styles.otpExpiryText,
                    { color: colors.text.secondary },
                  ]}
                >
                  {pickupExpiryText}
                </Text>
              )}
            </View>

            <Text style={[styles.helperText, { color: colors.text.secondary }]}>
              Share this OTP with the traveller only when they arrive for
              pickup.
            </Text>

            <Pressable
              style={[
                styles.regenerateButton,
                { backgroundColor: colors.primary + "10" },
                regeneratingPickup && styles.regenerateButtonDisabled,
              ]}
              onPress={handleRegeneratePickupOtp}
              disabled={regeneratingPickup}
            >
              {regeneratingPickup ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.primary} />
              )}
              <Text
                style={[styles.regenerateButtonText, { color: colors.primary }]}
              >
                {regeneratingPickup ? "Regenerating..." : "Regenerate OTP"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Delivery OTP Card */}
        {status === "picked_up" && currentRequest.delivery_otp && (
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
                  { backgroundColor: colors.success + "15" },
                ]}
              >
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Delivery OTP
              </Text>
            </View>

            <View style={styles.otpRow}>
              <Text style={[styles.otpCode, { color: colors.text.primary }]}>
                {currentRequest.delivery_otp}
              </Text>
              {deliveryExpiryText && (
                <Text
                  style={[
                    styles.otpExpiryText,
                    { color: colors.text.secondary },
                  ]}
                >
                  {deliveryExpiryText}
                </Text>
              )}
            </View>

            <Text style={[styles.helperText, { color: colors.text.secondary }]}>
              Share this OTP with the receiver to confirm parcel delivery.
            </Text>

            <Pressable
              style={[
                styles.regenerateButton,
                { backgroundColor: colors.success + "10" },
                regeneratingDelivery && styles.regenerateButtonDisabled,
              ]}
              onPress={handleRegenerateDeliveryOtp}
              disabled={regeneratingDelivery}
            >
              {regeneratingDelivery ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.success} />
              )}
              <Text
                style={[styles.regenerateButtonText, { color: colors.success }]}
              >
                {regeneratingDelivery ? "Regenerating..." : "Regenerate OTP"}
              </Text>
            </Pressable>
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
        allowedCategories={tripData?.allowed_categories || []}
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
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  callButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  otpCode: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 4,
  },
  otpExpiryText: {
    fontSize: Typography.sizes.sm,
  },
  helperText: {
    fontSize: Typography.sizes.sm,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
