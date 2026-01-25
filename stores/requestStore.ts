import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
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
  cancelRequest: (requestId: string) => Promise<void>;
  updateRequestStatus: (
    requestId: string,
    status: DbParcelRequest["status"],
  ) => Promise<void>;

  // OTP Methods
  generatePickupOtp: (requestId: string) => Promise<string>;
  verifyPickupOtp: (requestId: string, otp: string) => Promise<boolean>;
  verifyDeliveryOtp: (requestId: string, otp: string) => Promise<boolean>;
  getPickupOtp: (requestId: string) => Promise<string | null>;
  getDeliveryOtp: (requestId: string) => Promise<string | null>;

  clearError: () => void;
}

// Conditional logging
const isDev = __DEV__;
const log = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(`[Request] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    if (isDev) console.error(`[Request Error] ${message}`, error);
  },
};

export const useRequestStore = create<RequestState>((set, get) => ({
  // Initial state
  myRequests: [],
  incomingRequests: [],
  acceptedRequests: [],
  currentRequest: null,
  loading: false,
  error: null,

  // Create new parcel request
  createRequest: async (data: CreateRequestData, senderId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: request, error } = await supabase
        .from("parcel_requests")
        .insert({
          ...data,
          sender_id: senderId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        myRequests: [request as ParcelRequest, ...state.myRequests],
        loading: false,
      }));

      log.info("Request created successfully", request.id);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Create request failed", error);
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
      log.info("Fetched my requests", requests?.length || 0);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Fetch my requests failed", error);
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
      log.info("Fetched incoming requests", requests?.length || 0);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Fetch incoming requests failed", error);
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
      log.info("Fetched accepted requests", requests?.length || 0);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Fetch accepted requests failed", error);
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
      log.info("Fetched request", requestId);
      return parcelRequest;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Get request failed", error);
      set({ loading: false, error: errorMessage, currentRequest: null });
      return null;
    }
  },

  // Accept request (also generates pickup OTP)
  acceptRequest: async (requestId: string, travellerNotes?: string) => {
    try {
      set({ loading: true, error: null });

      // First update the request status
      const { error: updateError } = await supabase
        .from("parcel_requests")
        .update({
          status: "accepted",
          traveller_notes: travellerNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Generate pickup OTP
      const pickupOtp = await get().generatePickupOtp(requestId);
      log.info("Pickup OTP generated", pickupOtp);

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

      log.info("Request accepted", requestId);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Accept request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Reject request
  rejectRequest: async (requestId: string, reason: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("parcel_requests")
        .update({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        incomingRequests: state.incomingRequests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "rejected" as const,
                rejection_reason: reason,
              }
            : req,
        ),
        loading: false,
      }));

      log.info("Request rejected", requestId);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Reject request failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Cancel request (sender)
  cancelRequest: async (requestId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("parcel_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        myRequests: state.myRequests.map((req) =>
          req.id === requestId ? { ...req, status: "cancelled" as const } : req,
        ),
        loading: false,
      }));

      log.info("Request cancelled", requestId);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Cancel request failed", error);
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

      log.info("Request status updated", requestId, status);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Update status failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Generate pickup OTP (called when accepting request)
  generatePickupOtp: async (requestId: string) => {
    const { data, error } = await supabase.rpc("generate_pickup_otp", {
      request_id: requestId,
    });

    if (error) throw error;
    return data as string; // NEW - returns string directly
  },

  // Verify pickup OTP and mark as picked up
  verifyPickupOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.rpc("verify_pickup_otp", {
        request_id: requestId,
        otp_code: otp,
      });

      if (error) throw error;

      const isValid = data as boolean;

      if (isValid) {
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
      } else {
        set({ loading: false });
      }

      return isValid;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Verify pickup OTP failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Verify delivery OTP and mark as delivered
  verifyDeliveryOtp: async (requestId: string, otp: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.rpc("verify_delivery_otp", {
        request_id: requestId,
        otp_code: otp,
      });

      if (error) throw error;

      const isValid = data as boolean;

      if (isValid) {
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
      } else {
        set({ loading: false });
      }

      return isValid;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Verify delivery OTP failed", error);
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
      log.error("Get pickup OTP failed", error);
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
      log.error("Get delivery OTP failed", error);
      return null;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
