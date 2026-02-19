import { supabase } from "@/lib/supabase";
import { AppError, parseSupabaseError } from "@/lib/utils/errorHandling";
import { logger } from "@/lib/utils/logger";
import { Trip } from "@/stores/tripStore";
import { create } from "zustand";

const MODULE = "searchStore";

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
  error: AppError | null;

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
    parcel_size_capacity:
      dbTrip.parcel_size_capacity as Trip["parcel_size_capacity"],
    allowed_categories: dbTrip.allowed_categories ?? [],
    pnr_number: dbTrip.pnr_number,
    ticket_file_url: dbTrip.ticket_file_url,
    status: (dbTrip.status as Trip["status"]) ?? "upcoming",
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

      // Base query - ONLY show upcoming trips that can accept requests
      let query = supabase
        .from("trips")
        .select("*")
        .eq("status", "upcoming")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      // Filter out own trips
      if (user?.id) {
        query = query.neq("traveller_id", user.id);
      }

      // Apply source filter (partial match)
      if (filters.source && filters.source.trim()) {
        query = query.ilike("source", `%${filters.source.trim()}%`);
      }

      // Apply destination filter (partial match)
      if (filters.destination && filters.destination.trim()) {
        query = query.ilike("destination", `%${filters.destination.trim()}%`);
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

      if (error) {
        logger.error("Search query error", error, { module: MODULE });
        throw error;
      }

      const normalizedTrips = (trips || []).map(normalizeTrip);

      set({ results: normalizedTrips, loading: false });
      logger.info("Search completed", {
        count: normalizedTrips.length,
        filters,
      });
    } catch (error) {
      const appError = parseSupabaseError(error);
      logger.error("Search failed", error, { module: MODULE });
      set({ loading: false, error: appError, results: [] });
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
