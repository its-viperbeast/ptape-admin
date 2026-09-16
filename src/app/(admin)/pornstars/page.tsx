'use client';

import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import axios from "@/utils/axios";
import { Eye, Globe, Film, Search, Plus, Pencil, Trash2, Check, X, Loader2, RefreshCcw } from "lucide-react";
import ToggleSwitch from "@/components/form/switch/Switch";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Swal from 'sweetalert2';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

interface Pornstar {
    pstar_id: number;
    name: string;
    social_links: string | null;
    video_count: number;
    total_views: number;
    slug: string;
    is_active: number;
    profile_pic: string | null;
}

// Generate initials for profile picture placeholder
const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Generate a color based on name
const getColorFromName = (name: string) => {
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function PornstarPage() {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const queryClient = useQueryClient();
    const { ref, inView } = useInView();

    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isOpenEdit, openModal: openModalEdit, closeModal: closeModalEdit } = useModal();

    // Explicitly typing editData state to match component props
    const [editData, setEditData] = useState<{
        pstar_id: number | null,
        name: string,
        social_links: string | Array<{ name: string, link: string }> | null,
        profile_pic: string | null
    }>({
        pstar_id: null,
        name: '',
        social_links: null,
        profile_pic: null
    });

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Pornstars Function for Infinite Query
    const fetchPornstars = async ({ pageParam = 1 }: { pageParam?: number }) => {
        const response = await axios.get('/pornstars', {
            params: {
                page: pageParam,
                limit: 20,
                search: debouncedSearch
            }
        });

        let pornstarsData: Pornstar[] = [];
        let hasMore = false;

        if (response.data.success) {
            if (response.data.data && Array.isArray(response.data.data)) {
                pornstarsData = response.data.data;
                if (response.data.pagination) {
                    hasMore = pageParam < response.data.pagination.total_pages;
                } else {
                    hasMore = pornstarsData.length === 20;
                }
            }
        } else {
            throw new Error(response.data.message || "Failed to fetch");
        }

        return {
            data: pornstarsData,
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
        queryKey: ['pornstars', debouncedSearch],
        queryFn: fetchPornstars,
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
        mutationFn: async (pstarId: number) => {
            return axios.post(`/delete`, {
                id: pstarId,
                type: 'pornstar'
            });
        },
        onSuccess: () => {
            Swal.fire(
                'Deleted!',
                'Pornstar has been deleted.',
                'success'
            );
            queryClient.invalidateQueries({ queryKey: ['pornstars'] });
        },
        onError: () => {
            Swal.fire('Error', 'Failed to delete pornstar', 'error');
        }
    });

    const handleDeletePornstar = async (pstarId: number) => {
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
                deleteMutation.mutate(pstarId);
            }
        });
    };

    // Toggle Active Mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
            return axios.post(`/active-inactive`, {
                id,
                type: "pornstar",
                action: isActive
            });
        },
        onMutate: async ({ id, isActive }) => {
            await queryClient.cancelQueries({ queryKey: ['pornstars', debouncedSearch] });
            const previousData = queryClient.getQueryData(['pornstars', debouncedSearch]);
            queryClient.setQueryData(['pornstars', debouncedSearch], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((pornstar: Pornstar) =>
                            pornstar.pstar_id === id ? { ...pornstar, is_active: isActive ? 1 : 0 } : pornstar
                        )
                    }))
                };
            });
            return { previousData };
        },
        onError: (err, newTodo, context: any) => {
            queryClient.setQueryData(['pornstars', debouncedSearch], context.previousData);
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
    });

    const handleToggle = (pstar_id: number, isActive: boolean) => {
        toggleMutation.mutate({ id: pstar_id, isActive });
    };

    // Flatten data for display
    const pornstars = data?.pages.flatMap(page => page.data) || [];

    return (
        <div className="p-4 md:p-6">
            {isOpen && <AddPornstarModal onClose={() => { closeModal(); queryClient.invalidateQueries({ queryKey: ['pornstars'] }); }} />}
            {isOpenEdit && <EditPornstarModel
                pstar_id={editData.pstar_id}
                name={editData.name}
                social_links={editData.social_links}
                profile_pic={editData.profile_pic}
                onClose={() => { closeModalEdit(); queryClient.invalidateQueries({ queryKey: ['pornstars'] }); }}
            />}

            {/* Page Breadcrumb */}
            <PageBreadcrumb pageTitle="Pornstars" />

            {/* Header with search and add button */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search pornstars..."
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
                    <Button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg" size="sm" onClick={openModal}>
                        <Plus size={18} className="mr-2" />
                        Add New Pornstar
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
                /* Pornstars grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {pornstars.length > 0 ? (
                        pornstars.map((pornstar, index) => (
                            <div
                                key={`${pornstar.pstar_id}-${index}`}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                            >
                                {/* Active Status Indicator (Optional visual cue at top) */}
                                <div className={`absolute top-0 inset-x-0 h-1 transition-colors duration-300 ${pornstar.is_active ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                <div className="p-6 flex flex-col items-center flex-grow">
                                    {/* Profile Image */}
                                    <div className="relative mb-4">
                                        <div className="w-24 h-24 rounded-full p-1 bg-white dark:bg-gray-800 ring-1 ring-gray-100 dark:ring-gray-700 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                            {pornstar.profile_pic ? (
                                                <img
                                                    src={pornstar.profile_pic}
                                                    alt={pornstar.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                    referrerPolicy='no-referrer'
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pornstar.name)}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <div className={`w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white ${getColorFromName(pornstar.name)}`}>
                                                    {getInitials(pornstar.name)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Name & Title */}
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate w-full text-center" title={pornstar.name}>
                                        {pornstar.name}
                                    </h3>

                                    {/* Social Badge */}
                                    <div className="mb-4 h-6 flex items-center justify-center">
                                        {pornstar.social_links ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30">
                                                <Check size={10} strokeWidth={3} /> Verified Socials
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                                                No Socials
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2 w-full mb-4">
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Videos</span>
                                            <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
                                                <Film size={14} className="text-blue-500" />
                                                {pornstar.video_count}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Views</span>
                                            <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
                                                <Eye size={14} className="text-indigo-500" />
                                                {new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(pornstar.total_views)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons Footer */}
                                <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="group/btn p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-sm hover:border-blue-100 border border-transparent transition-all dark:hover:bg-gray-700 dark:hover:text-blue-400"
                                            title="Edit Pornstar"
                                            onClick={() => {
                                                setEditData({
                                                    pstar_id: pornstar.pstar_id,
                                                    name: pornstar.name,
                                                    social_links: pornstar.social_links,
                                                    profile_pic: pornstar.profile_pic
                                                });
                                                openModalEdit();
                                            }}
                                        >
                                            <Pencil size={18} className="transition-transform group-hover/btn:scale-110" />
                                        </button>

                                        <button
                                            onClick={() => handleDeletePornstar(pornstar.pstar_id)}
                                            className="group/btn p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm hover:border-red-100 border border-transparent transition-all dark:hover:bg-gray-700 dark:hover:text-red-400"
                                            title="Delete Pornstar"
                                        >
                                            <Trash2 size={18} className="transition-transform group-hover/btn:scale-110" />
                                        </button>
                                    </div>

                                    <div className="flex items-center">
                                        <ToggleSwitch
                                            label=""
                                            checked={pornstar.is_active === 1}
                                            onChange={(checked) => handleToggle(pornstar.pstar_id, checked)}
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
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No pornstars found</h3>
                            <p className="text-gray-500 text-sm mb-4 dark:text-gray-400">Try adjusting your search or add a new pornstar.</p>
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
                                    <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 dark:bg-gray-700"></div>
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
                        ) : pornstars.length > 0 ? (
                            <span className="text-sm text-gray-400">No more pornstars</span>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );

    function AddPornstarModal({ onClose }: { onClose: () => void }) {
        const [pornstarName, setPornstarName] = useState('');
        const [socialLinks, setSocialLinks] = useState<Array<{ name: string, link: string }>>([{ name: '', link: '' }]);
        const [profilePicUrl, setProfilePicUrl] = useState<string>('');
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const url = e.target.value;
            setProfilePicUrl(url);
            setPreviewUrl(url);
        };

        const handleSocialLinkChange = (index: number, field: 'name' | 'link', value: string) => {
            const updatedLinks = [...socialLinks];
            updatedLinks[index][field] = value;
            setSocialLinks(updatedLinks);
        };

        const addSocialLink = () => {
            setSocialLinks([...socialLinks, { name: '', link: '' }]);
        };

        const removeSocialLink = (index: number) => {
            if (socialLinks.length > 1) {
                const updatedLinks = [...socialLinks];
                updatedLinks.splice(index, 1);
                setSocialLinks(updatedLinks);
            }
        };

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const validSocialLinks = socialLinks.filter(link => link.name.trim() !== '' && link.link.trim() !== '');

                const payload = {
                    name: pornstarName,
                    profile_pic: profilePicUrl,
                    social_links: validSocialLinks
                };

                const response = await axios.post('/add-pornstar', payload);

                if (response.data.success) {
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Pornstar added successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to add pornstar',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to add pornstar',
                    icon: 'error'
                });
            } finally {
                setIsSubmitting(false);
            }
        };

        return (<Modal
            isOpen={true} // Controlled by parent
            onClose={onClose}
            className="max-w-[584px] p-6 rounded-2xl"
        >
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    New Pornstar
                </h4>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form className="" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div className="col-span-1 sm:col-span-2">
                        <Label>Pornstar Name</Label>
                        <Input type="text" placeholder="e.g. Riley Reid" required={true} value={pornstarName} onChange={(e: any) => setPornstarName(e.target.value)} />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                        <Label>Profile Picture URL</Label>
                        <Input
                            type="text"
                            placeholder="https://example.com/images/profile.jpg"
                            value={profilePicUrl}
                            onChange={handleProfilePicChange}
                        />
                        {previewUrl && (
                            <div className="mt-3">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                        <Label>Social Media Links</Label>
                        <div className="space-y-2 mt-1">
                            {socialLinks.map((link, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Platform (e.g. X)"
                                        value={link.name}
                                        onChange={(e) => handleSocialLinkChange(index, 'name', e.target.value)}
                                        className="w-1/3 text-sm rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="URL"
                                        value={link.link}
                                        onChange={(e) => handleSocialLinkChange(index, 'link', e.target.value)}
                                        className="flex-1 text-sm rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSocialLink(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addSocialLink}
                            className="mt-3 text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
                        >
                            <Plus size={16} />
                            Add Another Link
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-8">
                    <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Pornstar'}
                    </Button>
                </div>
            </form>
        </Modal>)
    }

    function EditPornstarModel({ pstar_id, name, social_links, profile_pic, onClose }: {
        pstar_id: number | null,
        name: string,
        social_links: string | Array<{ name: string, link: string }> | null,
        profile_pic: string | null,
        onClose: () => void
    }) {
        const [pornstarName, setPornstarName] = useState(name);
        const [socialLinks, setSocialLinks] = useState<Array<{ name: string, link: string }>>([{ name: '', link: '' }]);
        const [profilePicUrl, setProfilePicUrl] = useState<string>(profile_pic || '');
        const [previewUrl, setPreviewUrl] = useState<string | null>(profile_pic || null);
        const [isSubmitting, setIsSubmitting] = useState(false);

        // Update local state when value changes
        useEffect(() => {
            setPornstarName(name);
            setProfilePicUrl(profile_pic || '');
            setPreviewUrl(profile_pic || null);
        }, [name, profile_pic]);

        // Parse social links
        useEffect(() => {
            if (social_links) {
                try {
                    if (Array.isArray(social_links) && social_links.length > 0) {
                        setSocialLinks(social_links);
                    } else if (typeof social_links === 'string') {
                        const parsedLinks = JSON.parse(social_links);
                        if (Array.isArray(parsedLinks) && parsedLinks.length > 0) {
                            setSocialLinks(parsedLinks);
                        } else {
                            setSocialLinks([{ name: '', link: '' }]);
                        }
                    } else {
                        setSocialLinks([{ name: '', link: '' }]);
                    }
                } catch (error) {
                    setSocialLinks([{ name: '', link: '' }]);
                }
            } else {
                setSocialLinks([{ name: '', link: '' }]);
            }
        }, [social_links]);

        const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const url = e.target.value;
            setProfilePicUrl(url);
            setPreviewUrl(url);
        };

        const handleSocialLinkChange = (index: number, field: 'name' | 'link', value: string) => {
            const updatedLinks = [...socialLinks];
            updatedLinks[index][field] = value;
            setSocialLinks(updatedLinks);
        };

        const addSocialLink = () => {
            setSocialLinks([...socialLinks, { name: '', link: '' }]);
        };

        const removeSocialLink = (index: number) => {
            if (socialLinks.length > 1) {
                const updatedLinks = [...socialLinks];
                updatedLinks.splice(index, 1);
                setSocialLinks(updatedLinks);
            }
        };

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const validSocialLinks = socialLinks.filter(link => link.name.trim() !== '' && link.link.trim() !== '');

                const payload = {
                    pornstar_id: pstar_id,
                    name: pornstarName,
                    profile_pic: profilePicUrl === '' ? null : profilePicUrl,
                    social_links: validSocialLinks
                };

                const response = await axios.post('/edit-pornstar', payload);

                if (response.data.success) {
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Pornstar updated successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to update pornstar',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update pornstar',
                    icon: 'error'
                });
            } finally {
                setIsSubmitting(false);
            }
        };

        return (<Modal
            isOpen={true}
            onClose={onClose}
            className="max-w-[584px] p-6 rounded-2xl"
        >
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    Edit Pornstar
                </h4>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form className="" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <div className="col-span-1 sm:col-span-2">
                        <Label>Pornstar Name</Label>
                        <Input type="text" defaultValue={name} placeholder="Name" required={true} onChange={(e: any) => setPornstarName(e.target.value)} />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                        <Label>Profile Picture URL</Label>
                        <Input
                            type="text"
                            placeholder="https://example.com/images/profile.jpg"
                            defaultValue={profilePicUrl}
                            onChange={handleProfilePicChange}
                        />
                        {previewUrl && (
                            <div className="mt-3">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                        <Label>Social Media Links</Label>
                        <div className="space-y-2 mt-1">
                            {socialLinks.map((link, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Platform (e.g. X)"
                                        value={link.name}
                                        onChange={(e) => handleSocialLinkChange(index, 'name', e.target.value)}
                                        className="w-1/3 text-sm rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="URL"
                                        value={link.link}
                                        onChange={(e) => handleSocialLinkChange(index, 'link', e.target.value)}
                                        className="flex-1 text-sm rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeSocialLink(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addSocialLink}
                            className="mt-3 text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
                        >
                            <Plus size={16} />
                            Add Another Link
                        </button>
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