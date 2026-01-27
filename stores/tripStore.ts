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
  total_slots: number;
  available_slots: number;
  allowed_categories: string[];
  pnr_number: string;
  ticket_file_url: string;
  notes: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
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
  updateTrip: (tripId: string, updates: Partial<DbTrip>) => Promise<void>;
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
    total_slots: dbTrip.total_slots ?? 0,
    available_slots: dbTrip.available_slots ?? 0,
    allowed_categories: dbTrip.allowed_categories ?? [],
    pnr_number: dbTrip.pnr_number,
    ticket_file_url: dbTrip.ticket_file_url,
    notes: dbTrip.notes,
    status: validStatus ?? "open",
    created_at: dbTrip.created_at ?? new Date().toISOString(),
    updated_at: dbTrip.updated_at ?? new Date().toISOString(),
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
        p_pnr_number: data.pnr_number.trim(),
        p_ticket_file_url: data.ticket_file_url,
        p_total_slots: data.total_slots,
        p_allowed_categories: data.allowed_categories,
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

  // Get all available trips (for senders to browse)
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
        .eq("status", "open")
        .gte("departure_date", today)
        .gt("available_slots", 0)
        .neq("traveller_id", user?.id || "") // NEW: Filter out own trips
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

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

  // Update existing trip
  updateTrip: async (tripId: string, updates: Partial<DbTrip>) => {
    try {
      set({ loading: true, error: null });

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

  // Clear error
  clearError: () => set({ error: null }),
}));
