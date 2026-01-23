import { uploadTicketFile } from "@/lib/utils/fileUpload";
import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface FileUploadButtonProps {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  userId: string;
  error?: string;
}

export default function FileUploadButton({
  label,
  value,
  onChange,
  userId,
  error,
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setUploading(true);
      setUploadError(null);
      haptics.light();

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];

      // Upload file
      const uploadResult = await uploadTicketFile(
        file.uri,
        file.mimeType || "image/jpeg",
        file.name,
        file.size || 0,
        userId,
      );

      if ("error" in uploadResult) {
        setUploadError(uploadResult.error);
        haptics.error();
      } else {
        onChange(uploadResult.url);
        haptics.success();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
      haptics.error();
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    haptics.light();
  };

  const isImage =
    value &&
    (value.endsWith(".jpg") ||
      value.endsWith(".jpeg") ||
      value.endsWith(".png"));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View style={styles.uploadedContainer}>
          {isImage ? (
            <Image source={{ uri: value }} style={styles.preview} />
          ) : (
            <View style={styles.pdfPreview}>
              <Ionicons name="document-text" size={48} color={Colors.primary} />
              <Text style={styles.pdfText}>PDF Uploaded</Text>
            </View>
          )}

          <Pressable style={styles.removeButton} onPress={handleRemove}>
            <Ionicons name="close-circle" size={24} color={Colors.error} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.uploadButton, error && styles.uploadButtonError]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={32}
                color={Colors.primary}
              />
              <Text style={styles.uploadText}>Upload Ticket</Text>
              <Text style={styles.uploadSubtext}>Image or PDF (Max 5MB)</Text>
            </>
          )}
        </Pressable>
      )}

      {(error || uploadError) && (
        <Text style={styles.error}>{error || uploadError}</Text>
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
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  uploadButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: "dashed",
  },
  uploadButtonError: {
    borderColor: Colors.error,
  },
  uploadText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  uploadSubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  uploadedContainer: {
    position: "relative",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
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
    backgroundColor: Colors.background.tertiary,
  },
  pdfText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  removeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
