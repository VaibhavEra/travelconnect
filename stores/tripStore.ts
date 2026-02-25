// stores/tripStore.ts
import { supabase } from "@/lib/supabase";
import {
  AppError,
  createAppError,
  isAppError,
  parseSupabaseError,
} from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { TripFormData } from "@/lib/validations/trip";
import { Database } from "@/types/database.types";
import { create } from "zustand";

const MODULE = "tripStore";

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
  parcel_size_capacity: "small" | "medium" | "large";
  allowed_categories: string[];
  pnr_number: string;
  ticket_file_url: string;
  status:
    | "upcoming"
    | "locked"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "expired";
  created_at: string;
  updated_at: string;
};

// Type for editable general fields (before acceptance)
type EditableGeneralTripFields = Pick<
  DbTrip,
  | "parcel_size_capacity"
  | "allowed_categories"
  | "departure_date"
  | "departure_time"
  | "arrival_date"
  | "arrival_time"
  | "pnr_number"
  | "ticket_file_url"
>;

// Type for date-only updates (after acceptance)
type EditableDateFields = Pick<
  DbTrip,
  "departure_date" | "departure_time" | "arrival_date" | "arrival_time"
>;

// Trip store state interface
interface TripState {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: AppError | null;

  // Actions
  createTrip: (data: TripFormData, userId: string) => Promise<Trip>;
  getMyTrips: (userId: string) => Promise<void>;
  getAvailableTrips: () => Promise<void>;
  getTripById: (tripId: string) => Promise<Trip | null>;
  canEditTrip: (tripId: string) => Promise<boolean>;
  canEditTripDates: (tripId: string) => Promise<boolean>;

  // Separate methods for different edit scenarios (Issue #4 + #27)
  updateTripGeneralFields: (
    tripId: string,
    updates: Partial<EditableGeneralTripFields>,
  ) => Promise<void>;
  updateTripDates: (
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

// Helper to convert DbTrip to Trip
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
      dbTrip.parcel_size_capacity as Trip["parcel_size_capacity"],
    allowed_categories: dbTrip.allowed_categories,
    pnr_number: dbTrip.pnr_number,
    ticket_file_url: dbTrip.ticket_file_url,
    status: validStatus,
    created_at: dbTrip.created_at,
    updated_at: dbTrip.updated_at,
  };
};

// Internal helper — parses any error into AppError, stores it, and re-throws.
// Only used for MUTATING actions that screens need to react to.
const handleMutationError = (
  error: unknown,
  message: string,
  setFn: (err: AppError) => void,
): never => {
  const appError = isAppError(error) ? error : parseSupabaseError(error);
  logger.error(message, error, { module: MODULE });
  setFn(appError);
  throw appError;
};

