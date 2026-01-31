import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { TripFormData } from "@/lib/validations/trip";
import { Database } from "@/types/database.types";
import { create } from "zustand";

// Type for trip from database (with proper non-null assertions)
type DbTrip = Database["public"]["Tables"]["trips"]["Row"];

// Refined Trip type with guaranteed non-null values
export type Trip = {
  id: string;
  traveller_id: string;
  source: string;
  destination: string;
  transport_mode: "train" | "bus" | "flight" | "car";
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  parcel_size_capacity: "small" | "medium" | "large"; // NEW: Replaces total_slots/available_slots
  allowed_categories: string[];
  pnr_number: string;
  ticket_file_url: string;
  notes: string | null;
  status:
    | "upcoming"
    | "locked"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "expired";
  created_at: string;
  updated_at: string;
  // REMOVED: total_slots, available_slots
};

// Trip store state interface
interface TripState {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: string | null;

  // Actions
  createTrip: (data: TripFormData, userId: string) => Promise<Trip>;
  getMyTrips: (userId: string) => Promise<void>;
  getAvailableTrips: () => Promise<void>;
  getTripById: (tripId: string) => Promise<Trip | null>;
  canEditTrip: (tripId: string) => Promise<boolean>;
  canEditTripDates: (tripId: string) => Promise<boolean>; // NEW: Check if dates can be edited
  updateTrip: (tripId: string, updates: Partial<DbTrip>) => Promise<void>;
  updateTripDates: (
    // NEW: Update only dates
    tripId: string,
    departure_date: string,
    departure_time: string,
    arrival_date: string,
    arrival_time: string,
  ) => Promise<void>;
  updateTripStatus: (tripId: string, status: Trip["status"]) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  clearError: () => void;
}

// Helper to convert DbTrip to Trip (handle nulls)
const normalizeTrip = (dbTrip: DbTrip): Trip => {
  // Ensure status is valid
  const validStatus = dbTrip.status as Trip["status"];

  return {
    id: dbTrip.id,
    traveller_id: dbTrip.traveller_id,
    source: dbTrip.source,
    destination: dbTrip.destination,
    transport_mode: dbTrip.transport_mode as Trip["transport_mode"],
    departure_date: dbTrip.departure_date,
    departure_time: dbTrip.departure_time,
    arrival_date: dbTrip.arrival_date,
    arrival_time: dbTrip.arrival_time,
    parcel_size_capacity:
      dbTrip.parcel_size_capacity as Trip["parcel_size_capacity"], // NEW
    allowed_categories: dbTrip.allowed_categories,
    pnr_number: dbTrip.pnr_number,
    ticket_file_url: dbTrip.ticket_file_url,
    notes: dbTrip.notes,
    status: validStatus,
    created_at: dbTrip.created_at,
    updated_at: dbTrip.updated_at,
    // REMOVED: total_slots, available_slots normalization
  };
};

