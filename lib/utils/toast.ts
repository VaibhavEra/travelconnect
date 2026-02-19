// lib/utils/toast.ts
import { toast } from "sonner-native";

/**
 * Non-blocking feedback for lightweight confirmations.
 * Use these instead of Alert.alert() for success/info outcomes.
 */

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showErrorToast = (message: string) => {
  toast.error(message);
};

export const showInfoToast = (message: string) => {
  toast(message);
};
