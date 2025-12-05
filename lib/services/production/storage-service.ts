/**
 * PRODUCTION STORAGE SERVICE
 * Handles pet image uploads to Supabase Storage
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'pet-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function requireClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

async function getCurrentUserId(): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a pet image
 * Images are stored in user-specific folders: {userId}/{petId}/{filename}
 */
export async function uploadPetImage(
  file: File,
  petId: string
): Promise<UploadResult> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const supabase = requireClient();
  const userId = await getCurrentUserId();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}.${extension}`;
  const path = `${userId}/${petId}/${filename}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    const msg = error?.message || '';
    if (msg.includes('Bucket not found')) {
      throw new Error('Storage bucket missing. Run Supabase migration 004_storage_bucket.sql');
    }
    if (msg.includes('duplicate')) {
      throw new Error('Upload failed because a file with this name exists. Try again.');
    }
    throw new Error('Failed to upload image');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete a pet image
 */
export async function deletePetImage(path: string): Promise<void> {
  const supabase = requireClient();
  const userId = await getCurrentUserId();

  // Verify the path belongs to the current user
  if (!path.startsWith(`${userId}/`)) {
    throw new Error('Cannot delete images owned by other users');
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Delete all images for a pet
 */
export async function deleteAllPetImages(petId: string): Promise<void> {
  const supabase = requireClient();
  const userId = await getCurrentUserId();

  const folderPath = `${userId}/${petId}`;

  // List all files in the pet's folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError) {
    console.error('Error listing images:', listError);
    return;
  }

  if (!files || files.length === 0) {
    return;
  }

  // Delete all files
  const filePaths = files.map((file) => `${folderPath}/${file.name}`);
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths);

  if (deleteError) {
    console.error('Error deleting images:', deleteError);
  }
}

/**
 * Get a signed URL for a private image (if needed)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = requireClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error('Failed to create signed URL');
  }

  return data.signedUrl;
}

/**
 * Upload a user avatar
 * Avatars are stored in: avatars/{userId}/{filename}
 */
export async function uploadUserAvatar(file: File): Promise<UploadResult> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const supabase = requireClient();
  const userId = await getCurrentUserId();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}.${extension}`;
  const path = `avatars/${userId}/${filename}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true, // Allow overwriting for avatars
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    throw new Error('Failed to upload avatar');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete user's previous avatars (cleanup)
 */
export async function deleteUserAvatars(): Promise<void> {
  const supabase = requireClient();
  const userId = await getCurrentUserId();

  const folderPath = `avatars/${userId}`;

  // List all files in the avatar folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError || !files || files.length === 0) {
    return;
  }

  // Delete all files
  const filePaths = files.map((file) => `${folderPath}/${file.name}`);
  await supabase.storage.from(BUCKET_NAME).remove(filePaths);
}

/**
 * Upload an appointment attachment image
 * Attachments are stored in: appointments/{userId}/{appointmentId}/{filename}
 */
export async function uploadAppointmentAttachment(
  file: File,
  appointmentId: string
): Promise<UploadResult> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const supabase = requireClient();
  const userId = await getCurrentUserId();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}.${extension}`;
  const path = `appointments/${userId}/${appointmentId}/${filename}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading appointment attachment:', error);
    throw new Error('Failed to upload attachment');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete all attachments for an appointment
 */
export async function deleteAppointmentAttachments(appointmentId: string): Promise<void> {
  const supabase = requireClient();
  const userId = await getCurrentUserId();

  const folderPath = `appointments/${userId}/${appointmentId}`;

  // List all files
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath);

  if (listError || !files || files.length === 0) {
    return;
  }

  // Delete all files
  const filePaths = files.map((file) => `${folderPath}/${file.name}`);
  await supabase.storage.from(BUCKET_NAME).remove(filePaths);
}
