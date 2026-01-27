import { supabase } from "@/lib/supabase";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy"; // Use legacy API
import * as ExpoImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface ImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  exactCount?: number; // NEW: Enforce exact photo count
  error?: string;
}

export default function ImagePicker({
  images,
  onChange,
  maxImages = 5,
  exactCount, // NEW
  error,
}: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);

  // Determine effective max (use exactCount if provided, otherwise maxImages)
  const effectiveMax = exactCount || maxImages;
  const requiresExact = !!exactCount;

  const takePhoto = async () => {
    // Check if we've reached the limit
    if (images.length >= effectiveMax) {
      Alert.alert(
        "Limit Reached",
        requiresExact
          ? `You must upload exactly ${exactCount} photos.`
          : `You can only upload up to ${maxImages} photos.`,
      );
      return;
    }

    // Request camera permission
    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access to take photos of your parcel.",
      );
      return;
    }

    // Launch camera
    const result = await ExpoImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Read file as base64 using legacy API
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get file extension
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Determine content type
      const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

      // Upload to Supabase Storage using base64
      const { data, error } = await supabase.storage
        .from("parcel-photos")
        .upload(fileName, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error("Supabase storage error:", error);
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("parcel-photos").getPublicUrl(data.path);

      console.log("Upload successful:", publicUrl);

      // Add to images array
      onChange([...images, publicUrl]);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        error.message || "Failed to upload image. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  // Generate label text
  const getLabelText = () => {
    if (requiresExact) {
      return `Parcel Photos * (Exactly ${exactCount} required)`;
    }
    return `Parcel Photos * (Max ${maxImages})`;
  };

  // Generate progress indicator
  const getProgressText = () => {
    if (requiresExact) {
      return `${images.length} / ${exactCount} photos`;
    }
    return `${images.length} / ${maxImages} photos`;
  };

  // Check if we still need more photos
  const needsMorePhotos = requiresExact && images.length < exactCount;
  const hasEnoughPhotos = requiresExact ? images.length === exactCount : true;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{getLabelText()}</Text>
        <Text
          style={[
            styles.progressText,
            hasEnoughPhotos && styles.progressTextComplete,
          ]}
        >
          {getProgressText()}
        </Text>
      </View>
      <Text style={styles.helper}>
        Take clear photos showing the item and its packaging
      </Text>

      {needsMorePhotos && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            You need {exactCount - images.length} more{" "}
            {exactCount - images.length === 1 ? "photo" : "photos"}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.image} />
            <Pressable
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color={Colors.error} />
            </Pressable>
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>
          </View>
        ))}

        {images.length < effectiveMax && (
          <Pressable
            style={[
              styles.addButton,
              needsMorePhotos && styles.addButtonHighlight,
            ]}
            onPress={takePhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="camera"
                  size={32}
                  color={needsMorePhotos ? Colors.warning : Colors.primary}
                />
                <Text
                  style={[
                    styles.addButtonText,
                    needsMorePhotos && styles.addButtonTextHighlight,
                  ]}
                >
                  {images.length === 0 ? "Take Photos" : "Take Photo"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  progressTextComplete: {
    color: Colors.success,
  },
  helper: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.warning + "10",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  warningText: {
    fontSize: Typography.sizes.xs,
    color: Colors.warning,
    fontWeight: Typography.weights.medium,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  imageContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
  },
  imageNumber: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumberText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
  },
  addButtonHighlight: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + "05",
  },
  addButtonText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  addButtonTextHighlight: {
    color: Colors.warning,
    fontWeight: Typography.weights.semibold,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
