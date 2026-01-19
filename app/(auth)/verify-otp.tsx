import OtpInput from "@/components/OtpInput";
import { haptics } from "@/lib/utils/haptics";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { pendingVerification, verifyEmailOtp, resendEmailOtp } =
    useAuthStore();

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Redirect if no pending verification
  useEffect(() => {
    if (!pendingVerification) {
      console.log("⚠️ No pending verification, redirecting to login");
      router.replace("/(auth)/login");
    } else {
      console.log("✅ Pending verification found:", pendingVerification);
    }
  }, [pendingVerification]);

  if (!pendingVerification) {
    return null;
  }

  const handleVerify = async () => {
    if (otp.length !== 6) {
      haptics.error();
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      console.log("🔐 Verifying OTP for:", pendingVerification.email);
      await verifyEmailOtp(pendingVerification.email, otp);
      haptics.success();

      console.log("✅ Email verified successfully");
      Alert.alert("Success!", "Your email has been verified successfully.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      haptics.error();
      console.log("❌ OTP verification failed:", error);
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      console.log("📤 Resending OTP to:", pendingVerification.email);
      await resendEmailOtp(pendingVerification.email);
      haptics.success();
      setResendTimer(60);
      setCanResend(false);
      setOtp(""); // Clear OTP input
      Alert.alert("Success", "Verification code sent to your email");
      console.log("✅ OTP resent successfully");
    } catch (error: any) {
      haptics.error();
      console.log("❌ Resend OTP failed:", error);
      const errorMessage = parseSupabaseError(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="mail-outline" size={64} color="#007AFF" />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={styles.email}>{pendingVerification.email}</Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <OtpInput
            length={6}
            value={otp}
            onChange={setOtp}
            disabled={loading}
          />
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (loading || otp.length !== 6) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendSection}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend available in {resendTimer}s
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Check your spam folder if you don't see the email
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 8,
  },
  otpContainer: {
    marginBottom: 24,
  },
  verifyButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  resendLink: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  timerText: {
    fontSize: 14,
    color: "#999",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
