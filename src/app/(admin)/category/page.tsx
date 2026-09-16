'use client';

import React, { useState, useEffect } from 'react';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import axios from "@/utils/axios";
import { Search, Plus, Film, Pencil, Trash2, Loader2, RefreshCcw } from "lucide-react";
import ToggleSwitch from "@/components/form/switch/Switch";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Swal from 'sweetalert2';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

interface Category {
    category_id: number;
    name: string;
    video_count: number;
    slug: string;
    is_active: number;
}

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

export default function CategoryPage() {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const queryClient = useQueryClient();
    const { ref, inView } = useInView();

    const { isOpen, openModal, closeModal } = useModal();
    const { isOpen: isOpenEdit, openModal: openModalEdit, closeModal: closeModalEdit } = useModal();
    const [editData, setEditData] = useState<{ category_id: number | null, name: string }>({
        category_id: null,
        name: ''
    });

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Categories Function for Infinite Query
    const fetchCategories = async ({ pageParam = 1 }: { pageParam?: number }) => {
        const response = await axios.get('/categories', {
            params: {
                page: pageParam,
                limit: 20,
                search: debouncedSearch
            }
        });

        let categoriesData: Category[] = [];
        let hasMore = false;

        if (response.data.success) {
            if (response.data.data && Array.isArray(response.data.data)) {
                categoriesData = response.data.data;
                if (response.data.pagination) {
                    hasMore = pageParam < response.data.pagination.total_pages;
                } else {
                    hasMore = categoriesData.length === 20;
                }
            }
        } else {
            // throw new Error(response.data.message || "Failed to fetch");
            // Handle gracefully if API structure differs slightly, but typically we want to throw to let React Query handle error state
        }

        return {
            data: categoriesData,
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
        queryKey: ['categories', debouncedSearch],
        queryFn: fetchCategories,
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
        mutationFn: async (categoryId: number) => {
            return axios.post(`/delete`, {
                id: categoryId,
                type: 'category'
            });
        },
        onSuccess: () => {
            Swal.fire(
                'Deleted!',
                'Category has been deleted.',
                'success'
            );
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: () => {
            Swal.fire('Error', 'Failed to delete category', 'error');
        }
    });

    const handleDeleteCategory = async (categoryId: number) => {
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
                deleteMutation.mutate(categoryId);
            }
        });
    };

    // Toggle Active Mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
            return axios.post(`/active-inactive`, {
                id,
                type: "category",
                action: isActive
            });
        },
        onMutate: async ({ id, isActive }) => {
            await queryClient.cancelQueries({ queryKey: ['categories', debouncedSearch] });
            const previousData = queryClient.getQueryData(['categories', debouncedSearch]);

            queryClient.setQueryData(['categories', debouncedSearch], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((category: Category) =>
                            category.category_id === id ? { ...category, is_active: isActive ? 1 : 0 } : category
                        )
                    }))
                };
            });
            return { previousData };
        },
        onError: (err, newTodo, context: any) => {
            queryClient.setQueryData(['categories', debouncedSearch], context.previousData);
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

    const handleToggle = (category_id: number, isActive: boolean) => {
        toggleMutation.mutate({ id: category_id, isActive });
    };

    const categories = data?.pages.flatMap(page => page.data) || [];

    return (
        <div className="p-4 md:p-6">
            {isOpen && <AddCategoryModal onClose={() => { closeModal(); queryClient.invalidateQueries({ queryKey: ['categories'] }); }} />}
            {isOpenEdit && <EditCategoryModal
                category_id={editData.category_id}
                name={editData.name}
                onClose={() => { closeModalEdit(); queryClient.invalidateQueries({ queryKey: ['categories'] }); }}
            />}

            {/* Page Breadcrumb */}
            <PageBreadcrumb pageTitle="Categories" />

            {/* Header with search and add button */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Search categories..."
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
                        Add New Category
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {(error as Error)?.message || 'An error occurred'}
                </div>
            )}

            {/* Loading indicator (Initial) */}
            {status === 'pending' ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                /* Categories grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {categories.length > 0 ? (
                        categories.map((category, index) => (
                            <div
                                key={`${category.category_id}-${index}`}
                                className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                            >
                                {/* Active Status Bar */}
                                <div className={`absolute top-0 inset-x-0 h-1 transition-colors duration-300 ${category.is_active ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                <div className="p-6 flex flex-col items-center flex-grow">
                                    {/* Icon / Initial */}
                                    <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-md transform group-hover:rotate-6 transition-transform duration-300 ${getColorFromName(category.name)}`}>
                                        {category.name.charAt(0).toUpperCase()}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate w-full text-center" title={category.name}>
                                        {category.name}
                                    </h3>

                                    {/* Stats Badge */}
                                    <div className="mt-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                            <Film size={14} className="text-blue-500" />
                                            {category.video_count} <span className="text-gray-400 text-xs uppercase ml-0.5">Videos</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="group/btn p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-sm hover:border-blue-100 border border-transparent transition-all dark:hover:bg-gray-700 dark:hover:text-blue-400"
                                            title="Edit Category"
                                            onClick={() => {
                                                setEditData({
                                                    category_id: category.category_id,
                                                    name: category.name
                                                });
                                                openModalEdit();
                                            }}
                                        >
                                            <Pencil size={18} className="transition-transform group-hover/btn:scale-110" />
                                        </button>

                                        <button
                                            onClick={() => handleDeleteCategory(category.category_id)}
                                            className="group/btn p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-sm hover:border-red-100 border border-transparent transition-all dark:hover:bg-gray-700 dark:hover:text-red-400"
                                            title="Delete Category"
                                        >
                                            <Trash2 size={18} className="transition-transform group-hover/btn:scale-110" />
                                        </button>
                                    </div>
                                    <ToggleSwitch
                                        label=""
                                        checked={category.is_active === 1}
                                        onChange={(checked) => handleToggle(category.category_id, checked)}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 flex flex-col justify-center items-center bg-gray-50 rounded-xl border border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-700">
                            <div className="bg-gray-100 p-4 rounded-full mb-3 dark:bg-gray-700">
                                <Search className="text-gray-400" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No categories found</h3>
                            <p className="text-gray-500 text-sm mb-4 dark:text-gray-400">Try adjusting your search or add a new category.</p>
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
                                    <div className="w-16 h-16 rounded-2xl bg-gray-200 mb-4 dark:bg-gray-700"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 dark:bg-gray-700"></div>
                                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 dark:bg-gray-700"></div>
                                    <div className="w-full mt-auto h-8 bg-gray-100 rounded dark:bg-gray-700"></div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Intersection Observer Target */}
                    <div ref={ref} className="col-span-full h-10 w-full flex justify-center p-4">
                        {isFetchingNextPage ? null : hasNextPage ? (
                            <span className="text-sm text-gray-400">Scroll for more...</span>
                        ) : categories.length > 0 ? (
                            <span className="text-sm text-gray-400">No more categories</span>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );

    function AddCategoryModal({ onClose }: { onClose: () => void }) {
        const [categoryName, setCategoryName] = useState('');
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);

            try {
                const payload = {
                    name: categoryName
                };

                const response = await axios.post('/add-category', payload);

                if (response.data.success) {
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Category added successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to add category',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to add category',
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
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    New Category
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
                        <Label>Category Name</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Amateur"
                            required={true}
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end w-full gap-3 mt-8">
                    <Button size="sm" variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button size="sm" type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Create Category'}
                    </Button>
                </div>
            </form>
        </Modal>)
    }

    function EditCategoryModal({ category_id, name, onClose }: { category_id: number | null, name: string, onClose: () => void }) {
        const [categoryName, setCategoryName] = useState(name);
        const [isSubmitting, setIsSubmitting] = useState(false);

        useEffect(() => {
            setCategoryName(name);
        }, [name]);

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
                const payload = {
                    category_id: category_id,
                    name: categoryName
                };

                const response = await axios.post('/edit-category', payload);

                if (response.data.success) {
                    onClose();
                    Swal.fire({
                        title: 'Success',
                        text: 'Category updated successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to update category',
                        icon: 'error'
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update category',
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
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    Edit Category
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
                        <Label>Category Name</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Amateur"
                            defaultValue={name}
                            required={true}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
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