export const useTripStore = create<TripState>((set, get) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  loading: false,
  error: null,

  // ============================================================================
  // UPDATED: Create new trip with server-side validation
  // ============================================================================
  createTrip: async (data: TripFormData, userId: string) => {
    try {
      set({ loading: true, error: null });

      // Prepare RPC parameters (only include p_notes if it has a value)
      const rpcParams: any = {
        p_source: data.source.trim(),
        p_destination: data.destination.trim(),
        p_departure_date: data.departure_date,
        p_departure_time: data.departure_time,
        p_arrival_date: data.arrival_date,
        p_arrival_time: data.arrival_time,
        p_transport_mode: data.transport_mode,
        p_parcel_size_capacity: data.parcel_size_capacity, // NEW
        p_pnr_number: data.pnr_number.trim(),
        p_ticket_file_url: data.ticket_file_url,
        p_allowed_categories: data.allowed_categories,
        // REMOVED: p_total_slots
      };

      // Only add p_notes if it exists
      if (data.notes) {
        rpcParams.p_notes = data.notes;
      }

      // Use RPC function for server-side validation
      const { data: tripId, error: rpcError } = await supabase.rpc(
        "create_trip_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;

      // Fetch the created trip
      const { data: trip, error: fetchError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (fetchError) throw fetchError;

      const normalizedTrip = normalizeTrip(trip);

      // Add to local state
      set((state) => ({
        trips: [normalizedTrip, ...state.trips],
        loading: false,
      }));

      logger.info("Trip created successfully", { tripId: normalizedTrip.id });
      return normalizedTrip;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Create trip failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Get user's trips
  getMyTrips: async (userId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .eq("traveller_id", userId)
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      if (error) throw error;

      const normalizedTrips = (trips || []).map(normalizeTrip);

      set({ trips: normalizedTrips, loading: false });
      logger.info("Fetched trips", { count: normalizedTrips.length });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Fetch trips failed", error);
      set({ loading: false, error: errorMessage });
    }
  },

  // UPDATED: Get all available trips (for senders to browse)
  getAvailableTrips: async () => {
    try {
      set({ loading: true, error: null });

      const today = new Date().toISOString().split("T")[0];

      // Get current user ID to filter out own trips
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: trips, error } = await supabase
        .from("trips")
        .select("*")
        .eq("status", "upcoming") // UPDATED: Only upcoming, not locked
        .gte("departure_date", today)
        .neq("traveller_id", user?.id || "") // Filter out own trips
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });
      // REMOVED: .gt("available_slots", 0) check

      if (error) throw error;

      const normalizedTrips = (trips || []).map(normalizeTrip);

      set({ trips: normalizedTrips, loading: false });
      logger.info("Fetched available trips", { count: normalizedTrips.length });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Fetch available trips failed", error);
      set({ loading: false, error: errorMessage, trips: [] });
    }
  },

  // Get single trip by ID
  getTripById: async (tripId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: trip, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (error) throw error;

      const normalizedTrip = normalizeTrip(trip);

      set({ currentTrip: normalizedTrip, loading: false });
      logger.info("Fetched trip", { tripId });
      return normalizedTrip;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Get trip failed", error);
      set({ loading: false, error: errorMessage, currentTrip: null });
      return null;
    }
  },

  // Check if trip can be edited
  canEditTrip: async (tripId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("can_edit_trip", {
        p_trip_id: tripId,
      });

      if (error) {
        logger.error("Check edit permission failed", error);
        return false;
      }

      return data ?? false;
    } catch (error) {
      logger.error("canEditTrip error", error);
      return false;
    }
  },

  // UPDATED: With permission check
  updateTrip: async (tripId: string, updates: Partial<DbTrip>) => {
    try {
      set({ loading: true, error: null });

      const canEdit = await get().canEditTrip(tripId);
      if (!canEdit) {
        throw new Error(
          "Cannot edit trip within 24h of departure or with accepted requests",
        );
      }

      const { data: trip, error } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", tripId)
        .select()
        .single();

      if (error) throw error;

      const normalizedTrip = normalizeTrip(trip);

      // Update local state
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? normalizedTrip : t)),
        loading: false,
      }));

      // Update currentTrip if it's the same trip
      if (get().currentTrip?.id === tripId) {
        set({ currentTrip: normalizedTrip });
      }

      logger.info("Trip updated", { tripId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update trip failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Update trip status (convenience method)
  updateTripStatus: async (tripId: string, status: Trip["status"]) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("trips")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", tripId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? { ...t, status } : t)),
        loading: false,
      }));

      // Update currentTrip if it's the same trip
      if (get().currentTrip?.id === tripId) {
        set({ currentTrip: { ...get().currentTrip!, status } });
      }

      logger.info("Trip status updated", { tripId, status });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update trip status failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Delete trip (soft delete by setting status to cancelled)
  deleteTrip: async (tripId: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from("trips")
        .update({ status: "cancelled" })
        .eq("id", tripId);

      if (error) throw error;

      // Update status in local state instead of removing
      set((state) => ({
        trips: state.trips.map((t) =>
          t.id === tripId ? { ...t, status: "cancelled" as const } : t,
        ),
        loading: false,
      }));

      logger.info("Trip cancelled", { tripId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Delete trip failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Add new method to check if dates can be edited
  canEditTripDates: async (tripId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("can_edit_trip_dates", {
        p_trip_id: tripId,
      });

      if (error) {
        logger.error("Check date edit permission failed", error);
        return false;
      }

      return data ?? false;
    } catch (error) {
      logger.error("canEditTripDates error", error);
      return false;
    }
  },

  // Add method to update only dates
  updateTripDates: async (
    tripId: string,
    departure_date: string,
    departure_time: string,
    arrival_date: string,
    arrival_time: string,
  ) => {
    try {
      set({ loading: true, error: null });

      const canEdit = await get().canEditTripDates(tripId);
      if (!canEdit) {
        throw new Error("Cannot edit trip dates after pickup");
      }

      const { data: trip, error } = await supabase
        .from("trips")
        .update({
          departure_date,
          departure_time,
          arrival_date,
          arrival_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select()
        .single();

      if (error) throw error;

      const normalizedTrip = normalizeTrip(trip);

      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? normalizedTrip : t)),
        loading: false,
      }));

      if (get().currentTrip?.id === tripId) {
        set({ currentTrip: normalizedTrip });
      }

      logger.info("Trip dates updated", { tripId });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Update trip dates failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
