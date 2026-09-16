'use client';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ToggleSwitch from "@/components/form/switch/Switch";
import React, { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/badge/Badge";
import { redirect } from "next/navigation";
import { formatDuration, convertNumberToSuffix, timeAgo } from "@/utils/commonFunc";
import {
  Pencil, Trash, Eye, Clock, Plus, Flag, FlagOff,
  CheckSquare, Square, Loader2, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search
} from 'lucide-react';
import axios from "@/utils/axios";
import Swal from 'sweetalert2';

interface Video {
  video_id: number;
  title: string;
  thumbnail: string;
  slug: string;
  duration: string;
  views: number;
  upload_date: string;
  studios: string[];
  pstars: string[];
  is_active: number;
  is_dmca: number;
}

export default function VideoListPage() {
  const [videoList, setVideoList] = useState<Video[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedPage = localStorage.getItem("currentPage");
    if (savedPage) setCurrentPage(Number(savedPage));
    setIsInitialized(true);
  }, []);

  const fetchVideos = useCallback(async (page = 1, query = "") => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const searchParam = query ? `&search=${encodeURIComponent(query)}` : "";
      const response = await axios.get(`/videos?page=${page}${searchParam}`);

      if (response.data.success && response.data.message !== "No data") {
        setVideoList(response.data.data.videos || []);
        setTotalPages(response.data.data.pagination.totalPages || 1);
        localStorage.setItem("currentPage", response.data.data.pagination.currentPage.toString());
        setCurrentPage(response.data.data.pagination.currentPage || 1);
      } else {
        setVideoList([]);
        setTotalPages(1);
      }
    } catch {
      setVideoList([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch !== "") setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isInitialized) return;
    fetchVideos(currentPage, debouncedSearch);
    setSelectedVideos([]);
  }, [currentPage, debouncedSearch, isInitialized]);

  const toggleSelectVideo = (videoId: number) => {
    setSelectedVideos(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedVideos(selectedVideos.length === videoList.length ? [] : videoList.map(v => v.video_id));
  };

  const handleBulkDelete = async () => {
    if (selectedVideos.length === 0) return;
    const result = await Swal.fire({
      title: `Delete ${selectedVideos.length} videos?`,
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        await Promise.all(selectedVideos.map(id => axios.post(`/delete`, { id, type: "video" })));
        setVideoList(prev => prev.filter(video => !selectedVideos.includes(video.video_id)));
        setSelectedVideos([]);
        Swal.fire('Deleted!', `${selectedVideos.length} videos have been deleted.`, 'success');
      } catch {
        Swal.fire('Error', 'Some videos could not be deleted.', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDelete = async (video_id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      await axios.post(`/delete`, { id: video_id, type: "video" });
      setVideoList(prev => prev.filter(video => video.video_id !== video_id));
      Swal.fire('Deleted!', 'Your video has been deleted.', 'success');
    }
  };

  const handleDmca = async (video_id: number, isDmca: number) => {
    const newDmcaStatus = isDmca === 1 ? 0 : 1;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: newDmcaStatus === 1 ? "This will mark the video as DMCA takedown!" : "This will remove the DMCA flag!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: newDmcaStatus === 1 ? 'Mark DMCA' : 'Remove DMCA'
    });

    if (result.isConfirmed) {
      await axios.post(`/video-dmca`, { video_id, action: newDmcaStatus === 1 ? "remove" : "restore" });
      setVideoList(prev => prev.map(video =>
        video.video_id === video_id ? { ...video, is_dmca: newDmcaStatus } : video
      ));
      Swal.fire('Success!', newDmcaStatus === 1 ? 'Video marked as DMCA.' : 'DMCA removed from video.', 'success');
    }
  };

  const handleToggle = async (video_id: number, isActive: boolean) => {
    try {
      await axios.post(`/active-inactive`, { id: video_id, type: "video", action: isActive });
      setVideoList(prev => prev.map(video =>
        video.video_id === video_id ? { ...video, is_active: isActive ? 1 : 0 } : video
      ));
    } catch { /* silently fail */ }
  };

  const handlePageChange = (newPage: number) => {
    if (!isLoading && newPage > 0 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range: number[] = [1];
    const rangeWithDots: (number | string)[] = [];

    if (totalPages <= 1) return [1];

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) range.push(i);
    }
    range.push(totalPages);

    let last = 0;
    for (const i of range) {
      if (last) {
        if (i - last === 2) rangeWithDots.push(last + 1);
        else if (i - last !== 1) rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      last = i;
    }
    return rangeWithDots;
  };

  const ActionButton = ({ onClick, title, icon: Icon, hoverColor }: { onClick: (e: React.MouseEvent) => void; title: string; icon: React.ElementType; hoverColor: string }) => (
    <button
      onClick={onClick}
      className={`p-1.5 sm:p-2 rounded-full text-gray-500 ${hoverColor} transition-colors`}
      title={title}
    >
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    </button>
  );

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 dark:bg-gray-900">
      <PageBreadcrumb pageTitle="Video Management" />

      {/* Batch Action Bar */}
      <div className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${selectedVideos.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-gray-200 dark:border-gray-700 flex items-center gap-3 sm:gap-6">
          <span className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap">
            {selectedVideos.length} selected
          </span>
          <div className="h-5 sm:h-6 w-px bg-gray-300 dark:bg-gray-600" />
          <button onClick={() => setSelectedVideos([])} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 font-medium">
            Cancel
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium disabled:opacity-70"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
            <span className="hidden sm:inline">Delete Selected</span>
            <span className="sm:hidden">Delete</span>
          </button>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-10 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200 text-sm sm:text-base"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => redirect("/video/add")}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Video</span>
          </button>
          {videoList.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${selectedVideos.length === videoList.length
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
            >
              {selectedVideos.length === videoList.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span className="hidden sm:inline">{selectedVideos.length === videoList.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {videoList.map((video) => (
          <div
            key={video.video_id}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('button, .clickable-area')) {
                toggleSelectVideo(video.video_id);
              }
            }}
            className={`relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border cursor-pointer group ${selectedVideos.includes(video.video_id)
                ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-20">
              <div
                onClick={(e) => { e.stopPropagation(); toggleSelectVideo(video.video_id); }}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border flex items-center justify-center shadow-sm ${selectedVideos.includes(video.video_id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white/90 border-gray-300 text-transparent dark:bg-gray-800/90'
                  }`}
              >
                <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            </div>

            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
              <img
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={video.thumbnail}
                alt={video.title}
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/80 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium">
                {formatDuration(video.duration)}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 clickable-area">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 mb-2 leading-tight" title={video.title}>
                {video.title}
              </h3>

              <div className="flex items-center text-[10px] text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 gap-1.5">
                <span className="flex items-center gap-0.5 text-sm"><Eye className="w-4 h-4" /> {convertNumberToSuffix(video.views)}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-sm"><Clock className="w-4 h-4" /> {timeAgo(video.upload_date)}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2 h-5 sm:h-6">
                {video.studios.slice(0, 2).map((studio, i) => (
                  <Badge key={i} variant="solid" color="primary" className="text-[8px] px-1 sm:px-1.5 py-0.5">{studio}</Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-1 mb-3 sm:mb-4 h-5 sm:h-6">
                {video.pstars?.slice(0, 2).map((pstar, i) => (
                  <Badge key={i} variant="solid" color="dark" className="text-[8px] px-1 sm:px-1.5 py-0.5">{pstar}</Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center -space-x-0.5">
                  <ActionButton onClick={(e) => { e.stopPropagation(); redirect(`/video/details/${video.slug}`); }} title="View" icon={Eye} hoverColor="hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700" />
                  <ActionButton onClick={(e) => { e.stopPropagation(); redirect(`/video/edit/${video.slug}`); }} title="Edit" icon={Pencil} hoverColor="hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-gray-700" />
                  <ActionButton onClick={(e) => { e.stopPropagation(); handleDelete(video.video_id); }} title="Delete" icon={Trash} hoverColor="hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDmca(video.video_id, video.is_dmca); }}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${video.is_dmca ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700'}`}
                    title={video.is_dmca ? "Remove DMCA" : "Mark DMCA"}
                  >
                    {video.is_dmca ? <FlagOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <ToggleSwitch label="" size="sm" checked={video.is_active === 1} onChange={(checked) => handleToggle(video.video_id, checked)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading && videoList.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
              <div className="p-3 sm:p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="flex gap-2 mb-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                </div>
                <div className="flex gap-1 mb-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-14" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full" />)}
                  </div>
                  <div className="h-5 w-9 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {videoList.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 mt-4 sm:mt-6">
          <div className="bg-white dark:bg-gray-700 p-3 sm:p-4 rounded-full shadow-sm mb-3 sm:mb-4">
            <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium text-base sm:text-lg">No videos found</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">Try adjusting your search</p>
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="mt-3 sm:mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {videoList.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center justify-center mt-6 sm:mt-10 gap-3 sm:gap-4">
          {/* Mobile Pagination */}
          <div className="md:hidden flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
            <button disabled={currentPage === 1 || isLoading} onClick={() => handlePageChange(currentPage - 1)} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 text-sm font-medium text-gray-900 dark:text-white">{currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages || isLoading} onClick={() => handlePageChange(currentPage + 1)} className="p-2 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden md:flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 gap-1">
            <button disabled={currentPage === 1 || isLoading} onClick={() => handlePageChange(1)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-30" title="First">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button disabled={currentPage === 1 || isLoading} onClick={() => handlePageChange(currentPage - 1)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-30 mr-2" title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {getPaginationRange().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-2 text-gray-400 text-sm">...</span>
                  ) : (
                    <button
                      disabled={isLoading}
                      onClick={() => handlePageChange(page as number)}
                      className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium disabled:opacity-50 ${currentPage === page
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>

            <button disabled={currentPage === totalPages || isLoading} onClick={() => handlePageChange(currentPage + 1)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-30 ml-2" title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button disabled={currentPage === totalPages || isLoading} onClick={() => handlePageChange(totalPages)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-30" title="Last">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-gray-400 font-medium">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
