import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { formatTripForDatabase, TripFormData } from "@/lib/validations/trip";
import { Database } from "@/types/database.types";
import { create } from "zustand";

// Type for trip from database
type Trip = Database["public"]["Tables"]["trips"]["Row"];

// Trip store state interface
interface TripState {
  // State
  trips: Trip[];
  loading: boolean;
  error: string | null;

  // Actions
  createTrip: (data: TripFormData, userId: string) => Promise<Trip>;
  getMyTrips: (userId: string) => Promise<void>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  clearError: () => void;
}

// Conditional logging
const isDev = __DEV__;
const log = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(`[Trip] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    if (isDev) console.error(`[Trip Error] ${message}`, error);
  },
};

export const useTripStore = create<TripState>((set, get) => ({
  // Initial state
  trips: [],
  loading: false,
  error: null,

  // Create new trip
  createTrip: async (data: TripFormData, userId: string) => {
    try {
      set({ loading: true, error: null });

      const tripData = formatTripForDatabase(data, userId);

      const { data: trip, error } = await supabase
        .from("trips")
        .insert(tripData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        trips: [trip, ...state.trips],
        loading: false,
      }));

      log.info("Trip created successfully", trip.id);
      return trip;
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Create trip failed", error);
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
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ trips: trips || [], loading: false });
      log.info("Fetched trips", trips?.length || 0);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Fetch trips failed", error);
      set({ loading: false, error: errorMessage });
    }
  },

  // Update existing trip
  updateTrip: async (tripId: string, updates: Partial<Trip>) => {
    try {
      set({ loading: true, error: null });

      const { data: trip, error } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", tripId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? trip : t)),
        loading: false,
      }));

      log.info("Trip updated", tripId);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Update trip failed", error);
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

      // Remove from local state or update status
      set((state) => ({
        trips: state.trips.filter((t) => t.id !== tripId),
        loading: false,
      }));

      log.info("Trip deleted", tripId);
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      log.error("Delete trip failed", error);
      set({ loading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
