import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface FileUploadButtonProps {
  label: string;
  value: string | null; // Now stores local URI (file://) until form submission
  onChange: (uri: string) => void;
  error?: string;
}

export default function FileUploadButton({
  label,
  value,
  onChange,
  error,
}: FileUploadButtonProps) {
  const colors = useThemeColors();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleUpload = async () => {
    try {
      setIsSelecting(true);
      haptics.light();

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsSelecting(false);
        return;
      }

      const file = result.assets[0];

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size && file.size > maxSize) {
        Alert.alert("File Too Large", "Maximum file size is 5MB");
        setIsSelecting(false);
        return;
      }

      // Store LOCAL URI only - no upload yet
      onChange(file.uri);
      haptics.success();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to select file");
      haptics.error();
    } finally {
      setIsSelecting(false);
    }
  };

  const handleRemove = () => {
    haptics.light();
    onChange("");
  };

  const isImage =
    value &&
    (value.endsWith(".jpg") ||
      value.endsWith(".jpeg") ||
      value.endsWith(".png") ||
      value.endsWith(".JPG") ||
      value.endsWith(".JPEG") ||
      value.endsWith(".PNG"));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      {value ? (
        <View
          style={[
            styles.uploadedContainer,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {isImage ? (
            <Image source={{ uri: value }} style={styles.preview} />
          ) : (
            <View
              style={[
                styles.pdfPreview,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons name="document-text" size={48} color={colors.primary} />
              <Text style={[styles.pdfText, { color: colors.primary }]}>
                Ticket Selected
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.removeButton,
              { backgroundColor: colors.background.primary },
            ]}
            onPress={handleRemove}
          >
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[
            styles.uploadButton,
            {
              backgroundColor: colors.background.secondary,
              borderColor: error ? colors.error : colors.border.default,
            },
          ]}
          onPress={handleUpload}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={32} color={colors.primary} />
              <Text style={[styles.uploadText, { color: colors.primary }]}>
                Select Ticket
              </Text>
              <Text
                style={[styles.uploadSubtext, { color: colors.text.tertiary }]}
              >
                Image or PDF (Max 5MB)
              </Text>
            </>
          )}
        </Pressable>
      )}

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  uploadButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  uploadText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.sm,
  },
  uploadSubtext: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  uploadedContainer: {
    position: "relative",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  pdfPreview: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
  },
  removeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
