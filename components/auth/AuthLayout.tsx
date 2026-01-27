import { Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OfflineNotice from "../shared/OfflineNotice";

interface AuthLayoutProps {
  children: ReactNode;
  showOfflineNotice?: boolean;
  showBackButton?: boolean;
}

export default function AuthLayout({
  children,
  showOfflineNotice = true,
  showBackButton = false,
}: AuthLayoutProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {showOfflineNotice && <OfflineNotice />}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.content,
              showBackButton ? styles.contentWithBackButton : null, // FIXED: Use ternary
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  contentWithBackButton: {
    paddingTop: Spacing.xxl + Spacing.md,
  },
});
