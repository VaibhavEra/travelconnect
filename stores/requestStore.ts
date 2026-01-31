import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { Database } from "@/types/database.types";
import { create } from "zustand";

// Type for parcel request from database
type DbParcelRequest = Database["public"]["Tables"]["parcel_requests"]["Row"];

// NEW: Type definitions for RPC function returns
type PickupOtpVerificationResult = {
  request_id: string;
  status: string;
  delivery_otp: string;
  delivery_otp_expiry: string;
};

type DeliveryOtpVerificationResult = {
  request_id: string;
  status: string;
  delivered_at: string;
};

// Extended type with trip information
export interface ParcelRequest extends DbParcelRequest {
  trip?: {
    source: string;
    destination: string;
    departure_date: string;
    departure_time: string;
    arrival_date: string;
    arrival_time: string;
    transport_mode: string;
    parcel_size_capacity: string; // NEW: Added for display
  } | null;
  sender?: {
    full_name: string;
    phone: string;
  } | null;
}

// UPDATED: Form data for creating request (removed size and sender_notes)
export interface CreateRequestData {
  trip_id: string;
  item_description: string;
  category: string;
  parcel_photos: string[];
  delivery_contact_name: string;
  delivery_contact_phone: string;
  // REMOVED: size (comes from trip now)
  // REMOVED: sender_notes
}

interface RequestState {
  // State
  myRequests: ParcelRequest[];
  incomingRequests: ParcelRequest[];
  acceptedRequests: ParcelRequest[];
  currentRequest: ParcelRequest | null;
  loading: boolean;
  error: string | null;

  // Actions
  createRequest: (data: CreateRequestData, senderId: string) => Promise<void>;
  getMyRequests: (senderId: string) => Promise<void>;
  getIncomingRequests: (travellerId: string) => Promise<void>;
  getAcceptedRequests: (travellerId: string) => Promise<void>;
  getRequestById: (requestId: string) => Promise<ParcelRequest | null>;
  acceptRequest: (requestId: string) => Promise<void>; // UPDATED: Removed travellerNotes param
  rejectRequest: (requestId: string, reason?: string) => Promise<void>; // UPDATED: Now uses proper rejection
  cancelRequest: (requestId: string, reason?: string) => Promise<void>;
  updateRequestStatus: (
    requestId: string,
    status: DbParcelRequest["status"],
  ) => Promise<void>;

  // OTP Methods
  verifyPickupOtp: (requestId: string, otp: string) => Promise<boolean>;
  verifyDeliveryOtp: (requestId: string, otp: string) => Promise<boolean>;
  getPickupOtp: (requestId: string) => Promise<string | null>;
  getDeliveryOtp: (requestId: string) => Promise<string | null>;

  // NEW: Regenerate OTP methods
  regeneratePickupOtp: (requestId: string) => Promise<string>;
  regenerateDeliveryOtp: (requestId: string) => Promise<string>;

  // UPDATED: Update receiver details (now allowed until delivered)
  updateReceiverDetails: (
    requestId: string,
    delivery_contact_name: string,
    delivery_contact_phone: string,
  ) => Promise<void>;

  // NEW: Generate cancellation OTP for trip cancellation after pickup
  generateCancellationOtp: (requestId: string) => Promise<string>;

  // NEW: Check if request details can be edited
  canEditRequestDetails: (requestId: string) => Promise<boolean>;

  // NEW: Update request details (description, photos, category)
  updateRequestDetails: (
    requestId: string,
    item_description: string,
    category: string,
    parcel_photos: string[],
  ) => Promise<void>;

  clearError: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  // Initial state
  myRequests: [],
  incomingRequests: [],
  acceptedRequests: [],
  currentRequest: null,
  loading: false,
  error: null,

