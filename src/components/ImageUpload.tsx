'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImagesChange?: (urls: string[]) => void;
}

export interface ImageUploadRef {
  upload: () => Promise<string[]>;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({ onImagesChange }, ref) => {
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useImperativeHandle(ref, () => ({
    upload: async () => {
      setUploading(true);
      const urls: string[] = [];

      for (const item of files) {
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `wants/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('wants-images')
          .upload(filePath, item.file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('wants-images')
            .getPublicUrl(filePath);
          urls.push(publicUrl);
        }
      }

      setUploading(false);
      if (onImagesChange) onImagesChange(urls);
      return urls;
    }
  }));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );

    const previews = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setFiles(prev => [...prev, ...previews]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file =>
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
      );

      const previews = newFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setFiles(prev => [...prev, ...previews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed border-[#30363D] rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer",
          files.length > 0 ? "pb-4" : ""
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          ) : (
            <Upload className="w-10 h-10 text-gray-500 mb-4" />
          )}
          <p className="text-gray-300 font-medium">
            {uploading ? "Uploading images..." : "Click or drag images to upload"}
          </p>
          <p className="text-gray-500 text-sm mt-1">PNG, JPG, WEBP up to 10MB</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((item, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
              <img
                src={item.preview}
                alt="preview"
                className="w-full h-full object-cover"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;
