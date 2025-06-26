import { useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "./button";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onFileRemove?: () => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  selectedFile,
  onFileRemove,
  accept = "video/*,audio/*",
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB
  className = ""
}: FileUploadProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        alert(`File size must be less than ${maxSize / (1024 * 1024 * 1024)}GB`);
      }
    }
  }, [onFileSelect, maxSize]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        alert(`File size must be less than ${maxSize / (1024 * 1024 * 1024)}GB`);
      }
    }
  }, [onFileSelect, maxSize]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {!selectedFile ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">ファイルをドラッグ&ドロップ</p>
          <p className="text-sm text-gray-500 mb-4">
            または<span className="text-blue-600"> クリックして選択</span>
          </p>
          <p className="text-xs text-gray-400">対応形式: MP4, MOV, AVI, MP3, WAV, M4A (最大2GB)</p>
          <input
            id="file-input"
            type="file"
            accept="video/*,audio/*,.mp4,.avi,.mov,.wmv,.mp3,.wav,.m4a,.aac,audio/mpeg,audio/mp3"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
          <Upload className="text-blue-600 mr-3 h-5 w-5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          {onFileRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}