export const useTripStore = create<TripState>((set, get) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  loading: false,
  error: null,

  // ============================================================================
  // Create new trip
  // ============================================================================
  createTrip: async (data: TripFormData, userId: string): Promise<Trip> => {
    try {
      set({ loading: true, error: null });

      const rpcParams = {
        p_source: data.source.trim(),
        p_destination: data.destination.trim(),
        p_departure_date: data.departure_date,
        p_departure_time: data.departure_time,
        p_arrival_date: data.arrival_date || data.departure_date,
        p_arrival_time: data.arrival_time || data.departure_time,
        p_transport_mode: data.transport_mode,
        p_parcel_size_capacity: data.parcel_size_capacity,
        p_pnr_number: data.pnr_number.trim(),
        p_ticket_file_url: data.ticket_file_url,
        p_allowed_categories: data.allowed_categories,
      };

      // Use RPC function for server-side validation
      const { data: tripId, error: rpcError } = await supabase.rpc(
        "create_trip_with_validation",
        rpcParams,
      );

      if (rpcError) throw rpcError;
      if (!tripId) throw new Error("No trip ID returned from function");

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
    } catch (error) {
      handleMutationError(error, "Create trip failed", (appError) =>
        set({ loading: false, error: appError }),
      );
      throw error; // unreachable — handleMutationError always throws
    }
  },

  // ============================================================================
  // Get user's trips
  // ============================================================================
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
    } catch (error) {
      const appError = parseSupabaseError(error);
      logger.error("Fetch trips failed", error, { module: MODULE });
      set({ loading: false, error: appError });
    }
  },

  // ============================================================================
  // Get all available trips (for senders to browse)
  // ============================================================================
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
        .eq("status", "upcoming")
        .gte("departure_date", today)
        .neq("traveller_id", user?.id || "")
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      if (error) throw error;

      const normalizedTrips = (trips || []).map(normalizeTrip);

      set({ trips: normalizedTrips, loading: false });
      logger.info("Fetched available trips", { count: normalizedTrips.length });
    } catch (error) {
      const appError = parseSupabaseError(error);
      logger.error("Fetch available trips failed", error, { module: MODULE });
      set({ loading: false, error: appError, trips: [] });
    }
  },

  // ============================================================================
  // Get single trip by ID
  // ============================================================================
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
    } catch (error) {
      const appError = parseSupabaseError(error);
      logger.error("Get trip failed", error, { module: MODULE });
      set({ loading: false, error: appError, currentTrip: null });
      return null;
    }
  },

  // ============================================================================
  // Check if trip can be edited (Issue #4: Simplified, no 24h restriction)
  // ============================================================================
  canEditTrip: async (tripId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("can_edit_trip", {
        p_trip_id: tripId,
      });

      if (error) {
        logger.error("Check edit permission failed", error, { module: MODULE });
        return false;
      }

      return data ?? false;
    } catch (error) {
      logger.error("canEditTrip error", error, { module: MODULE });
      return false;
    }
  },

  // Check if trip dates can be edited (Issue #4: Same as canEditTrip now)
  canEditTripDates: async (tripId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("can_edit_trip_dates", {
        p_trip_id: tripId,
      });

      if (error) {
        logger.error("Check date edit permission failed", error, {
          module: MODULE,
        });
        return false;
      }

      return data ?? false;
    } catch (error) {
      logger.error("canEditTripDates error", error, { module: MODULE });
      return false;
    }
  },

  // ============================================================================
  // Update general trip fields (Issue #4 + #27)
  // Can only be used BEFORE any request is accepted
  // ============================================================================
  updateTripGeneralFields: async (
    tripId: string,
    updates: Partial<EditableGeneralTripFields>,
  ) => {
    try {
      set({ loading: true, error: null });

      // Whitelist only editable general fields
      const allowedFields: (keyof EditableGeneralTripFields)[] = [
        "parcel_size_capacity",
        "allowed_categories",
        "departure_date",
        "departure_time",
        "arrival_date",
        "arrival_time",
        "pnr_number",
        "ticket_file_url",
      ];

      // Filter to only allowed fields
      const filteredUpdates = Object.keys(updates)
        .filter((key) =>
          allowedFields.includes(key as keyof EditableGeneralTripFields),
        )
        .reduce(
          (obj, key) => {
            obj[key] = updates[key as keyof EditableGeneralTripFields];
            return obj;
          },
          {} as Record<string, any>,
        );

      // Validate we have fields to update
      if (Object.keys(filteredUpdates).length === 0) {
        throw createAppError(
          "UNKNOWN",
          "No valid fields to update. Allowed fields: parcel_size_capacity, allowed_categories, dates, pnr_number, ticket_file_url.",
        );
      }

      // Check edit permission (no accepted requests)
      const canEdit = await get().canEditTrip(tripId);
      if (!canEdit) {
        throw createAppError(
          "INSUFFICIENT_PRIVILEGE",
          "Cannot edit trip after pickup or in completed/cancelled state. To edit dates after acceptance (before pickup), use updateTripDates().",
        );
      }

      // Perform update with RLS protection
      const { data: trip, error } = await supabase
        .from("trips")
        .update({
          ...filteredUpdates,
          updated_at: new Date().toISOString(),
        })
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

      if (get().currentTrip?.id === tripId) {
        set({ currentTrip: normalizedTrip });
      }

      logger.info("Trip general fields updated", {
        tripId,
        updatedFields: Object.keys(filteredUpdates),
      });
    } catch (error) {
      handleMutationError(
        error,
        "Update trip general fields failed",
        (appError) => set({ loading: false, error: appError }),
      );
    }
  },

  // ============================================================================
  // Update only dates (Issue #4)
  // Allowed even after acceptance, before pickup
  // ============================================================================
  updateTripDates: async (
    tripId: string,
    departure_date: string,
    departure_time: string,
    arrival_date: string,
    arrival_time: string,
  ) => {
    try {
      set({ loading: true, error: null });

      // Check date edit permission
      const canEdit = await get().canEditTripDates(tripId);
      if (!canEdit) {
        throw createAppError(
          "INSUFFICIENT_PRIVILEGE",
          "Cannot edit trip dates after pickup or in completed/cancelled state.",
        );
      }

      // Validate dates using backend function
      const { data: isValid, error: validationError } = await supabase.rpc(
        "validate_trip_dates",
        {
          p_departure_date: departure_date,
          p_departure_time: departure_time,
          p_arrival_date: arrival_date,
          p_arrival_time: arrival_time,
        },
      );

      if (validationError) throw validationError;
      if (!isValid) throw createAppError("UNKNOWN", "Invalid trip dates.");

      // Update dates only with RLS protection
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

      // TODO: Issue #14 - Trigger sender notification if accepted requests exist
    } catch (error) {
      handleMutationError(error, "Update trip dates failed", (appError) =>
        set({ loading: false, error: appError }),
      );
    }
  },

  // ============================================================================
  // Update trip status (convenience method)
  // ============================================================================
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
    } catch (error) {
      handleMutationError(error, "Update trip status failed", (appError) =>
        set({ loading: false, error: appError }),
      );
    }
  },

  // ============================================================================
  // Delete trip (soft delete by setting status to cancelled)
  // ============================================================================
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
    } catch (error) {
      handleMutationError(error, "Delete trip failed", (appError) =>
        set({ loading: false, error: appError }),
      );
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
