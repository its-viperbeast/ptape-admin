import React, { useEffect, useState } from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import Select from "react-select/creatable";
import axios from "@/utils/axios";

interface PornstarDetailsProps {
    control: Control<any>;
    errors: FieldErrors<any>;
}

const PornstarDetails: React.FC<PornstarDetailsProps> = ({ control, errors }) => {

    const [isMounted, setIsMounted] = useState(false);
    const [pornstars, setPornstars] = useState<{ value: string; label: string }[]>([]);

    // Fetch pstar from API
    const fetchData = async () => {
        try {
            let response = await axios.get(`/pornstars`);
            if (response.data.success) {
                setPornstars(response.data.data.map((studio: { name: string }) => ({ value: studio.name, label: studio.name })));
            } else {
                setPornstars([]);
            }
        } catch (error) {
            setPornstars([]);
        }
    };

    // Fetch pstar when component mounts
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
                name="pornstars"
                control={control}
                rules={{ required: "Pornstars is required" }}
                render={({ field }) => (
                    <>
                        <Select
                            instanceId={'pornstar-select'}
                            id="pornstar-select"
                            name="pornstars"
                            inputId="pornstar-select-input"
                            isMulti
                            options={pornstars}
                            value={field.value}
                            onChange={(selectedOptions) => {
                                field.onChange(selectedOptions || []);
                            }}
                        />
                        {errors.pornstars?.message && (
                            <p className="text-red-500 text-sm mt-1">{String(errors.pornstars.message)}</p>
                        )}
                    </>
                )}
            />
            <button
                type="button"
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
                Reload
            </button>
        </div>
    );
};

export default PornstarDetails;
