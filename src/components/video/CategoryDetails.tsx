import React, { useEffect, useState } from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import Select from "react-select/creatable";
import axios from "@/utils/axios";

interface CategoryDetailsProps {
    control: Control<any>;
    errors: FieldErrors<any>;
}

const CategoryDetails: React.FC<CategoryDetailsProps> = ({
    control,
    errors,
}) => {

    const [isMounted, setIsMounted] = useState(false);
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

    // Fetch categories from API
    const fetchData = async () => {
        try {
            let response = await axios.get(`/categories`);
            if (response.data.success) {
                setCategories(
                    response.data.data
                        .map((category: { name: string }) => ({ value: category.name, label: category.name }))
                );
            } else {
                setCategories([]);
            }
        } catch (error) {
            setCategories([]);
        }
    };

    // Fetch categories when component mounts
    useEffect(() => {
        setIsMounted(true);
        fetchData();
    }, []);

    if (!isMounted) {
        return <div className="h-[38px] bg-gray-100 rounded animate-pulse" />;
    }

    return (
        <div>
            <Controller
                name="categories"
                control={control}
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                    <>
                        <Select
                            isMulti
                            instanceId={'categories-select'}
                            id="categories-select"
                            name="categories"
                            inputId="categories-select-input"
                            options={categories}
                            value={field.value}
                            onChange={(selectedOptions) => {
                                field.onChange(selectedOptions || []);
                            }}
                        />
                        {errors.categories?.message && (
                            <p className="text-red-500 text-sm mt-1">
                                {String(errors.categories.message)}
                            </p>
                        )}
                    </>
                )
                }
            />
            <button
                type="button"
                onClick={fetchData}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
                Reload
            </button>
        </div>
    );
};

export default CategoryDetails;
