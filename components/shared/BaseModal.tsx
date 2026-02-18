import { BorderRadius, Overlays, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  scrollable?: boolean;
}

export default function BaseModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  loading = false,
  scrollable = false,
}: BaseModalProps) {
  const colors = useThemeColors();

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* KAV must be the direct child of Modal for correct behavior */}
      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.overlay, { backgroundColor: Overlays.light }]}>
          {/* Backdrop — tapping dismisses keyboard then modal */}
          <Pressable
            style={styles.backdrop}
            onPress={handleBackdropPress}
            disabled={loading}
          />

          <View
            style={[
              styles.modal,
              { backgroundColor: colors.background.primary },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: colors.border.default },
              ]}
            >
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={[styles.subtitle, { color: colors.text.secondary }]}
                >
                  {subtitle}
                </Text>
              )}
            </View>

            {/* Content */}
            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.content}>{children}</View>
            )}

            {/* Actions — always rendered outside scroll, always visible */}
            {actions && (
              <View
                style={[
                  styles.actions,
                  { borderTopColor: colors.border.default },
                ]}
              >
                {actions}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    borderRadius: BorderRadius.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
