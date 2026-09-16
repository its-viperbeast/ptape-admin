import React, { useEffect } from "react";
import { useController, Control } from "react-hook-form";

interface VideoSource {
  id: string;
  file_size: number | null;
  file_type: string;
  quality: string;
  url: string;
}

interface VideoSourceManagerProps {
  control: Control<any>;
  name: string;
  defaultSources?: { id: string; file_size: number | null; file_type: string; quality: string; url: string }[];
}

const emptySource = (): VideoSource => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
  file_size: null,
  file_type: 'mp4',
  quality: '720p',
  url: '',
});

const VideoSourceManager: React.FC<VideoSourceManagerProps> = ({ control, name, defaultSources = [] }) => {
  const {
    field: { value: sources = [], onChange }
  } = useController({
    name,
    control,
    defaultValue: defaultSources.length
      ? [{
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          file_size: defaultSources[0].file_size || null,
          file_type: defaultSources[0].file_type || 'mp4',
          quality: defaultSources[0].quality || '720p',
          url: defaultSources[0].url,
        }]
      : [emptySource()]
  });

  useEffect(() => {
    if (!Array.isArray(sources) || sources.length === 0) {
      onChange([emptySource()]);
    } else if (sources.length > 1) {
      onChange([sources[0]]);
    }
  }, [sources, onChange]);

  const source: VideoSource = sources[0] || emptySource();

  const handleInputChange = (field: keyof VideoSource, value: any) => {
    onChange([{ ...source, [field]: value }]);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded shadow">
      <input
        type="number"
        id="file-size-input"
        name="file-size-input"
        value={source.file_size || ''}
        onChange={(e) => handleInputChange("file_size", e.target.value ? parseFloat(e.target.value) : null)}
        placeholder="File Size (MB)"
        className="w-full sm:w-[150px] border rounded p-2"
      />
      <select
        id="file-type-select"
        name="file-type-select"
        value={source.file_type}
        onChange={(e) => handleInputChange("file_type", e.target.value)}
        className="w-full sm:w-[150px] border rounded p-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="mp4">MP4</option>
        <option value="hls">HLS</option>
      </select>
      <select
        id="quality-select"
        name="quality-select"
        value={source.quality || "720p"}
        onChange={(e) => handleInputChange("quality", e.target.value)}
        className="w-full sm:w-[150px] border rounded p-2 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="" disabled>Select Quality</option>
        <option value="480p">480p</option>
        <option value="720p">720p</option>
        <option value="1080p">1080p</option>
      </select>
      <input
        type="text"
        id="url-input"
        name="url-input"
        value={source.url}
        onChange={(e) => handleInputChange("url", e.target.value)}
        placeholder="Video Source URL"
        className="flex-1 border rounded p-2"
      />
    </div>
  );
};

export default VideoSourceManager;
