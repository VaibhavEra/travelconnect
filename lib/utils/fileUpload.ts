import { supabase } from "@/lib/supabase";

// Allowed file types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
 * @returns Public URL of uploaded file or error
 */
export async function uploadTicketFile(
  uri: string,
  mimeType: string,
  fileName: string,
  fileSize: number,
  userId: string,
): Promise<UploadResult | UploadError> {
  try {
    console.log("[FileUpload] Starting upload:", {
      uri,
      mimeType,
      fileName,
      fileSize,
    });

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return { error: "File size exceeds 5MB limit" };
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
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

    console.log("[FileUpload] Uploading to path:", filePath);

    // Upload using fetch (Supabase client doesn't handle FormData well in RN)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { error: "Not authenticated" };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/trip-tickets/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[FileUpload] Upload failed:", errorText);
      return { error: `Upload failed: ${response.status}` };
    }

    const result = await response.json();
    console.log("[FileUpload] Upload successful:", result);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("trip-tickets").getPublicUrl(filePath);

    console.log("[FileUpload] Public URL:", publicUrl);

    return {
      url: publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error("[FileUpload] Exception:", error);
    return {
      error: error?.message || "An unexpected error occurred during upload",
    };
  }
}

/**
 * Delete ticket file from Supabase Storage
 * @param path - File path in storage (from upload result)
 */
export async function deleteTicketFile(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from("trip-tickets")
      .remove([path]);

    if (error) {
      console.error("[FileUpload] Delete error:", error);
    }
  } catch (error) {
    console.error("[FileUpload] Delete exception:", error);
  }
}
