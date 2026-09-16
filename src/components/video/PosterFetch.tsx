'use client';

import React, { useEffect, useRef } from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { ImagePlus } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface PosterDetailsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  required?: boolean;
}

const PosterDetails: React.FC<PosterDetailsProps> = ({ control, errors, required = false }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const validateFile = (file: File | null | undefined) => {
    if (required && !(file instanceof File)) {
      return 'Poster is required';
    }
    if (file instanceof File) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return 'Only JPEG, PNG, WebP, and GIF images are allowed';
      }
      if (file.size > MAX_SIZE_BYTES) {
        return 'Image must be 5MB or smaller';
      }
    }
    return true;
  };

  return (
    <div>
      <Controller
        name="thumbnail"
        control={control}
        render={({ field: thumbnailField }) => (
          <Controller
            name="thumbnailFile"
            control={control}
            rules={{ validate: validateFile }}
            render={({ field: fileField }) => {
              const preview = thumbnailField.value;
              const errorMessage = errors.thumbnailFile?.message || errors.thumbnail?.message;

              const applyFile = (file: File) => {
                fileField.onChange(file);
                if (validateFile(file) !== true) {
                  return;
                }
                if (blobUrlRef.current) {
                  URL.revokeObjectURL(blobUrlRef.current);
                }
                const blobUrl = URL.createObjectURL(file);
                blobUrlRef.current = blobUrl;
                thumbnailField.onChange(blobUrl);
              };

              return (
                <>
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    {preview ? (
                      <img
                        className="w-full h-full object-cover"
                        src={preview}
                        alt="Poster preview"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-sm">No poster selected</span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) applyFile(file);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                  >
                    {preview ? 'Change image' : 'Choose image'}
                  </button>

                  {errorMessage && (
                    <p className="text-red-500 text-sm mt-1">{String(errorMessage)}</p>
                  )}
                </>
              );
            }}
          />
        )}
      />
    </div>
  );
};

export default PosterDetails;
