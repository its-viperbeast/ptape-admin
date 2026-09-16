import React, { useEffect, useState } from "react";
import { Controller, Control } from "react-hook-form";
import Select from "react-select/creatable";
import axios from "@/utils/axios";

interface StudioSelectProps {
    control: Control<any>;
}

const StudioSelect: React.FC<StudioSelectProps> = ({ control }) => {

    const [isMounted, setIsMounted] = useState(false);
    const [studios, setStudios] = useState<{ value: string; label: string }[]>([]);

    // Fetch channels from API
    const fetchData = async () => {
        try {
            let response = await axios.get(`/studios`);
            if (response.data.success) {
                setStudios(response.data.data.map((studio: { name: string }) => ({ value: studio.name, label: studio.name })));
            } else {
                setStudios([]);
            }
        } catch (error) {
            setStudios([]);
        }
    };

    // Fetch studio when component mounts
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
                name="studios"
                control={control}
                render={({ field }) => (
                    <Select
                        instanceId={'studio-select'}
                        id="studio-select"
                        name="studios"
                        inputId="studio-select-input"
                        isMulti
                        options={studios}
                        value={field.value}
                        onChange={(selectedOptions) => {
                            field.onChange(selectedOptions || []);
                        }}
                    />
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

export default StudioSelect;
