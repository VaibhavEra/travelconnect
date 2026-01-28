import { FILE_UPLOAD } from "@/lib/constants/upload";
import { supabase } from "@/lib/supabase";
import { logger } from "./logger";

interface UploadResult {
  url: string;
  path: string;
}

interface UploadError {
  error: string;
}

/**
 * Upload ticket file to Supabase Storage
 * @param uri - Local file URI (from expo-document-picker or expo-image-picker)
 * @param mimeType - File MIME type
 * @param fileName - Original file name
 * @param fileSize - File size in bytes
 * @param userId - Current user's ID (for folder organization)
 * @param bucketName - Storage bucket name (default: trip-tickets)
 * @returns Public URL of uploaded file or error
 */
export async function uploadTicketFile(
  uri: string,
  mimeType: string,
  fileName: string,
  fileSize: number,
  userId: string,
  bucketName: string = FILE_UPLOAD.BUCKET_NAMES.tripTickets,
): Promise<UploadResult | UploadError> {
  try {
    logger.info("Starting file upload", {
      uri,
      mimeType,
      fileName,
      fileSize,
      bucketName,
    });

    // Validate file size
    if (fileSize > FILE_UPLOAD.MAX_SIZE) {
      return {
        error: `File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit`,
      };
    }

    // Validate MIME type
    if (!(FILE_UPLOAD.ALLOWED_TYPES as readonly string[]).includes(mimeType)) {
      return {
        error: "Invalid file type. Only JPG, PNG, and PDF are allowed",
      };
    }

    // Create FormData
    const formData = new FormData();

    // Append file with correct structure for React Native
    formData.append("file", {
      uri: uri,
      type: mimeType,
      name: fileName,
    } as any);

    // Generate unique filename
    const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${uniqueFileName}`;

    logger.info("Uploading to storage", { filePath, bucketName });

    // Upload using fetch (Supabase client doesn't handle FormData well in RN)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { error: "Not authenticated" };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("File upload failed", {
        status: response.status,
        errorText,
      });
      return { error: `Upload failed: ${response.status}` };
    }

    const result = await response.json();
    logger.info("File upload successful", result);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    logger.error("File upload exception", error);
    return {
      error: error?.message || "An unexpected error occurred during upload",
    };
  }
}

/**
 * Delete ticket file from Supabase Storage
 * @param path - File path in storage (from upload result)
 * @param bucketName - Storage bucket name (default: trip-tickets)
 */
export async function deleteTicketFile(
  path: string,
  bucketName: string = FILE_UPLOAD.BUCKET_NAMES.tripTickets,
): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([path]);

    if (error) {
      logger.error("File delete failed", { path, bucketName, error });
    } else {
      logger.info("File deleted successfully", { path, bucketName });
    }
  } catch (error) {
    logger.error("File delete exception", { path, bucketName, error });
  }
}

/**
 * Upload parcel photo to Supabase Storage
 * Convenience wrapper for parcel photos
 */
export async function uploadParcelPhoto(
  uri: string,
  mimeType: string,
  fileName: string,
  fileSize: number,
  userId: string,
): Promise<UploadResult | UploadError> {
  return uploadTicketFile(
    uri,
    mimeType,
    fileName,
    fileSize,
    userId,
    FILE_UPLOAD.BUCKET_NAMES.parcelPhotos,
  );
}

/**
 * Delete parcel photo from Supabase Storage
 * Convenience wrapper for parcel photos
 */
export async function deleteParcelPhoto(path: string): Promise<void> {
  return deleteTicketFile(path, FILE_UPLOAD.BUCKET_NAMES.parcelPhotos);
}
