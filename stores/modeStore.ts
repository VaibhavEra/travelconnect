// stores/modeStore.ts
import { logger } from "@/lib/utils/logger"; // ADDED
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const MODULE = "modeStore";

const MODE_STORAGE_KEY = "travelconnect:user-mode";

type UserMode = "sender" | "traveller";

interface ModeState {
  currentMode: UserMode;
  loading: boolean;
  switching: boolean;

  // Actions
  switchMode: (mode: UserMode) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useModeStore = create<ModeState>((set, get) => ({
  currentMode: "sender", // Default mode
  loading: true,
  switching: false,

  // Initialize mode from AsyncStorage
  initialize: async () => {
    try {
      set({ loading: true, switching: false });

      const storedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);

      if (storedMode === "sender" || storedMode === "traveller") {
        set({ currentMode: storedMode, loading: false });
      } else {
        // First time user - default to sender
        set({ currentMode: "sender", loading: false });
        await AsyncStorage.setItem(MODE_STORAGE_KEY, "sender");
      }

      logger.info(
        "Mode initialized",
        { mode: get().currentMode },
        { module: MODULE },
      );
    } catch (error) {
      logger.error("Failed to initialize mode", error, { module: MODULE });
      set({ currentMode: "sender", loading: false, switching: false });
    }
  },

  // Switch mode and persist to storage
  switchMode: async (mode: UserMode) => {
    // guard against concurrent switches
    if (get().switching) return;
    try {
      set({ switching: true, currentMode: mode });
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      logger.info("Mode switched", { mode }, { module: MODULE });
    } catch (error) {
      logger.error("Failed to switch mode", error, { module: MODULE });
    } finally {
      set({ switching: false });
    }
  },
}));
