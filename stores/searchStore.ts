import { supabase } from "@/lib/supabase";
import { parseSupabaseError } from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { Trip } from "@/stores/tripStore";
import { create } from "zustand";

interface SearchFilters {
  source: string;
  destination: string;
  departureDate: string | null;
  transportMode: Trip["transport_mode"] | "all";
}

interface SearchState {
  // State
  filters: SearchFilters;
  results: Trip[];
  loading: boolean;
  error: string | null;

  // Actions
  setFilters: (filters: Partial<SearchFilters>) => void;
  searchTrips: () => Promise<void>;
  clearFilters: () => void;
  clearError: () => void;
}

const initialFilters: SearchFilters = {
  source: "",
  destination: "",
  departureDate: null,
  transportMode: "all",
};

// Helper to normalize trip from database
const normalizeTrip = (dbTrip: any): Trip => {
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
    status: (dbTrip.status as Trip["status"]) ?? "upcoming", // UPDATED
    created_at: dbTrip.created_at ?? new Date().toISOString(),
    updated_at: dbTrip.updated_at ?? new Date().toISOString(),
  };
};

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  filters: initialFilters,
  results: [],
  loading: false,
  error: null,

  // Set filters (partial update)
  setFilters: (newFilters: Partial<SearchFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Search trips with current filters
  searchTrips: async () => {
    try {
      set({ loading: true, error: null });

      const { filters } = get();

      // Get current user ID to filter out own trips
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Start with base query - only open trips with available slots
      // Performance: Uses idx_trips_search_available composite index
      let query = supabase
        .from("trips")
        .select("*")
        .eq("status", "upcoming") // UPDATED from "open"
        .gt("available_slots", 0)
        .gte("departure_date", new Date().toISOString().split("T")[0]) // Future trips only
        .neq("traveller_id", user?.id || "") // NEW: Filter out own trips
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      // Apply source filter (required)
      if (filters.source) {
        query = query.eq("source", filters.source);
      }

      // Apply destination filter (required)
      if (filters.destination) {
        query = query.eq("destination", filters.destination);
      }

      // Apply departure date filter (optional)
      if (filters.departureDate) {
        query = query.eq("departure_date", filters.departureDate);
      }

      // Apply transport mode filter (optional)
      if (filters.transportMode && filters.transportMode !== "all") {
        query = query.eq("transport_mode", filters.transportMode);
      }

      const { data: trips, error } = await query;

      if (error) throw error;

      const normalizedTrips = (trips || []).map(normalizeTrip);

      set({ results: normalizedTrips, loading: false });
      logger.info("Search completed", {
        count: normalizedTrips.length,
        filters,
      });
    } catch (error: any) {
      const errorMessage = parseSupabaseError(error);
      logger.error("Search failed", error);
      set({ loading: false, error: errorMessage, results: [] });
    }
  },

  // Clear all filters
  clearFilters: () => {
    set({ filters: initialFilters, results: [], error: null });
    logger.info("Filters cleared");
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
