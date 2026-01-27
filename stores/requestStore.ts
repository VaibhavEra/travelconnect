import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { Database } from "@/types/database.types";
import { create } from "zustand";

// Type for parcel request from database
type DbParcelRequest = Database["public"]["Tables"]["parcel_requests"]["Row"];

// Extended type with trip information
export interface ParcelRequest extends DbParcelRequest {
  trip?: {
    source: string;
    destination: string;
    departure_date: string;
    departure_time: string;
    transport_mode: string;
  } | null;
  sender?: {
    full_name: string;
    phone: string;
  } | null;
}

// Form data for creating request
export interface CreateRequestData {
  trip_id: string;
  item_description: string;
  category: string;
  size: "small" | "medium" | "large";
  parcel_photos: string[];
  delivery_contact_name: string;
  delivery_contact_phone: string;
  sender_notes?: string;
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
  acceptRequest: (requestId: string, travellerNotes?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;
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

      // Prepare RPC parameters (only include p_sender_notes if it has a value)
      const rpcParams: any = {
        p_trip_id: data.trip_id,
        p_item_description: data.item_description,
        p_category: data.category,
        p_size: data.size,
        p_parcel_photos: data.parcel_photos,
        p_delivery_contact_name: data.delivery_contact_name,
        p_delivery_contact_phone: data.delivery_contact_phone,
      };

      // Only add p_sender_notes if it exists
      if (data.sender_notes) {
        rpcParams.p_sender_notes = data.sender_notes;
      }

      // Use RPC function for server-side validation and OTP generation
      const { data: requestId, error: rpcError } = await supabase.rpc(
        "create_request_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      // Fetch the created request with trip details
      const { data: request, error: fetchError } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, transport_mode)
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

      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, transport_mode)
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

      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips!inner(source, destination, departure_date, departure_time, transport_mode),
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

      const { data: requests, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips!inner(source, destination, departure_date, departure_time, transport_mode),
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

      const { data: request, error } = await supabase
        .from("parcel_requests")
        .select(
          `
          *,
          trip:trips(source, destination, departure_date, departure_time, transport_mode),
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
  // UPDATED: Accept request with atomic slot decrement
  // ============================================================================
  acceptRequest: async (requestId: string, travellerNotes?: string) => {
    try {
      set({ loading: true, error: null });

      // Prepare RPC parameters (only include p_traveller_notes if it has a value)
      const rpcParams: any = {
        p_request_id: requestId,
      };

      // Only add p_traveller_notes if it exists
      if (travellerNotes) {
        rpcParams.p_traveller_notes = travellerNotes;
      }

      // Use atomic RPC to prevent race conditions
      const { data: result, error: rpcError } = await supabase.rpc(
        "accept_request_atomic",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      logger.info("Request accepted atomically", { result });

      // Refresh incoming and accepted requests
      set((state) => ({
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "accepted" as const,
                traveller_notes: travellerNotes || null,
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
  // UPDATED: Reject request with validation (uses cancel_request_with_validation)
  // ============================================================================
  rejectRequest: async (requestId: string, reason: string) => {
    try {
      set({ loading: true, error: null });

      // Prepare RPC parameters
      const rpcParams: any = {
        p_request_id: requestId,
        p_cancelled_by: "traveller",
      };

      // Only add p_cancellation_reason if it exists
      if (reason) {
        rpcParams.p_cancellation_reason = reason;
      }

      // Use cancel_request_with_validation with traveller as cancelled_by
      const { data: result, error: rpcError } = await supabase.rpc(
        "cancel_request_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      // Update local state
      set((state) => ({
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "cancelled" as const,
                cancelled_by: "traveller",
                rejection_reason: reason,
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
  // UPDATED: Cancel request with 24h validation
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
  // UPDATED: Verify pickup OTP (new signature, returns JSON with delivery OTP)
  // ============================================================================
  verifyPickupOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      // Use new RPC signature (returns JSON with delivery OTP)
      const { data, error } = await supabase.rpc("verify_pickup_otp", {
        p_request_id: requestId,
        p_otp: otp,
      });

      if (error) throw error;

      // New function returns JSON: { request_id, status, delivery_otp, delivery_otp_expiry }
      const result = data as {
        request_id: string;
        status: string;
        delivery_otp: string;
        delivery_otp_expiry: string;
      };

      logger.info("Pickup verified, delivery OTP generated", {
        requestId,
        deliveryOtp: result.delivery_otp,
      });

      if (result && result.status === "picked_up") {
        // Refresh current request if it's the one being updated
        if (get().currentRequest?.id === requestId) {
          await get().getRequestById(requestId);
        }

        // Refresh accepted requests list
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
  // UPDATED: Verify delivery OTP (new signature, returns JSON)
  // ============================================================================
  verifyDeliveryOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      // Use new RPC signature (returns JSON)
      const { data, error } = await supabase.rpc("verify_delivery_otp", {
        p_request_id: requestId,
        p_otp: otp,
      });

      if (error) throw error;

      // New function returns JSON: { request_id, status, delivered_at }
      const result = data as {
        request_id: string;
        status: string;
        delivered_at: string;
      };

      logger.info("Delivery verified", {
        requestId,
        deliveredAt: result.delivered_at,
      });

      if (result && result.status === "delivered") {
        // Refresh current request if it's the one being updated
        if (get().currentRequest?.id === requestId) {
          await get().getRequestById(requestId);
        }

        // Refresh accepted requests list
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

  // Clear error
  clearError: () => set({ error: null }),
}));
