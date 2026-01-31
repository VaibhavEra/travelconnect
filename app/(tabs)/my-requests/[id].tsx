import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TRANSPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  flight: "airplane",
  train: "train",
  bus: "bus",
};

// Cancel Request Modal Component - FIXED: Keyboard-aware
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

          {/* FIXED: ScrollView for keyboard visibility */}
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

export default function RequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentRequest, loading, getRequestById, cancelRequest } =
    useRequestStore();
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  const categoryConfig =
    CATEGORY_CONFIG[currentRequest.category as keyof typeof CATEGORY_CONFIG];
  const sizeConfig =
    SIZE_CONFIG[currentRequest.size as keyof typeof SIZE_CONFIG];

  const isAccepted =
    currentRequest.status === "accepted" ||
    currentRequest.status === "picked_up" ||
    currentRequest.status === "delivered";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header - FIXED: Left-aligned with status badge */}
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
                  {currentRequest.trip.transport_mode && (
                    <View
                      style={[
                        styles.transportIcon,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name={
                          TRANSPORT_ICONS[currentRequest.trip.transport_mode] ||
                          "arrow-forward"
                        }
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                  )}
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

              {/* FIXED: Departure & Arrival both shown */}
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

                {(currentRequest.trip as any).arrival_date &&
                  (currentRequest.trip as any).arrival_time && (
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
                          {formatDate(
                            (currentRequest.trip as any).arrival_date,
                          )}{" "}
                          •{" "}
                          {formatTime(
                            (currentRequest.trip as any).arrival_time,
                          )}
                        </Text>
                      </View>
                    </View>
                  )}
              </View>
            </View>
          </View>
        )}

        {/* Parcel Details Card - FIXED: Description → Size → Category → Photos */}
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
          </View>

          {/* 1. Description - FIXED: Label different size */}
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

          {/* 2 & 3. Size & Category */}
          <View style={styles.detailGrid}>
            <View style={styles.detailGridItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                SIZE
              </Text>
              <View
                style={[
                  styles.detailChip,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name={sizeConfig.icon}
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.detailChipText, { color: colors.primary }]}
                >
                  {sizeConfig.label}
                </Text>
              </View>
            </View>

            <View style={styles.detailGridItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                CATEGORY
              </Text>
              <View
                style={[
                  styles.detailChip,
                  { backgroundColor: colors.background.primary },
                ]}
              >
                <Ionicons
                  name={categoryConfig.icon}
                  size={16}
                  color={colors.text.secondary}
                />
                <Text
                  style={[
                    styles.detailChipText,
                    { color: colors.text.secondary },
                  ]}
                >
                  {categoryConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Photos - USING EXISTING PhotoGallery COMPONENT */}
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

        {/* NEW: Traveller Details Card - Only when accepted */}
        {isAccepted && (currentRequest as any).traveller && (
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
                  {(currentRequest as any).traveller.full_name || "N/A"}
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
                  {(currentRequest as any).traveller.phone_number || "N/A"}
                </Text>
              </View>
            </View>

            {/* Ticket PNR */}
            {(currentRequest.trip as any).ticket_pnr && (
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
                    {(currentRequest.trip as any).ticket_pnr}
                  </Text>
                </View>
              </>
            )}

            {/* Ticket File */}
            {(currentRequest.trip as any).ticket_file_url && (
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
                  onPress={() =>
                    handleOpenTicket(
                      (currentRequest.trip as any).ticket_file_url,
                    )
                  }
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

        {/* Pickup OTP Card - FIXED: Better placement and styling */}
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

        {/* Traveller's Notes */}
        {currentRequest.status === "accepted" &&
          currentRequest.traveller_notes && (
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary + "30",
                },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: colors.primary }]}>
                  Traveller's Notes
                </Text>
                <Text
                  style={[styles.alertText, { color: colors.text.primary }]}
                >
                  {currentRequest.traveller_notes}
                </Text>
              </View>
            </View>
          )}

        {/* Cancel Button */}
        {canCancel && (
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
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      <CancelRequestModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={handleCancel}
        tripDepartureDate={currentRequest.trip?.departure_date || ""}
      />
    </SafeAreaView>
  );
}

const cancelModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    borderRadius: BorderRadius.xl,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
    maxHeight: 200,
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
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    minHeight: 80,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
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
    borderRadius: BorderRadius.lg,
    alignItems: "center",
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
    gap: 4,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
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
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  routeMiddle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  routeLine: {
    width: 24,
    height: 2,
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -8,
  },
  timingContainer: {
    gap: Spacing.md,
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  timingDetails: {
    flex: 1,
    gap: 2,
  },
  timingLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  timingValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  detailItem: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  detailGrid: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailGridItem: {
    flex: 1,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
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
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    textAlign: "center",
  },
  otpCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    alignItems: "center",
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    width: "100%",
  },
  otpIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  otpHeaderText: {
    flex: 1,
    gap: 2,
  },
  otpLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  otpInstruction: {
    fontSize: Typography.sizes.sm,
  },
  otpCode: {
    fontSize: 48,
    fontWeight: Typography.weights.bold,
    letterSpacing: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  otpExpiry: {
    fontSize: Typography.sizes.xs,
  },
  alertCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  alertContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  alertTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  alertText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
