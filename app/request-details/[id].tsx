import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if within 24 hours
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
      // Error already handled by parent
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
      <View style={cancelModalStyles.overlay}>
        <View style={cancelModalStyles.modal}>
          <View style={cancelModalStyles.header}>
            <Ionicons name="warning" size={48} color={Colors.warning} />
            <Text style={cancelModalStyles.title}>Cancel Request</Text>
            <Text style={cancelModalStyles.subtitle}>
              {isWithin24Hours
                ? "Cannot cancel within 24 hours of departure"
                : "Are you sure you want to cancel this request?"}
            </Text>
          </View>

          <View style={cancelModalStyles.content}>
            {isWithin24Hours ? (
              <View style={cancelModalStyles.warningBox}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={cancelModalStyles.warningText}>
                  Cancellation is not allowed within 24 hours of trip departure
                  ({Math.round(hoursUntilDeparture)} hours remaining). Please
                  contact the traveller directly.
                </Text>
              </View>
            ) : (
              <>
                <Text style={cancelModalStyles.label}>Reason (Optional)</Text>
                <TextInput
                  style={cancelModalStyles.input}
                  placeholder="Why are you cancelling? (optional)"
                  placeholderTextColor={Colors.text.tertiary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                  maxLength={200}
                />
                <Text style={cancelModalStyles.hint}>
                  Providing a reason helps improve our service
                </Text>
              </>
            )}
          </View>

          <View style={cancelModalStyles.actions}>
            <Pressable
              style={[cancelModalStyles.button, cancelModalStyles.backButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={cancelModalStyles.backButtonText}>
                {isWithin24Hours ? "Close" : "Go Back"}
              </Text>
            </Pressable>

            {!isWithin24Hours && (
              <Pressable
                style={[
                  cancelModalStyles.button,
                  cancelModalStyles.cancelButton,
                ]}
                onPress={handleCancel}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text.inverse} size="small" />
                ) : (
                  <Text style={cancelModalStyles.cancelButtonText}>
                    Cancel Request
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentRequest, loading, getRequestById, cancelRequest } =
    useRequestStore();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCancel = async (reason?: string) => {
    try {
      await cancelRequest(id, reason);
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
      // Handle 24h cancellation error
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

  if (loading || !currentRequest) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const status = currentRequest.status as RequestStatus;
  const statusColor = STATUS_COLORS[status] || Colors.text.secondary;
  const statusLabel = STATUS_LABELS[status] || currentRequest.status;
  const canCancel = currentRequest.status === "pending";

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Request Details</Text>
          <View style={styles.placeholder} />
        </View>

        <View
          style={[styles.statusBanner, { backgroundColor: statusColor + "20" }]}
        >
          <Text style={[styles.statusBannerText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        {currentRequest.trip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Information</Text>
            <View style={styles.routeContainer}>
              <View style={styles.locationItem}>
                <View style={styles.locationDot} />
                <Text style={styles.locationText}>
                  {currentRequest.trip.source}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationItem}>
                <View style={[styles.locationDot, styles.locationDotEnd]} />
                <Text style={styles.locationText}>
                  {currentRequest.trip.destination}
                </Text>
              </View>
            </View>

            <View style={styles.tripDetails}>
              <View style={styles.tripDetailItem}>
                <Ionicons
                  name="calendar"
                  size={18}
                  color={Colors.text.secondary}
                />
                <View>
                  <Text style={styles.tripDetailLabel}>Departure</Text>
                  <Text style={styles.tripDetailValue}>
                    {formatDate(currentRequest.trip.departure_date)} at{" "}
                    {formatTime(currentRequest.trip.departure_time)}
                  </Text>
                </View>
              </View>

              <View style={styles.tripDetailItem}>
                <Ionicons
                  name={
                    currentRequest.trip.transport_mode === "train"
                      ? "train"
                      : currentRequest.trip.transport_mode === "bus"
                        ? "bus"
                        : currentRequest.trip.transport_mode === "flight"
                          ? "airplane"
                          : "car"
                  }
                  size={18}
                  color={Colors.text.secondary}
                />
                <View>
                  <Text style={styles.tripDetailLabel}>Transport</Text>
                  <Text style={styles.tripDetailValue}>
                    {currentRequest.trip.transport_mode
                      .charAt(0)
                      .toUpperCase() +
                      currentRequest.trip.transport_mode.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcel Details</Text>

          {currentRequest.parcel_photos &&
            currentRequest.parcel_photos.length > 0 && (
              <View style={styles.photosSection}>
                <Image
                  source={{
                    uri: currentRequest.parcel_photos[selectedPhotoIndex],
                  }}
                  style={styles.mainPhoto}
                />
                {currentRequest.parcel_photos.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photoThumbnails}
                  >
                    {currentRequest.parcel_photos.map((photo, index) => (
                      <Pressable
                        key={index}
                        onPress={() => setSelectedPhotoIndex(index)}
                      >
                        <Image
                          source={{ uri: photo }}
                          style={[
                            styles.thumbnail,
                            selectedPhotoIndex === index &&
                              styles.thumbnailActive,
                          ]}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>
              {currentRequest.item_description}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>
                {currentRequest.category.charAt(0).toUpperCase() +
                  currentRequest.category.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>
              {currentRequest.size.charAt(0).toUpperCase() +
                currentRequest.size.slice(1)}
            </Text>
          </View>

          {currentRequest.sender_notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>
                {currentRequest.sender_notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receiver Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>
              {currentRequest.delivery_contact_name}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>
              {currentRequest.delivery_contact_phone}
            </Text>
          </View>
        </View>

        {/*  FIXED: Pickup OTP Section - Only show after acceptance */}
        {currentRequest.status === "accepted" &&
          currentRequest.pickup_otp &&
          currentRequest.pickup_otp_expiry && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pickup OTP</Text>
              <View style={styles.otpCard}>
                <View style={styles.otpIconContainer}>
                  <Ionicons name="key" size={32} color={Colors.primary} />
                </View>
                <View style={styles.otpContent}>
                  <Text style={styles.otpInstruction}>
                    Share this code with the traveller at pickup:
                  </Text>
                  <Text style={styles.otpCode}>
                    {currentRequest.pickup_otp}
                  </Text>
                  <Text style={styles.otpExpiry}>
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
              </View>
            </View>
          )}

        {/* Cancellation Details Section */}
        {currentRequest.status === "cancelled" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Details</Text>
            <View style={styles.cancellationBox}>
              <View style={styles.cancellationHeader}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <Text style={styles.cancellationTitle}>
                  Cancelled by{" "}
                  {currentRequest.cancelled_by === "sender"
                    ? "You"
                    : "Traveller"}
                </Text>
              </View>
              {currentRequest.rejection_reason && (
                <Text style={styles.cancellationReason}>
                  Reason: {currentRequest.rejection_reason}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Rejection Reason - only for rejected status */}
        {currentRequest.status === "rejected" &&
          currentRequest.rejection_reason && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rejection Reason</Text>
              <View style={styles.rejectionBox}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} />
                <Text style={styles.rejectionText}>
                  {currentRequest.rejection_reason}
                </Text>
              </View>
            </View>
          )}

        {currentRequest.status === "accepted" &&
          currentRequest.traveller_notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Traveller's Notes</Text>
              <Text style={styles.detailValue}>
                {currentRequest.traveller_notes}
              </Text>
            </View>
          )}

        {canCancel && (
          <Pressable
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
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
    </View>
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
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  warningBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.error + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    minHeight: 80,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  backButton: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  backButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },
  cancelButton: {
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  statusBanner: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusBannerText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  section: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  routeContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  locationDotEnd: {
    backgroundColor: Colors.success,
  },
  locationText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border.default,
    marginLeft: 5,
  },
  tripDetails: {
    gap: Spacing.sm,
  },
  tripDetailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  tripDetailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  tripDetailValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  photosSection: {
    marginBottom: Spacing.md,
  },
  mainPhoto: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.sm,
  },
  photoThumbnails: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailActive: {
    borderColor: Colors.primary,
  },
  detailRow: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  // ✅ NEW: OTP Card Styles
  otpCard: {
    flexDirection: "row",
    backgroundColor: Colors.primary + "10",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
    gap: Spacing.md,
  },
  otpIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primary + "20",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  otpContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  otpInstruction: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },
  otpCode: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    letterSpacing: 4,
  },
  otpExpiry: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },
  cancellationBox: {
    backgroundColor: Colors.error + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + "30",
    gap: Spacing.sm,
  },
  cancellationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  cancellationTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.error,
  },
  cancellationReason: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.sm * 1.5,
    paddingLeft: Spacing.xl,
  },
  rejectionBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.error + "10",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rejectionText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    marginTop: Spacing.md,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.error,
  },
});
