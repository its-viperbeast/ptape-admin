import axios from '@/utils/axios';

export async function uploadPosterFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post('/upload-image', formData, { timeout: 60000 });
  if (!response.data?.success || !response.data?.data?.url) {
    throw new Error(response.data?.message || 'Failed to upload poster');
  }
  return response.data.data.url as string;
}

export async function resolveThumbnailForSave(
  thumbnail: string | null | undefined,
  thumbnailFile?: File | null,
  options?: { required?: boolean }
): Promise<string | null> {
  if (thumbnailFile instanceof File) {
    return uploadPosterFile(thumbnailFile);
  }
  if (options?.required) {
    throw new Error('Poster is required');
  }
  if (thumbnail && !thumbnail.startsWith('blob:')) {
    return thumbnail;
  }
  return null;
}
