'use client';

import { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface SpreadsheetUploadFormProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}

export function SpreadsheetUploadForm({
  onUpload,
  isLoading = false,
}: SpreadsheetUploadFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a CSV or Excel file');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Drag Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative px-6 py-12 border-2 border-dashed rounded-lg text-center transition ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <Upload className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="font-semibold text-gray-900 mb-1">
            {selectedFile ? selectedFile.name : 'Drop your CSV or Excel file here'}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            or click to browse
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isLoading}
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-900 mb-2">CSV/Excel Format:</h4>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• Column 1: Product Link (required)</li>
            <li>• Column 2: Category (optional)</li>
            <li>• Column 3: Notes (optional)</li>
            <li>Row 1 should contain headers</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || isLoading}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Start Import'}
        </button>
      </form>
    </div>
  );
}
