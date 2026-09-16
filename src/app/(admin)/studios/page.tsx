'use client';

import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import axios from "@/utils/axios";
import { Eye, Globe, Film, Search, Plus, Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import ToggleSwitch from "@/components/form/switch/Switch";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Swal from 'sweetalert2';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

interface Studio {
    studio_id: number;
    name: string;
    website: string | null;
    video_count: number;
    total_views: number;
    slug: string;
    is_active: number;
}

interface FetchStudiosResponse {
    data: Studio[];
    nextCursor: number | undefined;
    hasMore: boolean;
}

export default function StudiosPage() {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const queryClient = useQueryClient();
    const { ref, inView } = useInView();

    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isOpenEdit, openModal: openModalEdit, closeModal: closeModalEdit } = useModal();
    const [editData, setEditData] = useState<{ studio_id: number | null, name: string, website: string | null }>({ studio_id: null, name: '', website: null });

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Studios Function for Infinite Query
    const fetchStudios = async ({ pageParam = 1 }: { pageParam?: number }) => {
        // NOTE: Adjusted to match assumed API structure. 
        // If API does not support page/limit, customization is needed.
        const response = await axios.get('/studios', {
            params: {
                page: pageParam,
                limit: 20,
                search: debouncedSearch
            }
        });

        // Handling both possible API structures:
        // 1. { success: true, data: [...allData] } // If no pagination support yet
        // 2. { success: true, data: [...pageData], total_pages: X, current_page: Y } // If pagination supported

        let studiosData: Studio[] = [];
        let hasMore = false;

        if (response.data.success) {
            // Check if backend returns paginated structure
            if (response.data.data && Array.isArray(response.data.data)) {
                studiosData = response.data.data;
                // If API returns all data at once (no server pagination), manual slice? 
                // Assuming Backend supports pagination based on user request "api calling pagination wise".
                // If backend returns total_pages or similar:
                if (response.data.pagination) {
                    hasMore = pageParam < response.data.pagination.total_pages;
                } else {
                    // Fallback: if we got full list (limit=20), assume there might be more
                    hasMore = studiosData.length === 20;
                }
            }
        } else {
            throw new Error(response.data.message || "Failed to fetch");
        }

        return {
            data: studiosData,
            nextCursor: hasMore ? pageParam + 1 : undefined,
            hasMore
        };
    };

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['studios', debouncedSearch],
        queryFn: fetchStudios,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 1,
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);


    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (studioId: number) => {
            return axios.post(`/delete`, {
                id: studioId,
                type: 'studio'
            });
        },
        onSuccess: () => {
            Swal.fire(
                'Deleted!',
                'Studio has been deleted.',
                'success'
            );
            queryClient.invalidateQueries({ queryKey: ['studios'] });
        },
        onError: () => {
            Swal.fire('Error', 'Failed to delete studio', 'error');
        }
    });

    const handleDeleteStudio = async (studioId: number) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(studioId);
            }
        });
    };

    // Toggle Active Mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
            return axios.post(`/active-inactive`, {
                id,
                type: "studio",
                action: isActive
            });
        },
        onMutate: async ({ id, isActive }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['studios', debouncedSearch] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(['studios', debouncedSearch]);

            // Optimistically update to the new value
            queryClient.setQueryData(['studios', debouncedSearch], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((studio: Studio) =>
                            studio.studio_id === id ? { ...studio, is_active: isActive ? 1 : 0 } : studio
                        )
                    }))
                };
            });

            // Return a context object with the snapshotted value
            return { previousData };
        },
        onError: (err, newTodo, context: any) => {
            queryClient.setQueryData(['studios', debouncedSearch], context.previousData);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        },
        onSuccess: () => {
            // Optional: invalidate if you want strictly fresh data
            // queryClient.invalidateQueries({ queryKey: ['studios'] });
        },
    });

    const handleToggle = (studio_id: number, isActive: boolean) => {
        toggleMutation.mutate({ id: studio_id, isActive });
    };

    // Flatten data for display
    const studios = data?.pages.flatMap(page => page.data) || [];


    return (
        <div className="p-4 md:p-6">
            {isOpen && <AddStudioModal onClose={() => { closeModal(); queryClient.invalidateQueries({ queryKey: ['studios'] }); }} />}
            {isOpenEdit && <EditStudioModel {...editData} onClose={() => { closeModalEdit(); queryClient.invalidateQueries({ queryKey: ['studios'] }); }} />}

            {/* Page Breadcrumb */}
            <PageBreadcrumb pageTitle="Studios" />

            {/* Header with search and add button */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search studios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex items-center"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={status === 'pending' || isFetchingNextPage}
                    >
                        <RefreshCcw size={18} className={`mr-2 ${status === 'pending' ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                        size="sm"
                        onClick={openModal}
                    >
                        <Plus size={18} className="mr-2" />
                        Add New Studio
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {(error as Error).message}
                </div>
            )}

            {/* Loading indicator (Initial) */}
            {status === 'pending' ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                /* Studios grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {studios.length > 0 ? (
                        studios.map((studio, index) => ( // Use index as key fallback if duplicate IDs occur during pagination transitions
                            <div
                                key={`${studio.studio_id}-${index}`}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-100 text-center dark:bg-gray-800 dark:border-gray-700 group"
                            >
                                <div className="p-5 flex flex-col items-center">

                                    <h3 className="text-lg font-bold text-gray-800 mb-2 truncate w-full dark:text-white" title={studio.name}>{studio.name}</h3>

                                    <div className="flex items-center text-gray-500 text-sm mb-1 dark:text-gray-400">
                                        <span className="font-medium mr-1">{studio.video_count}</span> videos
                                    </div>

                                    <div className="flex items-center text-gray-500 text-sm mb-3 dark:text-gray-400">
                                        <Eye size={14} className="mr-1.5" />
                                        <span>{studio.total_views.toLocaleString()}</span>
                                    </div>

                                    <div className="flex items-center text-gray-500 text-sm mb-4 h-6 dark:text-gray-400">
                                        {studio.website ? (
                                            <a
                                                href={studio.website.startsWith('http') ? studio.website : `https://${studio.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline truncate max-w-[150px] flex items-center gap-1"
                                            >
                                                <Globe size={12} />
                                                {(() => {
                                                    try {
                                                        const url = studio.website.startsWith('http') ? studio.website : `https://${studio.website}`;
                                                        return new URL(url).hostname.replace('www.', '');
                                                    } catch {
                                                        return "Website";
                                                    }
                                                })()}
                                            </a>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600 flex items-center gap-1"><Globe size={12} /> No Website</span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center w-full pt-4 border-t border-gray-50 dark:border-gray-700 mt-auto">
                                        <div className="flex space-x-2">
                                            <button
                                                className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
                                                title="Edit"
                                                onClick={() => {
                                                    setEditData({ studio_id: studio.studio_id, name: studio.name, website: studio.website });
                                                    openModalEdit();
                                                }}
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteStudio(studio.studio_id)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <ToggleSwitch
                                            label=""
                                            checked={studio.is_active === 1}
                                            onChange={(checked) => handleToggle(studio.studio_id, checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 flex flex-col justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-700">
                            <div className="bg-gray-100 p-4 rounded-full mb-3 dark:bg-gray-700">
                                <Search className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No studios found</h3>
                            <p className="text-gray-500 text-sm mb-4 dark:text-gray-400">Try adjusting your search or add a new studio.</p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}

                    {/* Infinite Scroll Skeletons */}
                    {isFetchingNextPage && (
                        <>
                            {[...Array(5)].map((_, i) => (
                                <div key={`skeleton-${i}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center animate-pulse dark:bg-gray-800 dark:border-gray-700">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 mb-3 dark:bg-gray-700"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 dark:bg-gray-700"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4 dark:bg-gray-700"></div>
                                    <div className="w-full mt-auto h-8 bg-gray-100 rounded dark:bg-gray-700"></div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Intersection Observer Target */}
                    <div ref={ref} className="col-span-full h-10 w-full flex justify-center p-4">
                        {isFetchingNextPage ? null : hasNextPage ? (
                            <span className="text-sm text-gray-400">Scroll for more...</span>
                        ) : studios.length > 0 ? (
                            <span className="text-sm text-gray-400">No more studios</span>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );

    function AddStudioModal({ onClose }: { onClose: () => void }) {
        const [studioName, setStudioName] = useState('');
        const [websiteUrl, setWebsiteUrl] = useState<string>('');
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const response = await axios.post('/add-studio', {
                    name: studioName,
                    website: websiteUrl === '' ? null : websiteUrl
                });

                if (response.data.success) {
                    setStudioName('');
                    setWebsiteUrl('');
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Studio added successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to add studio',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to add studio',
                    icon: 'error'
                });
            } finally {
                setIsSubmitting(false);
            }
        };

        return (<Modal
            isOpen={true} // Controlled by parent
            onClose={onClose}
            className="max-w-[480px] p-6 rounded-2xl"
        >
            <form className="" onSubmit={handleSave}>
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        New Studio
                    </h4>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label>Studio Name</Label>
                        <Input type="text" placeholder="e.g. Brazzers" required={true} value={studioName} onChange={(e) => setStudioName(e.target.value)} />
                    </div>

                    <div>
                        <Label>Website URL <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span></Label>
                        <Input type="text" placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-8">
                    <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Studio'}
                    </Button>
                </div>
            </form>
        </Modal>)
    }

    function EditStudioModel({ studio_id, name, website, onClose }: { studio_id: number | null, name: string, website: string | null, onClose: () => void }) {
        const [studioName, setStudioName] = useState(name);
        const [websiteUrl, setWebsiteUrl] = useState<string>(website || '');
        const [isSubmitting, setIsSubmitting] = useState(false);

        // Update local state when value changes (if modal reopens with different data)
        useEffect(() => {
            setStudioName(name);
            setWebsiteUrl(website || '');
        }, [name, website]);

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const response = await axios.post('/edit-studio', {
                    studio_id: studio_id,
                    name: studioName,
                    website: websiteUrl === '' ? null : websiteUrl // Handling empty string as null
                });

                if (response.data.success) {
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Studio updated successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to update studio',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update studio',
                    icon: 'error'
                });
            } finally {
                setIsSubmitting(false);
            }
        };

        return (<Modal
            isOpen={true}
            onClose={onClose}
            className="max-w-[480px] p-6 rounded-2xl"
        >
            <form className="" onSubmit={handleSave}>
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        Edit Studio
                    </h4>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label>Studio Name</Label>
                        <Input type="text" defaultValue={name} placeholder="e.g. Brazzers" required={true} onChange={(e) => setStudioName(e.target.value)} />
                    </div>

                    <div>
                        <Label>Website URL</Label>
                        <Input type="text" defaultValue={website || ''} placeholder="https://example.com" onChange={(e) => setWebsiteUrl(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-8">
                    <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>)
    }
}
