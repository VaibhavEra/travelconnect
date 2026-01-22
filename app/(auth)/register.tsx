// app/(auth)/register.tsx
import FormInput from "@/components/auth/FormInput";
import OfflineNotice from "@/components/shared/OfflineNotice";
import { availabilityCheck } from "@/lib/utils/availabilityCheck";
import { haptics } from "@/lib/utils/haptics";
import { useNetworkStatus } from "@/lib/utils/network";
import { parseSupabaseError } from "@/lib/utils/parseSupabaseError";
import { rateLimitConfigs, rateLimiter } from "@/lib/utils/rateLimit";
import { sanitize } from "@/lib/utils/sanitize";
import { RegisterFormData, registerSchema } from "@/lib/validations/auth";
import { useAuthStore } from "@/stores/authStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Availability states
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);

  // Refs for auto-focus
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const signUp = useAuthStore((state) => state.signUp);
  const { isOffline } = useNetworkStatus();

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, touchedFields, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched", // Validate after blur
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const username = watch("username");
  const email = watch("email");
  const phone = watch("phone");

  // Debounced username availability check
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
              // Clear manual error but keep Zod errors
              if (errors.username?.type === "manual") {
                clearErrors("username");
              }
            }
          }
        } catch (error) {
          console.error("Username check failed:", error);
        } finally {
          if (!cancelled) {
            setCheckingUsername(false);
          }
        }
      } else {
        setUsernameAvailable(null);
        // Clear manual availability error
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

  // Debounced email availability check
  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      if (email && email.includes("@")) {
        setCheckingEmail(true);
        try {
          const { available } = await availabilityCheck.email(email);
          if (!cancelled) {
            setEmailAvailable(available);

            if (!available) {
              setError("email", {
                type: "manual",
                message: "Email is already registered",
              });
            } else {
              if (errors.email?.type === "manual") {
                clearErrors("email");
              }
            }
          }
        } catch (error) {
          console.error("Email check failed:", error);
        } finally {
          if (!cancelled) {
            setCheckingEmail(false);
          }
        }
      } else {
        setEmailAvailable(null);
        if (errors.email?.type === "manual") {
          clearErrors("email");
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      cancelled = true;
    };
  }, [email]);

  // Debounced phone availability check
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
          console.error("Phone check failed:", error);
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

  // Password strength indicator
  const getPasswordStrength = (
    pass: string,
  ): { text: string; color: string } => {
    if (!pass) return { text: "", color: "" };
    if (pass.length < 6) return { text: "Weak", color: Colors.error };
    if (pass.length < 8) return { text: "Fair", color: Colors.warning };

    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);

    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(
      Boolean,
    ).length;

    if (strength >= 3) return { text: "Strong", color: Colors.success };
    return { text: "Fair", color: Colors.warning };
  };

  const passwordStrength = getPasswordStrength(password);

  // Check if form can be submitted
  const canSubmit =
    isValid &&
    !loading &&
    !isOffline &&
    !checkingUsername &&
    !checkingEmail &&
    !checkingPhone &&
    usernameAvailable !== false &&
    emailAvailable !== false &&
    phoneAvailable !== false;

  const onSubmit = async (data: RegisterFormData) => {
    // Double-check availability before submitting
    if (usernameAvailable === false) {
      haptics.error();
      Alert.alert("Error", "Username is already taken. Please choose another.");
      return;
    }

    if (emailAvailable === false) {
      haptics.error();
      Alert.alert(
        "Error",
        "Email is already registered. Please login instead.",
      );
      return;
    }

    if (phoneAvailable === false) {
      haptics.error();
      Alert.alert("Error", "Phone number is already registered.");
      return;
    }

    // Check network
    if (isOffline) {
      haptics.error();
      Alert.alert(
        "No Internet",
        "Please check your internet connection and try again.",
      );
      return;
    }

    // Rate limiting check
    const rateCheck = rateLimiter.check("signup", rateLimitConfigs.signup);
    if (!rateCheck.allowed) {
      haptics.error();
      Alert.alert(
        "Too Many Attempts",
        `Please wait ${rateCheck.retryAfter} seconds before trying again.`,
      );
      return;
    }

    setLoading(true);
    try {
      // Sanitize inputs
      const sanitizedData = {
        email: sanitize.email(data.email),
        password: data.password.trim(),
        full_name: sanitize.name(data.full_name),
        username: sanitize.username(data.username),
        phone: sanitize.phone(data.phone),
      };

      await signUp(sanitizedData);

      haptics.success();

      // Navigate to OTP verification screen
      router.push("/(auth)/verify-otp");
    } catch (error: any) {
      haptics.error();
      const errorMessage = parseSupabaseError(error);

      // If duplicate error, update availability states
      if (errorMessage.includes("Username already taken")) {
        setUsernameAvailable(false);
      }
      if (errorMessage.includes("Email already registered")) {
        setEmailAvailable(false);
      }
      if (errorMessage.includes("Phone number already registered")) {
        setPhoneAvailable(false);
      }

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <OfflineNotice />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
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
                  blurOnSubmit={false}
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
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                  rightIcon={
                    checkingUsername ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.text.secondary}
                      />
                    ) : usernameAvailable === true && username.length >= 3 ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.success}
                      />
                    ) : usernameAvailable === false ? (
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={Colors.error}
                      />
                    ) : null
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  ref={emailRef}
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={(text) => onChange(sanitize.email(text))}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  touched={touchedFields.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  editable={!loading}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  blurOnSubmit={false}
                  rightIcon={
                    checkingEmail ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.text.secondary}
                      />
                    ) : emailAvailable === true && email.includes("@") ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.success}
                      />
                    ) : emailAvailable === false ? (
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={Colors.error}
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
                  returnKeyType="next"
                  editable={!loading}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  rightIcon={
                    checkingPhone ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.text.secondary}
                      />
                    ) : phoneAvailable === true && phone.length === 10 ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.success}
                      />
                    ) : phoneAvailable === false ? (
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={Colors.error}
                      />
                    ) : null
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <FormInput
                    ref={passwordRef}
                    label="Password"
                    placeholder="Create a strong password"
                    value={value}
                    onChangeText={(text) => onChange(text.trim())}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    touched={touchedFields.password}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="newPassword"
                    returnKeyType="next"
                    editable={!loading}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => {
                          setShowPassword(!showPassword);
                          haptics.light();
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={24}
                          color={Colors.text.secondary}
                        />
                      </TouchableOpacity>
                    }
                  />
                  {passwordStrength.text && value && (
                    <Text
                      style={[
                        styles.strengthText,
                        { color: passwordStrength.color },
                      ]}
                    >
                      Password strength: {passwordStrength.text}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  ref={confirmPasswordRef}
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  touched={touchedFields.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  returnKeyType="done"
                  editable={!loading}
                  onSubmitEditing={handleSubmit(onSubmit)}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => {
                        setShowConfirmPassword(!showConfirmPassword);
                        haptics.light();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={24}
                        color={Colors.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                />
              )}
            />

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity
                disabled={loading}
                onPress={() => haptics.selection()}
              >
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  strengthText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginTop: -Spacing.sm - 4,
    marginBottom: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
