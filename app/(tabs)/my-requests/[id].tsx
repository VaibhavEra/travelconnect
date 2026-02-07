import EditReceiverDetailsModal from "@/components/request/EditReceiverDetailsModal";
import EditRequestDetailsModal from "@/components/request/EditRequestDetailsModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Cancel Request Modal Component
function CancelRequestModal({
  visible,
  onClose,
  onCancel,
  tripDepartureDate,
}: {
  visible: boolean;
  onClose: () => void;
  onCancel: (reason?: string) => Promise<void>;
  tripDepartureDate: string;
}) {
  const colors = useThemeColors();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const departureTime = new Date(tripDepartureDate).getTime();
  const now = new Date().getTime();
  const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
  const isWithin24Hours = hoursUntilDeparture < 24;

  const handleCancel = async () => {
    try {
      setLoading(true);
      await onCancel(reason.trim() || undefined);
      setReason("");
      onClose();
    } catch (error: any) {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={cancelModalStyles.overlay} onPress={handleClose}>
        <Pressable
          style={[
            cancelModalStyles.modal,
            { backgroundColor: colors.background.primary },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              cancelModalStyles.header,
              { borderBottomColor: colors.border.default },
            ]}
          >
            <Ionicons name="warning" size={48} color={colors.warning} />
            <Text
              style={[cancelModalStyles.title, { color: colors.text.primary }]}
            >
              Cancel Request
            </Text>
            <Text
              style={[
                cancelModalStyles.subtitle,
                { color: colors.text.secondary },
              ]}
            >
              {isWithin24Hours
                ? "Cannot cancel within 24 hours of departure"
                : "Are you sure you want to cancel this request?"}
            </Text>
          </View>

          <ScrollView
            style={cancelModalStyles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isWithin24Hours ? (
              <View
                style={[
                  cancelModalStyles.warningBox,
                  {
                    backgroundColor: colors.error + "10",
                    borderColor: colors.error + "30",
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text
                  style={[
                    cancelModalStyles.warningText,
                    { color: colors.error },
                  ]}
                >
                  Cancellation is not allowed within 24 hours of trip departure
                  ({Math.round(hoursUntilDeparture)} hours remaining). Please
                  contact the traveller directly.
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    cancelModalStyles.label,
                    { color: colors.text.primary },
                  ]}
                >
                  Reason (Optional)
                </Text>
                <TextInput
                  style={[
                    cancelModalStyles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      borderColor: colors.border.default,
                      color: colors.text.primary,
                    },
                  ]}
                  placeholder="Why are you cancelling? (optional)"
                  placeholderTextColor={colors.text.tertiary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                  maxLength={200}
                />
                <Text
                  style={[
                    cancelModalStyles.hint,
                    { color: colors.text.tertiary },
                  ]}
                >
                  Providing a reason helps improve our service
                </Text>
              </>
            )}
          </ScrollView>

          <View
            style={[
              cancelModalStyles.actions,
              { borderTopColor: colors.border.default },
            ]}
          >
            <Pressable
              style={[
                cancelModalStyles.button,
                cancelModalStyles.backButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text
                style={[
                  cancelModalStyles.backButtonText,
                  { color: colors.text.secondary },
                ]}
              >
                {isWithin24Hours ? "Close" : "Go Back"}
              </Text>
            </Pressable>

            {!isWithin24Hours && (
              <Pressable
                style={[
                  cancelModalStyles.button,
                  cancelModalStyles.cancelButton,
                  { backgroundColor: colors.error },
                ]}
                onPress={handleCancel}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <Text
                    style={[
                      cancelModalStyles.cancelButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    Cancel Request
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cancelModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    maxHeight: "80%",
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
  },
  content: {
    padding: Spacing.lg,
    maxHeight: 300,
  },
  warningBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: Typography.sizes.xs,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});

export default function RequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentRequest, loading, getRequestById, cancelRequest } =
    useRequestStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showEditReceiverModal, setShowEditReceiverModal] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

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
      if (
        error.message?.includes("24 hours") ||
        error.message?.includes("Cannot cancel")
      ) {
        Alert.alert(
          "Cannot Cancel",
          "Cancellation is not allowed within 24 hours of trip departure. Please contact the traveller directly.",
        );
      } else {
        Alert.alert("Error", error.message || "Failed to cancel request");
      }
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
  const statusConfig =
    REQUEST_STATUS_CONFIG[status] || REQUEST_STATUS_CONFIG.pending;
  const statusColor = colors[statusConfig.colorKey];

  const canCancel = currentRequest.status === "pending";
  const canEditDetails = currentRequest.status === "pending";
  const canEditReceiver = currentRequest.status !== "delivered";

  const categoryConfig =
    CATEGORY_CONFIG[currentRequest.category as keyof typeof CATEGORY_CONFIG];

  const isAccepted =
    currentRequest.status === "accepted" ||
    currentRequest.status === "picked_up" ||
    currentRequest.status === "delivered";

  // Get traveller info - need to fetch from trip's traveller relationship
  const tripData = currentRequest.trip as any;
  const travellerInfo = tripData?.traveller || null;

  // Get allowed categories for edit modal
  const allowedCategories = tripData?.allowed_categories || [];

  // Get transport icon safely
  const transportMode = currentRequest.trip?.transport_mode || "";
  const transportIcon =
    TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ||
    "arrow-forward";

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

            {/* Route */}
            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={styles.cityContainer}>
                  <Text
                    style={[styles.cityName, { color: colors.text.primary }]}
                  >
                    {currentRequest.trip.source}
                  </Text>
                </View>

                <View style={styles.routeMiddle}>
                  <View
                    style={[
                      styles.routeLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                  <View
                    style={[
                      styles.transportIcon,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <Ionicons
                      name={transportIcon}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View
                    style={[
                      styles.routeLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                </View>

                <View
                  style={[styles.cityContainer, { alignItems: "flex-end" }]}
                >
                  <Text
                    style={[styles.cityName, { color: colors.text.primary }]}
                  >
                    {currentRequest.trip.destination}
                  </Text>
                </View>
              </View>

              {/* Departure & Arrival */}
              <View style={styles.timingContainer}>
                <View style={styles.timingItem}>
                  <Ionicons
                    name="log-out-outline"
                    size={16}
                    color={colors.text.tertiary}
                  />
                  <View style={styles.timingDetails}>
                    <Text
                      style={[
                        styles.timingLabel,
                        { color: colors.text.tertiary },
                      ]}
                    >
                      Departure
                    </Text>
                    <Text
                      style={[
                        styles.timingValue,
                        { color: colors.text.primary },
                      ]}
                    >
                      {formatDate(currentRequest.trip.departure_date)} •{" "}
                      {formatTime(currentRequest.trip.departure_time)}
                    </Text>
                  </View>
                </View>

                {currentRequest.trip.arrival_date &&
                  currentRequest.trip.arrival_time && (
                    <View style={styles.timingItem}>
                      <Ionicons
                        name="log-in-outline"
                        size={16}
                        color={colors.text.tertiary}
                      />
                      <View style={styles.timingDetails}>
                        <Text
                          style={[
                            styles.timingLabel,
                            { color: colors.text.tertiary },
                          ]}
                        >
                          Arrival
                        </Text>
                        <Text
                          style={[
                            styles.timingValue,
                            { color: colors.text.primary },
                          ]}
                        >
                          {formatDate(currentRequest.trip.arrival_date)} •{" "}
                          {formatTime(currentRequest.trip.arrival_time)}
                        </Text>
                      </View>
                    </View>
                  )}
              </View>

              {/* Parcel Size Capacity */}
              {currentRequest.trip.parcel_size_capacity && (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border.light },
                    ]}
                  />
                  <View style={styles.detailItem}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.text.tertiary },
                      ]}
                    >
                      TRIP ACCEPTS
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: colors.text.primary },
                      ]}
                    >
                      {getSizeCapacityLabel(
                        currentRequest.trip.parcel_size_capacity,
                      )}{" "}
                      parcels
                    </Text>
                  </View>
                </>
              )}
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
            {canEditDetails && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditDetailsModal(true);
                }}
                hitSlop={10}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          {/* Description */}
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
              DESCRIPTION
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {currentRequest.item_description}
            </Text>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Category */}
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
              CATEGORY
            </Text>
            <View
              style={[
                styles.detailChip,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons
                name={categoryConfig.icon}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.detailChipText, { color: colors.primary }]}>
                {categoryConfig.label}
              </Text>
            </View>
          </View>

          {/* Photos */}
          {currentRequest.parcel_photos &&
            currentRequest.parcel_photos.length > 0 && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.light },
                  ]}
                />
                <View style={styles.photosSection}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    PHOTOS
                  </Text>
                  <PhotoGallery
                    photos={currentRequest.parcel_photos}
                    mode="thumbnail"
                    thumbnailSize={80}
                  />
                </View>
              </>
            )}
        </View>

        {/* Receiver Details Card */}
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
              <Ionicons name="person" size={20} color={colors.success} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Receiver Details
            </Text>
            {canEditReceiver && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditReceiverModal(true);
                }}
                hitSlop={10}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.success + "10" },
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={[styles.editButtonText, { color: colors.success }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailGridItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                NAME
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {currentRequest.delivery_contact_name}
              </Text>
            </View>

            <View style={styles.detailGridItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                PHONE
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.text.primary }]}
              >
                {currentRequest.delivery_contact_phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Traveller Details Card - Only when accepted */}
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
                Traveller Details
              </Text>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailGridItem}>
                <Text
                  style={[styles.detailLabel, { color: colors.text.tertiary }]}
                >
                  NAME
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.text.primary }]}
                >
                  {travellerInfo.full_name || "N/A"}
                </Text>
              </View>

              <View style={styles.detailGridItem}>
                <Text
                  style={[styles.detailLabel, { color: colors.text.tertiary }]}
                >
                  CONTACT
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.text.primary }]}
                >
                  {travellerInfo.phone || "N/A"}
                </Text>
              </View>
            </View>

            {/* Ticket PNR */}
            {tripData?.ticket_pnr && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.light },
                  ]}
                />
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    TICKET PNR
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.text.primary }]}
                  >
                    {tripData.ticket_pnr}
                  </Text>
                </View>
              </>
            )}

            {/* Ticket File */}
            {tripData?.ticket_file_url && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.light },
                  ]}
                />
                <Pressable
                  style={[
                    styles.ticketButton,
                    {
                      backgroundColor: colors.primary + "10",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleOpenTicket(tripData.ticket_file_url)}
                >
                  <Ionicons
                    name="document-text"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.ticketButtonText, { color: colors.primary }]}
                  >
                    View Ticket File
                  </Text>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Pickup OTP Card */}
        {currentRequest.status === "accepted" &&
          currentRequest.pickup_otp &&
          currentRequest.pickup_otp_expiry && (
            <View
              style={[
                styles.otpCard,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <View style={styles.otpHeader}>
                <View
                  style={[
                    styles.otpIconContainer,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Ionicons name="key" size={24} color={colors.primary} />
                </View>
                <View style={styles.otpHeaderText}>
                  <Text
                    style={[styles.otpLabel, { color: colors.text.primary }]}
                  >
                    Pickup OTP
                  </Text>
                  <Text
                    style={[
                      styles.otpInstruction,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Share this with the traveller at pickup
                  </Text>
                </View>
              </View>

              <Text style={[styles.otpCode, { color: colors.primary }]}>
                {currentRequest.pickup_otp}
              </Text>

              <Text style={[styles.otpExpiry, { color: colors.text.tertiary }]}>
                Valid until{" "}
                {new Date(currentRequest.pickup_otp_expiry).toLocaleString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </Text>
            </View>
          )}

        {/* Cancellation Info */}
        {currentRequest.status === "cancelled" && (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: colors.error + "10",
                borderColor: colors.error + "30",
              },
            ]}
          >
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.error }]}>
                Cancelled by{" "}
                {currentRequest.cancelled_by === "sender" ? "You" : "Traveller"}
              </Text>
              {currentRequest.rejection_reason && (
                <Text
                  style={[styles.alertText, { color: colors.text.primary }]}
                >
                  {currentRequest.rejection_reason}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Rejection Info */}
        {currentRequest.status === "rejected" &&
          currentRequest.rejection_reason && (
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.error + "10",
                  borderColor: colors.error + "30",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: colors.error }]}>
                  Request Rejected
                </Text>
                <Text
                  style={[styles.alertText, { color: colors.text.primary }]}
                >
                  {currentRequest.rejection_reason}
                </Text>
              </View>
            </View>
          )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Footer - Cancel Button */}
      {canCancel && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <Pressable
            style={[
              styles.cancelButton,
              {
                backgroundColor: colors.background.secondary,
                borderColor: colors.error,
              },
            ]}
            onPress={() => {
              haptics.light();
              setShowCancelModal(true);
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={[styles.cancelButtonText, { color: colors.error }]}>
              Cancel Request
            </Text>
          </Pressable>
        </View>
      )}

      {/* Modals */}
      <CancelRequestModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={handleCancel}
        tripDepartureDate={currentRequest.trip?.departure_date || ""}
      />

      {allowedCategories.length > 0 && (
        <>
          <EditRequestDetailsModal
            visible={showEditDetailsModal}
            request={currentRequest}
            allowedCategories={allowedCategories}
            onClose={() => setShowEditDetailsModal(false)}
            onSuccess={handleEditDetailsSuccess}
          />

          <EditReceiverDetailsModal
            visible={showEditReceiverModal}
            request={currentRequest}
            onClose={() => setShowEditReceiverModal(false)}
            onSuccess={handleEditReceiverSuccess}
          />
        </>
      )}
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
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  editButtonText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  routeContainer: {
    gap: Spacing.md,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  routeMiddle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  routeLine: {
    flex: 1,
    height: 2,
  },
  transportIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
  },
  timingContainer: {
    gap: Spacing.sm,
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timingDetails: {
    flex: 1,
  },
  timingLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  timingValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  divider: {
    height: 1,
  },
  detailItem: {
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  detailGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  detailGridItem: {
    flex: 1,
    gap: Spacing.xs,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  detailChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  photosSection: {
    gap: Spacing.sm,
  },
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  otpCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  otpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  otpHeaderText: {
    flex: 1,
  },
  otpLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  otpInstruction: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  otpCode: {
    fontSize: 40,
    fontWeight: Typography.weights.bold,
    textAlign: "center",
    letterSpacing: 8,
    marginVertical: Spacing.md,
  },
  otpExpiry: {
    fontSize: Typography.sizes.xs,
    textAlign: "center",
  },
  alertCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  alertText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
