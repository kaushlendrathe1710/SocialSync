import { useState } from 'react';
import { useToast } from './use-toast';

interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<UploadResult | null>;
  isUploading: boolean;
  uploadProgress: number;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "File size must be less than 100MB",
          variant: "destructive"
        });
        return null;
      }

      // Validate file type - match server-side validation
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon', 'image/heic', 'image/heif',
        'video/mp4', 'video/mov', 'video/avi', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-flv', 'video/x-ms-wmv', 'video/mp4', 'video/3gpp', 'video/ogg',
        'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/x-ms-wma', 'audio/opus', 'audio/x-matroska', 'audio/webm'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only images, videos, and audio files are allowed",
          variant: "destructive"
        });
        return null;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      console.log('Starting file upload:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        console.error('❌ Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const result: UploadResult = await response.json();
      console.log('✅ File upload successful:', result);
      
      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });

      return result;
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress,
  };
}
