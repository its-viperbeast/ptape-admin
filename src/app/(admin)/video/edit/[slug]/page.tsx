'use client';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard"; // Keeping import but might not use directly if restyling
import VideoDetailsInputs from "@/components/video/VideoDetailsInputs";
import StudioSelect from "@/components/video/StudioSelect";
import PornstarSelect from "@/components/video/PornstarSelect";
import PosterFetch from "@/components/video/PosterFetch";
import VideoSourceManager from "@/components/video/VideoSourceManager";
import { useForm, Controller } from "react-hook-form";
import React, { useState } from "react";
import axios from "@/utils/axios";
import { resolveThumbnailForSave } from "@/utils/uploadImage";
import { formatDuration, toLocal, toUTC } from "@/utils/commonFunc";
import Swal from 'sweetalert2';
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/form/switch/Switch";
import CategoryDetails from "@/components/video/CategoryDetails";
import {
    Save,
    ArrowLeft,
    Edit,
    Loader2,
    AlertCircle,
    Copy,
    ExternalLink
} from 'lucide-react';

interface VideoFormData {
    title: string;
    description: string;
    datetime: string;
    duration: string;
    studios: { value: string; label: string }[];
    pornstars: { value: string; label: string }[];
    categories: { value: string; label: string }[];
    thumbnail: string;
    thumbnailFile?: File | null;
    is_active: boolean;
    videoSources: {
        id: string;
        file_size: number | null;
        file_type: string | null;
        quality: string | null;
        url: string;
    }[];
}

export default function EditVideoPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const router = useRouter();
    const [slug, setSlug] = useState<string | null>(null);
    const [external_id, setExternalId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<VideoFormData>({});

    React.useEffect(() => {
        params.then(async (resolvedParams) => {
            setSlug(resolvedParams.slug);
            try {
                const response = await axios.get(`/getvideo?slug=${resolvedParams.slug}`);

                if (response.data.success) {
                    const videoData = response.data.data;
                    setValue("title", videoData.title);
                    setValue("description", videoData.description);
                    setValue("datetime", toLocal(videoData.upload_date));
                    setValue("duration", formatDuration(videoData.duration));
                    setValue("studios", videoData.studios.map((studio: string, index: number) => ({ value: studio + index, label: studio })));
                    setValue("pornstars", videoData.pornstars.map((star: string, index: number) => ({ value: star + index, label: star })));
                    setValue("categories", videoData.categories.map((category: string, index: number) => ({ value: category + index, label: category })));
                    setValue("thumbnail", videoData.thumbnail);
                    setValue("thumbnailFile", null);
                    setValue("is_active", videoData.is_active === 1);
                    setExternalId(videoData.external_id || null);
                    const firstSource = videoData.videoSources?.[0];
                    setValue("videoSources", [{
                        id: firstSource?.video_embed_id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
                        file_size: firstSource?.file_size || null,
                        file_type: firstSource?.file_type || 'mp4',
                        quality: firstSource?.quality || '720p',
                        url: firstSource?.url ? firstSource.url.split('?')[0] : ""
                    }]);
                } else {
                    throw new Error(response.data.message || 'Failed to fetch video details');
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to fetch video details',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            } finally {
                setIsLoading(false);
            }
        });
    }, [params, setValue]);


    const onSubmit = async (data: VideoFormData) => {
        setIsSaving(true);
        try {
            if (data.thumbnailFile instanceof File) {
                Swal.fire({ title: 'Uploading poster...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            }
            const thumbnail = await resolveThumbnailForSave(data.thumbnail, data.thumbnailFile);
            const payload = {
                slug: slug,
                title: data.title,
                description: data.description,
                upload_datetime: toUTC(data.datetime),
                duration: data.duration,
                studios: data.studios.map((studio) => studio.label),
                pornstars: data.pornstars.map((star) => star.label),
                categories: data.categories.map((category) => category.label),
                thumbnail,
                external_id: external_id,
                is_active: data.is_active ? 1 : 0,
                videoSources: data.videoSources.map((source) => ({
                    file_size: source.file_size,
                    file_type: source.file_type,
                    quality: source.quality,
                    url: source.url,
                })) || []
            };

            const response = await axios.post(`/edit-video`, payload);
            if (response.data.success) {
                Swal.fire({
                    title: 'Updated!',
                    text: 'Video details updated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    router.push("/video/list");
                });
            } else {
                throw new Error(response.data.message);
            }
        } catch (error: any) {
            Swal.fire({
                title: 'Error',
                text: error.message || 'Failed to update video',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-500 animate-pulse">Loading video details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-6 pb-20">
            <div className="max-w-[1920px] mx-auto space-y-6">

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 sticky top-0 z-10 backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/video/list")}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-md" title={slug || ''}>
                                    Edit: <span className="text-blue-600 font-medium">{slug}</span>
                                </h1>
                                <button
                                    onClick={() => {
                                        if (slug) {
                                            navigator.clipboard.writeText(slug);
                                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Slug copied', showConfirmButton: false, timer: 1000 });
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Copy Slug"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">Update video metadata and sources</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px]"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in duration-500">
                    <div className="space-y-6">
                        {/* Main Content Info & Sidebar Content Merged */}

                        {/* Detailed Inputs */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Basic Info</h3>
                            </div>
                            <div className="p-6">
                                <VideoDetailsInputs control={control} errors={errors} />
                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="flex flex-row items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                                <div>
                                                    <span className="text-base font-semibold text-gray-900 dark:text-white">Active Status</span>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        Currently: <span className={field.value ? "text-green-600 font-bold" : "text-gray-500 font-bold"}>{field.value ? 'Published' : 'Draft/Hidden'}</span>
                                                    </p>
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

                        {/* Taxonomy Cluster */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                                <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Studios</h3>
                                <div className="flex-1">
                                    <StudioSelect control={control} />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
                                <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Cast / Pornstars</h3>
                                <div className="flex-1">
                                    <PornstarSelect control={control} errors={errors} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Categories</h3>
                            <CategoryDetails control={control} errors={errors} />
                        </div>

                        {/* Poster Fetch moved inline */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium">
                                Thumbnail
                            </div>
                            <div className="p-6">
                                <PosterFetch control={control} errors={errors} />
                            </div>
                        </div>
                    </div>
                    {/* Sources */}
                    <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 font-medium">
                            Video Source
                        </div>
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
