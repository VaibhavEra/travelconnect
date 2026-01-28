export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_SIZE_MB: 5,
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ] as const,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png"] as const,
  BUCKET_NAMES: {
    tripTickets: "trip-tickets",
    parcelPhotos: "parcel-photos",
  },
  IMAGE_QUALITY: 0.7,
  ASPECT_RATIO: [4, 3] as [number, number],
  MAX_PHOTOS: 5,
} as const;

// Type for allowed file types
type AllowedFileType = (typeof FILE_UPLOAD.ALLOWED_TYPES)[number];
type AllowedImageType = (typeof FILE_UPLOAD.ALLOWED_IMAGE_TYPES)[number];

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Helper function to check if file type is allowed
export const isAllowedFileType = (
  mimeType: string,
): mimeType is AllowedFileType => {
  return (FILE_UPLOAD.ALLOWED_TYPES as readonly string[]).includes(mimeType);
};

// Helper function to check if file is image
export const isImageFile = (mimeType: string): mimeType is AllowedImageType => {
  return (FILE_UPLOAD.ALLOWED_IMAGE_TYPES as readonly string[]).includes(
    mimeType,
  );
};
