import { useState, useRef } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

interface UploadInterfaceProps {
  onUploadSuccess: (sessionId: string, files: Array<{ filename: string; entries: number }>) => void;
  onProcessStart: () => void;
}

export function UploadInterface({ onUploadSuccess, onProcessStart }: UploadInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Validate all files
      const validFiles = Array.from(files).filter((file: File) =>
        file.name.includes('FEC') || file.name.endsWith('.txt') || file.name.endsWith('.csv')
      );

      if (validFiles.length === 0) {
        setError('Please select FEC files (.txt or .csv)');
        return;
      }

      if (validFiles.length === 1) {
        setSelectedFile(validFiles[0]);
      } else {
        setSelectedFile(validFiles);
      }
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // For multi-file: convert to array, for single: use first
      if (files.length === 1) {
        setSelectedFile(files[0]);
      } else {
        // Store multiple files - we'll handle this as an array
        // For now, store as a special property
        const fileArray = Array.from(files);
        setSelectedFile(fileArray as any);
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Handle both single file and multiple files
      if (Array.isArray(selectedFile)) {
        selectedFile.forEach((file: File) => {
          formData.append('files', file);
        });
      } else {
        formData.append('files', selectedFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      onUploadSuccess(data.session_id, data.files);
      setSelectedFile(null);
      onProcessStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wincap</h1>
          <p className="text-gray-600">Financial Due Diligence Platform</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drag and drop your FEC files here
            </p>
            <p className="text-xs text-gray-500">or click to browse (select multiple)</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.csv,.fec"
              multiple
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFile && (
            <div className="mt-4 space-y-2">
              {Array.isArray(selectedFile) ? (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {selectedFile.length} files selected:
                  </p>
                  {selectedFile.map((file: File, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                      <File size={18} className="text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                  <File size={18} className="text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-all ${
              !selectedFile || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload & Process'}
          </button>

          {/* Help Text */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            Supports multiple FEC files in TXT or CSV format (for multi-year analysis)
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>v1.0.0 • Financial Due Diligence Platform</p>
        </div>
      </div>
    </div>
  );
}
