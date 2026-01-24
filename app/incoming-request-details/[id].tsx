import AcceptRequestModal from "@/components/modals/AcceptRequestModal";
import RejectRequestModal from "@/components/modals/RejectRequestModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICONS: Record<string, IoniconsName> = {
  documents: "document-text-outline",
  electronics: "hardware-chip-outline",
  clothing: "shirt-outline",
  food: "fast-food-outline",
  medicines: "medical-outline",
  books: "book-outline",
  gifts: "gift-outline",
  others: "cube-outline",
};

const SIZE_LABELS: Record<string, string> = {
  small: "Small (< 2kg)",
  medium: "Medium (2-5kg)",
  large: "Large (5-10kg)",
};

export default function IncomingRequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    currentRequest,
    loading,
    getRequestById,
    acceptRequest,
    rejectRequest,
  } = useRequestStore();
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleAccept = async (notes?: string) => {
    try {
      await acceptRequest(id, notes);
      Alert.alert("Success", "Request accepted successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept request");
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectRequest(id, reason);
      Alert.alert("Request Rejected", "The sender has been notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject request");
    }
  };

  if (loading || !currentRequest) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Request Details" }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const request = currentRequest;
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";
  const isRejected = request.status === "rejected";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Request Details",
          headerStyle: { backgroundColor: Colors.background.primary },
          headerTintColor: Colors.text.primary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            isPending && styles.statusPending,
            isAccepted && styles.statusAccepted,
            isRejected && styles.statusRejected,
          ]}
        >
          <Text style={styles.statusText}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Text>
        </View>

        {/* Parcel Photos */}
        {request.parcel_photos && request.parcel_photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parcel Photos</Text>
            <PhotoGallery photos={request.parcel_photos} />
          </View>
        )}

        {/* Parcel Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcel Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={CATEGORY_ICONS[request.category] || "cube-outline"}
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Item Description</Text>
                <Text style={styles.detailValue}>
                  {request.item_description}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="pricetag-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>
                  {request.category.charAt(0).toUpperCase() +
                    request.category.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="resize-outline"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Size</Text>
                <Text style={styles.detailValue}>
                  {SIZE_LABELS[request.size]}
                </Text>
              </View>
            </View>

            {request.sender_notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Sender Notes:</Text>
                <Text style={styles.notesText}>{request.sender_notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sender Information */}
        {request.sender && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sender Information</Text>
            <View style={styles.card}>
              <View style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={Colors.primary}
                  />
                  <View style={styles.contactText}>
                    <Text style={styles.contactLabel}>Sender</Text>
                    <Text style={styles.contactValue}>
                      {request.sender.full_name}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.callButton}
                  onPress={() => handleCall(request.sender!.phone)}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Contact</Text>
          <View style={styles.card}>
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Ionicons
                  name="location-outline"
                  size={24}
                  color={Colors.primary}
                />
                <View style={styles.contactText}>
                  <Text style={styles.contactLabel}>Receiver</Text>
                  <Text style={styles.contactValue}>
                    {request.delivery_contact_name}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.callButton}
                onPress={() => handleCall(request.delivery_contact_phone)}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={Colors.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Trip Information */}
        {request.trip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <View style={styles.card}>
              <View style={styles.tripRow}>
                <Ionicons
                  name="navigate-outline"
                  size={20}
                  color={Colors.text.secondary}
                />
                <Text style={styles.tripText}>
                  {request.trip.source} → {request.trip.destination}
                </Text>
              </View>
              <View style={styles.tripRow}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.text.secondary}
                />
                <Text style={styles.tripText}>
                  {new Date(request.trip.departure_date).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}{" "}
                  at {request.trip.departure_time}
                </Text>
              </View>
              <View style={styles.tripRow}>
                <Ionicons
                  name={
                    request.trip.transport_mode === "flight"
                      ? "airplane-outline"
                      : request.trip.transport_mode === "train"
                        ? "train-outline"
                        : request.trip.transport_mode === "bus"
                          ? "bus-outline"
                          : "car-outline"
                  }
                  size={20}
                  color={Colors.text.secondary}
                />
                <Text style={styles.tripText}>
                  {request.trip.transport_mode.charAt(0).toUpperCase() +
                    request.trip.transport_mode.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Rejection Reason (if rejected) */}
        {isRejected && request.rejection_reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rejection Reason</Text>
            <View style={[styles.card, styles.rejectionCard]}>
              <Text style={styles.rejectionText}>
                {request.rejection_reason}
              </Text>
            </View>
          </View>
        )}

        {/* Traveller Notes (if accepted) */}
        {isAccepted && request.traveller_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{request.traveller_notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Action Buttons (only for pending requests) */}
      {isPending && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => setRejectModalVisible(true)}
          >
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={Colors.text.inverse}
            />
            <Text style={styles.actionButtonText}>Reject</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => setAcceptModalVisible(true)}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color={Colors.text.inverse}
            />
            <Text style={styles.actionButtonText}>Accept</Text>
          </Pressable>
        </View>
      )}

      {/* Modals */}
      <AcceptRequestModal
        visible={acceptModalVisible}
        onClose={() => setAcceptModalVisible(false)}
        onAccept={handleAccept}
        senderName={request.sender?.full_name || "Sender"}
      />

      <RejectRequestModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onReject={handleReject}
        senderName={request.sender?.full_name || "Sender"}
      />
    </>
  );
}

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
  content: {
    padding: Spacing.lg,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusPending: {
    backgroundColor: Colors.warning + "20",
  },
  statusAccepted: {
    backgroundColor: Colors.success + "20",
  },
  statusRejected: {
    backgroundColor: Colors.error + "20",
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary + "15",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  notesContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  notesLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  callButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary + "15",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tripText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  rejectionCard: {
    backgroundColor: Colors.error + "10",
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  rejectionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
