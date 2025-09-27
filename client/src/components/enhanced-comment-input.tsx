import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Smile, Paperclip, X } from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import EmojiPicker from './emoji-picker';
import GifPicker from './gif-picker';

interface EnhancedCommentInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (data: { content: string; imageUrl?: string; gifUrl?: string; mediaType?: string }) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  maxLength?: number;
  showMediaOptions?: boolean;
}

export default function EnhancedCommentInput({
  placeholder = "Write a comment...",
  value,
  onChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  maxLength = 1000,
  showMediaOptions = true
}: EnhancedCommentInputProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    const result = await uploadFile(file);
    if (result) {
      setSelectedImage(result.url);
      setSelectedGif(null);
      setMediaType('image');
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGif(gifUrl);
    setSelectedImage(null);
    setMediaType('gif');
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() && !selectedImage && !selectedGif) return;

    console.log('Submitting comment with data:', {
      content: value,
      imageUrl: selectedImage || undefined,
      gifUrl: selectedGif || undefined,
      mediaType: mediaType || undefined
    });

    onSubmit({
      content: value,
      imageUrl: selectedImage || undefined,
      gifUrl: selectedGif || undefined,
      mediaType: mediaType || undefined
    });

    // Reset form
    setSelectedImage(null);
    setSelectedGif(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = () => {
    setSelectedImage(null);
    setSelectedGif(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canSubmit = (value.trim() || selectedImage || selectedGif) && !isSubmitting && !isUploading;

  return (
    <div className="space-y-3">
      {/* Media Preview */}
      {(selectedImage || selectedGif) && (
        <div className="relative">
          <div className="relative inline-block">
            <img
              src={selectedImage || selectedGif || ''}
              alt="Selected media"
              className="max-w-32 max-h-32 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={removeMedia}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isUploading}
            className="min-h-[60px] pr-12 resize-none"
            maxLength={maxLength}
          />
          <div className="absolute right-2 bottom-2 flex space-x-1">
            <EmojiPicker onEmojiSelect={handleEmojiSelect}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={disabled || isUploading}
              >
                <Smile className="w-4 h-4 text-gray-500" />
              </Button>
            </EmojiPicker>
          </div>
        </div>

        {/* Media Options */}
        {showMediaOptions && (
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={disabled || isUploading}
              aria-label="Upload image for comment"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="h-8 px-2"
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Image
            </Button>
            
            <GifPicker onGifSelect={handleGifSelect}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isUploading}
                className="h-8 px-2"
              >
                <Paperclip className="w-4 h-4 mr-1" />
                GIF
              </Button>
            </GifPicker>
          </div>
        )}

        {/* Character Count and Submit */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {value.length}/{maxLength}
          </div>
          <Button
            type="submit"
            disabled={!canSubmit}
            size="sm"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </form>
    </div>
  );
}
