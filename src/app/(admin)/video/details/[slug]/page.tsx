'use client';

import React, { useState, useEffect } from "react";
import axios from "@/utils/axios";
import { useRouter } from "next/navigation";
import {
    Video as VideoIcon,
    Eye,
    Clock,
    Folder,
    Link as LinkIcon,
    Server,
    Tags,
    Star,
    CheckCircle,
    XCircle,
    Calendar,
    ArrowLeft,
    MonitorPlay,
    Edit3,
    ExternalLink
} from 'lucide-react';
import { formatDuration, convertNumberToSuffix, timeAgo } from "@/utils/commonFunc";

export default function ViewVideoPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const router = useRouter();
    const [videoDetails, setVideoDetails] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeSource, setActiveSource] = useState<any>(null);

    useEffect(() => {
        params.then(({ slug }) => {
            axios.get(`/getvideo?slug=${slug}`)
                .then(res => {
                    if (res.data.success) {
                        setVideoDetails(res.data.data);
                        const sources = res.data.data.videoSources || [];
                        if (sources.length) {
                            setActiveSource(sources.find((s: any) => s.is_active) || sources[0]);
                        }
                    } else {
                        router.push('/video/list');
                    }
                })
                .catch(() => router.push('/video/list'))
                .finally(() => setLoading(false));
        });
    }, [params, router]);

    const handlePlay = (source?: any) => {
        if (source) setActiveSource(source);
        else if (!activeSource && videoDetails.videoSources?.length) {
            setActiveSource(videoDetails.videoSources[0]);
        }
        setIsPlaying(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <VideoIcon className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
                </div>
                <p className="mt-4 text-gray-500 animate-pulse">Loading video details...</p>
            </div>
        );
    }

    const { title, thumbnail, slug, is_active, video_id, upload_date, views, description, duration, videoSources = [], categories = [], pornstars = [], studios = [], external_id } = videoDetails;

    return (
        <div className="min-h-screen p-4 md:p-6 pb-20">
            <div className="mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                        onClick={() => router.push('/video/list')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to List</span>
                    </button>

                    <div className="flex gap-2">
                        <a
                            href={`https://porntape.net/video/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">View</span>
                        </a>
                        <button
                            onClick={() => router.push(`/video/edit/${slug}`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                        >
                            <Edit3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Video Player & Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Player */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {isPlaying && activeSource ? (
                                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                                    {activeSource.file_type === 'embed' || activeSource.url?.includes('iframe') ? (
                                        <iframe src={activeSource.url} className="w-full h-full" allowFullScreen />
                                    ) : (
                                        <video className="w-full h-full" controls autoPlay src={activeSource.url} poster={thumbnail} />
                                    )}
                                </div>
                            ) : (
                                <div className="relative aspect-video rounded-xl overflow-hidden bg-black group cursor-pointer" onClick={() => handlePlay()}>
                                    <img src={thumbnail} alt={title} className="w-full h-full object-cover opacity-90 group-hover:opacity-70 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <MonitorPlay className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    <span className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm">
                                        {formatDuration(duration)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Title & Meta */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {timeAgo(upload_date)}</span>
                                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {convertNumberToSuffix(views)} views</span>
                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(upload_date).toLocaleDateString()}</span>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">{description || "No description provided."}</p>
                            </div>
                        </div>

                        {/* Sources */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Server className="w-5 h-5 text-blue-600" />
                                Sources ({videoSources.length})
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {videoSources.length ? videoSources.map((source: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border ${activeSource?.id === source.id && isPlaying ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Server className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">{source.server_name || 'Server'}</span>
                                            </div>
                                            <span className={`w-2 h-2 rounded-full ${source.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                        </div>

                                        <div className="text-xs text-gray-500 mb-3 space-y-1">
                                            <div className="flex justify-between"><span>Quality</span><span className="text-gray-700 dark:text-gray-300">{source.quality || 'N/A'}</span></div>
                                            <div className="flex justify-between"><span>Size</span><span className="text-gray-700 dark:text-gray-300">{source.file_size ? `${source.file_size} MB` : 'N/A'}</span></div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePlay(source)}
                                                className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${activeSource?.id === source.id && isPlaying ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}`}
                                            >
                                                <MonitorPlay className="w-3 h-3" />
                                                {activeSource?.id === source.id && isPlaying ? 'Playing' : 'Play'}
                                            </button>
                                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600">
                                                <LinkIcon className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full p-6 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 text-sm">
                                        No sources available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4">

                        {/* Categories */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                                <Tags className="w-4 h-4 text-indigo-500" /> Categories
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {categories.length ? categories.map((cat: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">{cat}</span>
                                )) : <span className="text-gray-500 text-xs italic">No categories</span>}
                            </div>
                        </div>

                        {/* Cast */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                                <Star className="w-4 h-4 text-amber-500" /> Cast
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {pornstars.length ? pornstars.map((star: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300 rounded text-xs">{star}</span>
                                )) : <span className="text-gray-500 text-xs italic">No cast listed</span>}
                            </div>
                        </div>

                        {/* Studios */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                                <Folder className="w-4 h-4 text-emerald-500" /> Studios
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {studios.length ? studios.map((studio: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded text-xs">{studio}</span>
                                )) : <span className="text-gray-500 text-xs italic">No studio listed</span>}
                            </div>
                        </div>

                        {/* Technical */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Technical Details</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ID</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{video_id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">External ID</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{external_id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Slug</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{slug}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
