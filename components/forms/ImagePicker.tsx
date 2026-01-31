import { supabase } from "@/lib/supabase";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
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
  exactCount?: number;
  error?: string;
  disableCropping?: boolean; // NEW
}

export default function ImagePicker({
  images,
  onChange,
  maxImages = 5,
  exactCount,
  error,
  disableCropping = false, // NEW: Default false
}: ImagePickerProps) {
  const colors = useThemeColors();
  const [uploading, setUploading] = useState(false);

  const effectiveMax = exactCount || maxImages;
  const requiresExact = !!exactCount;

  const showImageSourceOptions = () => {
    if (images.length >= effectiveMax) {
      Alert.alert(
        "Limit Reached",
        requiresExact
          ? `You must upload exactly ${exactCount} photos.`
          : `You can only upload up to ${maxImages} photos.`,
      );
      return;
    }

    Alert.alert(
      "Add Photo",
      "Choose how to add your photo",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Choose from Gallery",
          onPress: pickFromGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const takePhoto = async () => {
    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access to take photos of your parcel.",
      );
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      allowsEditing: !disableCropping, // NEW: Respect disableCropping
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Gallery Permission Required",
        "Please allow gallery access to choose photos.",
      );
      return;
    }

    const remaining = effectiveMax - images.length;

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      allowsEditing: !disableCropping && remaining === 1, // NEW: Only allow editing if cropping enabled and single selection
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      // Upload all selected images
      for (const asset of result.assets) {
        await uploadImage(asset.uri);
      }
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

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

      const {
        data: { publicUrl },
      } = supabase.storage.from("parcel-photos").getPublicUrl(data.path);

      console.log("Upload successful:", publicUrl);

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

  const getLabelText = () => {
    if (requiresExact) {
      return `Parcel Photos * (Exactly ${exactCount} required)`;
    }
    return `Parcel Photos * (Max ${maxImages})`;
  };

  const getProgressText = () => {
    if (requiresExact) {
      return `${images.length} / ${exactCount}`;
    }
    return `${images.length} / ${maxImages}`;
  };

  const needsMorePhotos = requiresExact && images.length < exactCount;
  const hasEnoughPhotos = requiresExact ? images.length === exactCount : true;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text.primary }]}>
          {getLabelText()}
        </Text>
        <Text
          style={[
            styles.progressText,
            { color: colors.text.secondary },
            hasEnoughPhotos && { color: colors.success },
          ]}
        >
          {getProgressText()}
        </Text>
      </View>
      <Text style={[styles.helper, { color: colors.text.tertiary }]}>
        Take clear photos showing the item and its packaging
      </Text>

      {needsMorePhotos && (
        <View
          style={[
            styles.warningBox,
            { backgroundColor: colors.warning + "10" },
          ]}
        >
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            You need {exactCount! - images.length} more{" "}
            {exactCount! - images.length === 1 ? "photo" : "photos"}
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
              style={[
                styles.removeButton,
                { backgroundColor: colors.background.primary },
              ]}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </Pressable>
            <View
              style={[styles.imageNumber, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[styles.imageNumberText, { color: colors.text.inverse }]}
              >
                {index + 1}
              </Text>
            </View>
          </View>
        ))}

        {images.length < effectiveMax && (
          <Pressable
            style={[
              styles.addButton,
              {
                borderColor: needsMorePhotos
                  ? colors.warning
                  : colors.border.default,
                backgroundColor: needsMorePhotos
                  ? colors.warning + "05"
                  : colors.background.primary,
              },
            ]}
            onPress={showImageSourceOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="images-outline"
                  size={32}
                  color={needsMorePhotos ? colors.warning : colors.primary}
                />
                <Text
                  style={[
                    styles.addButtonText,
                    {
                      color: needsMorePhotos ? colors.warning : colors.primary,
                    },
                    needsMorePhotos && {
                      fontWeight: Typography.weights.semibold,
                    },
                  ]}
                >
                  {images.length === 0 ? "Add Photos" : "Add Photo"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
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
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  helper: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.sm,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  warningText: {
    fontSize: Typography.sizes.xs,
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
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  imageNumber: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumberText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
});
