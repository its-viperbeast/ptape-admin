'use client';
import Swal from 'sweetalert2';
import { useForm, Controller } from "react-hook-form";
import ComponentCard from "@/components/common/ComponentCard";
import VideoSourceManager from "@/components/video/VideoSourceManager";
import VideoDetailsInputs from "@/components/video/VideoDetailsInputs";
import StudioSelect from "@/components/video/StudioSelect";
import PornstarSelect from "@/components/video/PornstarSelect";
import PosterFetch from "@/components/video/PosterFetch";
import React from "react";
import axios from "@/utils/axios";
import { resolveThumbnailForSave } from "@/utils/uploadImage";
import { useRouter } from "next/navigation";
import { toUTC } from "@/utils/commonFunc";
import ToggleSwitch from "@/components/form/switch/Switch";
import CategoryDetails from '@/components/video/CategoryDetails';
import { Save, Film, ArrowLeft } from 'lucide-react';

// Define the form data interface
interface VideoFormData {
  // Video Details
  title: string;
  description: string | null;

  datetime: string;
  duration: string;

  // studios Details
  studios: { value: string; label: string }[];

  // Pornstar Details
  pornstars: { value: string; label: string }[];

  // category Details
  categories: { value: string; label: string }[];

  // Poster Details
  thumbnail: string;
  thumbnailFile?: File | null;
  is_active: boolean;

  videoSources: {
    id: string | null;
    file_size: number | null;
    file_type: string | null;
    quality: string | null;
    url: string;
  }[];
}


export default function AddVideo() {
  const router = useRouter();

  // Set up react-hook-form
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<VideoFormData>({
    defaultValues: {
      title: '',
      description: '',
      datetime: '',
      duration: '00:00:00',
      studios: [],
      pornstars: [],
      categories: [],
      thumbnail: '',
      thumbnailFile: null,
      is_active: false,
      videoSources: [{
        id: null,
        file_size: null,
        file_type: "mp4",
        quality: "720p",
        url: ""
      }]
    }
  });

  const onSubmit = async (data: VideoFormData) => {
    try {
      Swal.fire({ title: 'Uploading poster...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const thumbnail = await resolveThumbnailForSave(data.thumbnail, data.thumbnailFile, { required: true });

      let sendData = {
        title: data.title,
        description: data.description || null,
        upload_datetime: toUTC(data.datetime),
        duration: data.duration,
        studios: data.studios.map(studio => studio.label),
        pornstars: data.pornstars.map(pornstar => pornstar.label),
        categories: data.categories.map(category => category.label),
        thumbnail,
        is_active: data.is_active ? 1 : 0,
        videoSources: data.videoSources?.map(source => ({
          file_size: source.file_size,
          file_type: source.file_type,
          quality: source.quality,
          url: source.url
        })) || []
      }

      Swal.update({ title: 'Saving video...' });
      const response = await axios.post('/add-video', sendData);
      if (response.data.success) {
        Swal.fire({
          title: 'Success',
          text: 'Video added successfully!',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 2000,
        }).then(() => {
          router.push("/video/list");
        });
      } else {
        throw new Error(response.data.message || 'Failed to add video');
      }
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to add video',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-6 pb-20">
      <div className="max-w-[1920px] mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/video/list")}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
                <Film className="w-7 h-7 text-blue-600" />
                Add New Video
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new video entry by filling out the form
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>Save Video</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Left Column - Main Details */}
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Basic Info</h3>
                </div>
                <div className="p-6">
                  <VideoDetailsInputs control={control} errors={errors} />

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <Controller
                      name="is_active"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                          <div>
                            <span className="block font-medium text-gray-900 dark:text-white">Publication Status</span>
                            <span className="text-sm text-gray-500">Enable to make this video publicly visible</span>
                          </div>
                          <ToggleSwitch
                            label=""
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Categorization Section - Grouped */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Studio Information
                  </h3>
                  <StudioSelect control={control} />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Cast / Pornstars
                  </h3>
                  <PornstarSelect control={control} errors={errors} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Categories & Tags
                </h3>
                <CategoryDetails control={control} errors={errors} />
              </div>
            </div>



            {/* Right Column - Media & Tools */}
            <div className="xl:col-span-4 space-y-6">
              {/* Poster / Thumbnail */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-medium">Poster / Thumbnail</div>
                <div className="p-6">
                  <PosterFetch control={control} errors={errors} required />
                </div>
              </div>
            </div>
          </div>

          {/* Video Source */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-medium">Video Source</div>
            <div className="p-6">
              <VideoSourceManager
                control={control}
                name="videoSources"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}