import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/auth/FormInput";
import ProgressIndicator from "@/components/auth/ProgressIndicator";
import { availabilityCheck } from "@/lib/utils/availabilityCheck";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { sanitize } from "@/lib/utils/sanitize";
import {
  RegisterStep2FormData,
  registerStep2Schema,
} from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterStep2Screen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ email: string; password: string }>();
  const [loading, setLoading] = useState(false);

  // Availability states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const signUp = useAuthStore((state) => state.signUp);
  const { isOffline } = useNetworkStatus();

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isValid },
  } = useForm<RegisterStep2FormData>({
    resolver: zodResolver(registerStep2Schema),
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      username: "",
      phone: "",
    },
  });

  const username = watch("username");
  const phone = watch("phone");

  // Redirect if missing email/password
  useEffect(() => {
    if (!params.email || !params.password) {
      Alert.alert("Error", "Session expired. Please start again.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/register/step-1-account"),
        },
      ]);
    }
  }, [params]);

  // Username availability check
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      if (username && username.length >= 3) {
        setCheckingUsername(true);
        try {
          const { available } = await availabilityCheck.username(username);
          if (!cancelled) {
            setUsernameAvailable(available);

            if (!available) {
              setError("username", {
                type: "manual",
                message: "Username is already taken",
              });
            } else {
              if (errors.username?.type === "manual") {
                clearErrors("username");
              }
            }
          }
        } catch (error) {
          // Silent fail
        } finally {
          if (!cancelled) {
            setCheckingUsername(false);
          }
        }
      } else {
        setUsernameAvailable(null);
        if (errors.username?.type === "manual") {
          clearErrors("username");
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cancelled = true;
    };
  }, [username]);

  // Phone availability check
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      if (phone && phone.length === 10) {
        setCheckingPhone(true);
        try {
          const { available } = await availabilityCheck.phone(phone);
          if (!cancelled) {
            setPhoneAvailable(available);

            if (!available) {
              setError("phone", {
                type: "manual",
                message: "Phone number is already registered",
              });
            } else {
              if (errors.phone?.type === "manual") {
                clearErrors("phone");
              }
            }
          }
        } catch (error) {
          // Silent fail
        } finally {
          if (!cancelled) {
            setCheckingPhone(false);
          }
        }
      } else {
        setPhoneAvailable(null);
        if (errors.phone?.type === "manual") {
          clearErrors("phone");
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cancelled = true;
    };
  }, [phone]);

  const canSubmit =
    isValid &&
    !loading &&
    !isOffline &&
    !checkingUsername &&
    !checkingPhone &&
    usernameAvailable !== false &&
    phoneAvailable !== false;

  const onSubmit = async (data: RegisterStep2FormData) => {
    // Double-check availability
    if (usernameAvailable === false) {
      haptics.error();
      Alert.alert("Error", "Username is already taken. Please choose another.");
      return;
    }

    if (phoneAvailable === false) {
      haptics.error();
      Alert.alert("Error", "Phone number is already registered.");
      return;
    }

    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    // Rate limiting
    const rateCheck = rateLimiter.check("signup", rateLimitConfigs.signup);
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${rateCheck.retryAfter} before trying again.`,
      );
      return;
    }

    setLoading(true);
    try {
      // Sanitize inputs
      const signUpData = {
        email: sanitize.email(params.email),
        password: params.password.trim(),
        full_name: sanitize.name(data.full_name),
        username: sanitize.username(data.username),
        phone: sanitize.phone(data.phone),
      };

      await signUp(signUpData);
      haptics.success();

      // Navigate to verification
      router.replace("/(auth)/register/step-3-verify");
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);

      // Update availability states
      if (errorMessage.includes("Username already taken")) {
        setUsernameAvailable(false);
      }
      if (errorMessage.includes("Phone number already registered")) {
        setPhoneAvailable(false);
      }

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  return (
    <AuthLayout showBackButton>
      {" "}
      {/* UPDATED: Pass prop */}
      {/* Back Button - FIXED POSITIONING */}
      <TouchableOpacity
        style={[
          styles.backButton,
          { backgroundColor: colors.background.secondary },
        ]}
        onPress={handleBack}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={2}
        totalSteps={3}
        labels={["Account", "Profile", "Verify"]}
      />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Your Profile
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Tell us a bit about yourself
        </Text>
      </View>
      {/* Form */}
      <View style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Full Name"
              placeholder="John Doe"
              value={value}
              onChangeText={(text) => onChange(sanitize.name(text))}
              onBlur={onBlur}
              error={errors.full_name?.message}
              touched={touchedFields.full_name}
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="next"
              editable={!loading}
              onSubmitEditing={() => usernameRef.current?.focus()}
            />
          )}
        />

        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              ref={usernameRef}
              label="Username"
              placeholder="johndoe"
              value={value}
              onChangeText={(text) => onChange(sanitize.username(text))}
              onBlur={onBlur}
              error={errors.username?.message}
              touched={touchedFields.username}
              autoCapitalize="none"
              textContentType="username"
              returnKeyType="next"
              editable={!loading}
              onSubmitEditing={() => phoneRef.current?.focus()}
              rightIcon={
                checkingUsername ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.text.secondary}
                  />
                ) : usernameAvailable === true && username.length >= 3 ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : usernameAvailable === false ? (
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                ) : null
              }
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              ref={phoneRef}
              label="Phone Number"
              placeholder="9876543210"
              value={value}
              onChangeText={(text) => onChange(sanitize.phone(text))}
              onBlur={onBlur}
              error={errors.phone?.message}
              touched={touchedFields.phone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              maxLength={10}
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={handleSubmit(onSubmit)}
              rightIcon={
                checkingPhone ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.text.secondary}
                  />
                ) : phoneAvailable === true && phone.length === 10 ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                ) : phoneAvailable === false ? (
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                ) : null
              }
            />
          )}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !canSubmit && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
                Create Account
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={colors.text.inverse}
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: Spacing.md, // FIXED: Now relative to safe area
    left: Spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    // Subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  form: {
    gap: Spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
