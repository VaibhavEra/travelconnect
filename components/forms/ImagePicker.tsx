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
  error?: string;
}

export default function ImagePicker({
  images,
  onChange,
  maxImages = 5,
  error,
}: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert(
        "Limit Reached",
        `You can only upload up to ${maxImages} photos.`,
      );
      return;
    }

    // Request permission
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload parcel images.",
      );
      return;
    }

    // Pick image - using string value instead of enum
    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any, // Direct string value
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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Parcel Photos * (Max {maxImages})</Text>
      <Text style={styles.helper}>
        Upload clear photos showing the item and its packaging
      </Text>

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
          </View>
        ))}

        {images.length < maxImages && (
          <Pressable
            style={styles.addButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="camera" size={32} color={Colors.primary} />
                <Text style={styles.addButtonText}>Add Photo</Text>
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
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  helper: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
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
  addButtonText: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
