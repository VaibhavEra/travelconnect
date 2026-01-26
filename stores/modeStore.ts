// stores/modeStore.ts
import { logger } from "@/lib/utils/logger"; // ADDED
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const MODE_STORAGE_KEY = "travelconnect:user-mode";

type UserMode = "sender" | "traveller";

interface ModeState {
  currentMode: UserMode;
  loading: boolean;

  // Actions
  switchMode: (mode: UserMode) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useModeStore = create<ModeState>((set, get) => ({
  currentMode: "sender", // Default mode
  loading: true,

  // Initialize mode from AsyncStorage
  initialize: async () => {
    try {
      set({ loading: true });

      const storedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);

      if (storedMode === "sender" || storedMode === "traveller") {
        set({ currentMode: storedMode, loading: false });
      } else {
        // First time user - default to sender
        set({ currentMode: "sender", loading: false });
        await AsyncStorage.setItem(MODE_STORAGE_KEY, "sender");
      }

      logger.info("Mode initialized", { mode: get().currentMode }); // ADDED
    } catch (error) {
      logger.error("Failed to initialize mode", error); // CHANGED
      set({ currentMode: "sender", loading: false });
    }
  },

  // Switch mode and persist to storage
  switchMode: async (mode: UserMode) => {
    try {
      set({ currentMode: mode });
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      logger.info("Mode switched", { mode }); // ADDED
    } catch (error) {
      logger.error("Failed to switch mode", error); // CHANGED
    }
  },
}));