  // ============================================================================
  // UPDATED: Create new parcel request with server-side validation
  // ============================================================================
  createRequest: async (data: CreateRequestData, senderId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Removed p_size and p_sender_notes
      const rpcParams = {
        p_trip_id: data.trip_id,
        p_item_description: data.item_description,
        p_category: data.category,
        p_parcel_photos: data.parcel_photos,
        p_delivery_contact_name: data.delivery_contact_name,
        p_delivery_contact_phone: data.delivery_contact_phone,
      };

      // Use RPC function for server-side validation and OTP generation
      const { data: requestId, error: rpcError } = await supabase.rpc(
        "create_request_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      // UPDATED: Fetch the created request with trip details (including parcel_size_capacity)
      const { data: request, error: fetchError } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, arrival_date, arrival_time, transport_mode, parcel_size_capacity)
        `,
        )
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      set((state) => ({
        myRequests: [request as ParcelRequest, ...state.myRequests],
        loading: false,
      }));

      logger.info("Request created successfully", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Create request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Get sender's own requests
  getMyRequests: async (senderId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Added parcel_size_capacity to trip selection
      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, arrival_date, arrival_time, transport_mode, parcel_size_capacity)
        `,
        )
        .eq("sender_id", senderId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ myRequests: (requests || []) as ParcelRequest[], loading: false });
      logger.info("Fetched my requests", { count: requests?.length || 0 });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Fetch my requests failed", error);
      set({ loading: false, error: errorMessage, myRequests: [] });
    }
  },

  // Get traveller's incoming requests
  getIncomingRequests: async (travellerId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Added parcel_size_capacity to trip selection
      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips!inner(source, destination, departure_date, departure_time, arrival_date, arrival_time, transport_mode, parcel_size_capacity),
          sender:profiles!parcel_requests_sender_id_fkey(full_name, phone)
        `,
        )
        .eq("trip.traveller_id", travellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({
        incomingRequests: (requests || []) as ParcelRequest[],
        loading: false,
      });
      logger.info("Fetched incoming requests", {
        count: requests?.length || 0,
      });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Fetch incoming requests failed", error);
      set({ loading: false, error: errorMessage, incomingRequests: [] });
    }
  },

  // Get traveller's accepted requests (active deliveries)
  getAcceptedRequests: async (travellerId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Added parcel_size_capacity to trip selection
      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips!inner(source, destination, departure_date, departure_time, arrival_date, arrival_time, transport_mode, parcel_size_capacity),
          sender:profiles!parcel_requests_sender_id_fkey(full_name, phone)
        `,
        )
        .eq("trip.traveller_id", travellerId)
        .in("status", ["accepted", "picked_up", "delivered"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({
        acceptedRequests: (requests || []) as ParcelRequest[],
        loading: false,
      });
      logger.info("Fetched accepted requests", {
        count: requests?.length || 0,
      });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Fetch accepted requests failed", error);
      set({ loading: false, error: errorMessage, acceptedRequests: [] });
    }
  },

  // Get single request by ID
  getRequestById: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Added parcel_size_capacity to trip selection
      const { data: request, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, arrival_date, arrival_time, transport_mode, parcel_size_capacity),
          sender:profiles!parcel_requests_sender_id_fkey(full_name, phone)
        `,
        )
        .eq("id", requestId)
        .single();

      if (error) throw error;

      const parcelRequest = request as ParcelRequest;
      set({ currentRequest: parcelRequest, loading: false });
      logger.info("Fetched request", { requestId });
      return parcelRequest;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Get request failed", error);
      set({ loading: false, error: errorMessage, currentRequest: null });
      return null;
    }
  },

  // ============================================================================
  // UPDATED: Accept request with atomic slot decrement + trip refresh
  // ============================================================================
  acceptRequest: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Removed travellerNotes parameter
      const rpcParams = {
        p_request_id: requestId,
      };

      // Use atomic RPC to prevent race conditions
      const { data: result, error: rpcError } = await supabase.rpc(
        "accept_request_atomic",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      logger.info("Request accepted atomically", { result });

      // Refresh the request to get latest data
      const request = await get().getRequestById(requestId);

      // Refresh the trip to get updated status (should be 'locked' now)
      if (request?.trip_id) {
        const { useTripStore } = await import("./tripStore");
        await useTripStore.getState().getTripById(request.trip_id);
      }

      // Update local state
      set((state) => ({
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "accepted" as const,
              }
            : req,
        ),
        loading: false,
      }));

      logger.info("Request accepted", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Accept request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // UPDATED: Reject request with proper rejection (not cancellation)
  // ============================================================================
  rejectRequest: async (requestId: string, reason?: string) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Use new reject_request function instead of cancel_request_with_validation
      const rpcParams: any = {
        p_request_id: requestId,
      };

      if (reason) {
        rpcParams.p_rejection_reason = reason;
      }

      const { data: result, error: rpcError } = await supabase.rpc(
        "reject_request",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      // Update local state (status is 'rejected', not 'cancelled')
      set((state) => ({
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "rejected" as const,
                rejection_reason: reason || null,
              }
            : req,
        ),
        loading: false,
      }));

      logger.info("Request rejected by traveller", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Reject request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // Cancel request with 24h validation (sender cancellation)
  // ============================================================================
  cancelRequest: async (requestId: string, reason?: string) => {
    try {
      set({ loading: true, error: null });

      // Prepare RPC parameters
      const rpcParams: any = {
        p_request_id: requestId,
        p_cancelled_by: "sender",
      };

      // Only add p_cancellation_reason if it exists
      if (reason) {
        rpcParams.p_cancellation_reason = reason;
      }

      // Use RPC to enforce 24h cancellation rule
      const { data: result, error: rpcError } = await supabase.rpc(
        "cancel_request_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      logger.info("Request cancelled with validation", { result });

      // Update local state
      set((state) => ({
        myRequests: state.myRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "cancelled" as const,
                cancelled_by: "sender",
                rejection_reason: reason || null,
              }
            : req,
        ),
        loading: false,
      }));

      logger.info("Request cancelled", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Cancel request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Update request status (generic)
  updateRequestStatus: async (
    requestId: string,
    status: DbParcelRequest["status"],
  ) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("parcel_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update all local states
      set((state) => ({
        myRequests: state.myRequests.map((req) =>
          req.id === requestId ? { ...req, status } : req,
        ),
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId ? { ...req, status } : req,
        ),
        acceptedRequests: state.acceptedRequests.map((req) =>
          req.id === requestId ? { ...req, status } : req,
        ),
        loading: false,
      }));

      logger.info("Request status updated", { requestId, status });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update status failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // OTP VERIFICATION METHODS
  // ============================================================================

  // ============================================================================
  // Verify pickup OTP (now returns JSON directly from DB)
  // ============================================================================
  verifyPickupOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.rpc("verify_pickup_otp", {
        p_request_id: requestId,
        p_otp: otp,
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No data returned from verification");
      }

      const result = data as unknown as PickupOtpVerificationResult;

      logger.info("Pickup verified, delivery OTP generated", {
        requestId,
        deliveryOtp: result.delivery_otp,
      });

      if (result.status === "picked_up") {
        if (get().currentRequest?.id === requestId) {
          await get().getRequestById(requestId);
        }

        set((state) => ({
          acceptedRequests: state.acceptedRequests.map((req) =>
            req.id === requestId
              ? { ...req, status: "picked_up" as const }
              : req,
          ),
          loading: false,
        }));

        return true;
      } else {
        set({ loading: false });
        return false;
      }
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Verify pickup OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // Verify delivery OTP (now returns JSON directly from DB)
  // ============================================================================
  verifyDeliveryOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.rpc("verify_delivery_otp", {
        p_request_id: requestId,
        p_otp: otp,
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No data returned from verification");
      }

      const result = data as unknown as DeliveryOtpVerificationResult;

      logger.info("Delivery verified", {
        requestId,
        deliveredAt: result.delivered_at,
      });

      if (result.status === "delivered") {
        if (get().currentRequest?.id === requestId) {
          await get().getRequestById(requestId);
        }

        set((state) => ({
          acceptedRequests: state.acceptedRequests.map((req) =>
            req.id === requestId
              ? { ...req, status: "delivered" as const }
              : req,
          ),
          loading: false,
        }));

        return true;
      } else {
        set({ loading: false });
        return false;
      }
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Verify delivery OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Get pickup OTP for display (sender needs to see it)
  getPickupOtp: async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from("parcel_requests")
        .select("pickup_otp")
        .eq("id", requestId)
        .single();

      if (error) throw error;
      return data?.pickup_otp || null;
    } catch (error) {
      logger.error("Get pickup OTP failed", error);
      return null;
    }
  },

  // Get delivery OTP for display (receiver needs to see it)
  getDeliveryOtp: async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from("parcel_requests")
        .select("delivery_otp")
        .eq("id", requestId)
        .single();

      if (error) throw error;
      return data?.delivery_otp || null;
    } catch (error) {
      logger.error("Get delivery OTP failed", error);
      return null;
    }
  },

  // ============================================================================
  // NEW: Regenerate pickup OTP (when expired or failed)
  // ============================================================================
  regeneratePickupOtp: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: newOtp, error } = await supabase.rpc(
        "regenerate_pickup_otp",
        { p_request_id: requestId },
      );

      if (error) throw error;

      // Refresh request to get updated status (should be 'accepted' again if was 'failed')
      await get().getRequestById(requestId);

      set({ loading: false });
      logger.info("Pickup OTP regenerated", { requestId });

      return newOtp as string;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Regenerate pickup OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // NEW: Regenerate delivery OTP (when expired or failed)
  // ============================================================================
  regenerateDeliveryOtp: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: newOtp, error } = await supabase.rpc(
        "regenerate_delivery_otp",
        { p_request_id: requestId },
      );

      if (error) throw error;

      // Refresh request to get updated status (should be 'picked_up' again if was 'failed')
      await get().getRequestById(requestId);

      set({ loading: false });
      logger.info("Delivery OTP regenerated", { requestId });

      return newOtp as string;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Regenerate delivery OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // UPDATED: Update receiver details (now allowed until delivered)
  // ============================================================================
  updateReceiverDetails: async (
    requestId: string,
    delivery_contact_name: string,
    delivery_contact_phone: string,
  ) => {
    try {
      set({ loading: true, error: null });

      // UPDATED: Check current status - now allowed until delivered
      const { data: request, error: fetchError } = await supabase
        .from("parcel_requests")
        .select("status")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      // UPDATED: Can edit until delivered (not just pending)
      if (request.status === "delivered") {
        throw new Error("Cannot edit receiver details after delivery");
      }

      const { error } = await supabase
        .from("parcel_requests")
        .update({
          delivery_contact_name,
          delivery_contact_phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        myRequests: state.myRequests.map((req) =>
          req.id === requestId
            ? { ...req, delivery_contact_name, delivery_contact_phone }
            : req,
        ),
        loading: false,
      }));

      logger.info("Receiver details updated", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update receiver details failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ============================================================================
  // NEW: Generate cancellation OTP for trip cancellation after pickup
  // ============================================================================
  generateCancellationOtp: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: cancellationOtp, error } = await supabase.rpc(
        "generate_cancellation_otp",
        { p_request_id: requestId },
      );

      if (error) throw error;

      set({ loading: false });
      logger.info("Cancellation OTP generated", { requestId });

      return cancellationOtp as string;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Generate cancellation OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Add method to check if details can be edited
  canEditRequestDetails: async (requestId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("can_edit_request_details", {
        p_request_id: requestId,
      });

      if (error) {
        logger.error("Check edit permission failed", error);
        return false;
      }

      return data ?? false;
    } catch (error) {
      logger.error("canEditRequestDetails error", error);
      return false;
    }
  },

  // Add method to update request details (description, photos, category)
  updateRequestDetails: async (
    requestId: string,
    item_description: string,
    category: string,
    parcel_photos: string[],
  ) => {
    try {
      set({ loading: true, error: null });

      const { data: result, error } = await supabase.rpc(
        "update_request_details",
        {
          p_request_id: requestId,
          p_item_description: item_description,
          p_category: category,
          p_parcel_photos: parcel_photos,
        },
      );

      if (error) throw error;

      // Refresh request to get updated data
      await get().getRequestById(requestId);

      set({ loading: false });
      logger.info("Request details updated", { requestId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update request details failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
