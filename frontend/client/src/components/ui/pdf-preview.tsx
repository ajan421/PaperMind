import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, Eye, EyeOff, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';
import './pdf-preview.css';

interface PDFPreviewProps {
  file: File | null;
  className?: string;
  onClose?: () => void;
  showPreview?: boolean;
  onTogglePreview?: (show: boolean) => void;
}

export function PDFPreview({
  file,
  className,
  onClose,
  showPreview = true,
  onTogglePreview,
}: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      setError(null);
      
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setIsLoading(false);

      // Cleanup URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
      setError(file ? 'Selected file is not a PDF' : null);
    }
  }, [file]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleDownload = () => {
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const togglePreview = () => {
    const newState = !showPreview;
    onTogglePreview?.(newState);
  };

  if (!file) {
    return null;
  }

  return (
    <Card className={cn('pdf-preview-container', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PDF Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePreview}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground truncate">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            {showPreview && pdfUrl && (
              <>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {showPreview && (
        <CardContent className="pt-0">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64 text-red-600">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <div className="pdf-viewer-container">
              <iframe
                src={pdfUrl}
                className="w-full border rounded-lg"
                style={{
                  height: '500px',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: `${100 / zoom}%`,
                }}
                title={`PDF Preview: ${file.name}`}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Enhanced FileUpload component with PDF preview
interface FileUploadWithPreviewProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
  previewClassName?: string;
}

export function FileUploadWithPreview({
  onFilesChange,
  accept = '.pdf',
  multiple = false,
  maxSize = 10,
  className,
  placeholder = 'Drop your PDF here or click to browse',
  showPreview = true,
  previewClassName,
}: FileUploadWithPreviewProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPDFPreview, setShowPDFPreview] = useState(true);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
    onFilesChange(files);
  };

  // Get the first PDF file for preview
  const previewFile = selectedFiles.find(file => file.type === 'application/pdf') || null;

  return (
    <div className="space-y-4">
      {/* Original FileUpload component */}
      <div className={className}>
        {/* We'll import and use the original FileUpload component here */}
        <FileUploadCore
          onFilesChange={handleFilesChange}
          accept={accept}
          multiple={multiple}
          maxSize={maxSize}
          placeholder={placeholder}
        />
      </div>

      {/* PDF Preview */}
      {showPreview && previewFile && (
        <PDFPreview
          file={previewFile}
          className={previewClassName}
          showPreview={showPDFPreview}
          onTogglePreview={setShowPDFPreview}
        />
      )}
    </div>
  );
}

// Core FileUpload component (extracted from the original)
interface FileUploadCoreProps {
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  placeholder?: string;
}

function FileUploadCore({
  onFilesChange,
  accept = '.pdf',
  multiple = false,
  maxSize = 10,
  placeholder = 'Drop your PDF here or click to browse',
}: FileUploadCoreProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }
    
    if (accept && !accept.split(',').some(type => file.type.includes(type.replace('.', '').trim()))) {
      return `File type not supported. Please upload ${accept} files.`;
    }
    
    return null;
  };

  const handleFiles = (newFiles: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of newFiles) {
      const validation = validateFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      validFiles.push(file);
    }
    
    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles;
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-all duration-300 hover:border-primary hover:bg-primary/5',
          isDragOver && 'border-primary bg-primary/10',
          error && 'border-red-300 bg-red-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input-core')?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg mb-2">{placeholder}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Supports {accept} files up to {maxSize}MB
        </p>
        <Button type="button" variant="default">
          Choose File{multiple ? 's' : ''}
        </Button>
        <input
          id="file-input-core"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Selected Files:</h3>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { FileUploadCore };
