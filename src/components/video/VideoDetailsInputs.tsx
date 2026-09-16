import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";

interface VideoDetailsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
}

const VideoDetails: React.FC<VideoDetailsProps> = ({ control, errors }) => {
  return (
    <div>
      <Label>Title</Label>
      <Controller
        name="title"
        control={control}
        rules={{ required: "Title is required" }}
        render={({ field }) => (
          <>
            <Input
              type="text"
              placeholder="Enter title"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
            {errors.title?.message && (
              <p className="text-red-500 text-sm mt-1">{String(errors.title.message)}</p>
            )}
          </>
        )}
      />

      <Label className="mt-3">Description</Label>
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <>
            <TextArea
              placeholder="Enter description"
              value={field.value || ""}
              onChange={(value) => field.onChange(value)}
            />
            {errors.description?.message && (
              <p className="text-red-500 text-sm mt-1">{String(errors.description.message)}</p>
            )}
          </>
        )}
      />

      <Controller
        name="datetime"
        control={control}
        rules={{ required: "Date and time are required" }}
        render={({ field }) => (
          <>
            <Label className="mt-3">Date and Time</Label>
            <Input
              type="datetime-local"
              placeholder="Select date and time"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
            {errors.datetime?.message && (
              <p className="text-red-500 text-sm mt-1">{String(errors.datetime.message)}</p>
            )}
          </>
        )}
      />

      <div>
        <Label className="mt-3">Duration</Label>
        <Controller
          name="duration"
          control={control}
          rules={{ required: "Duration is required" }}
          render={({ field }) => (
            <>
              <Input
                type="text"
                placeholder="00:00:00"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
              {errors.duration?.message && (
                <p className="text-red-500 text-sm mt-1">{String(errors.duration.message)}</p>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
};

export default VideoDetails;