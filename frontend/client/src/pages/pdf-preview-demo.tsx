import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { PDFPreview } from '@/components/ui/pdf-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, FileText } from 'lucide-react';

export default function PDFPreviewDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showIndependentPreview, setShowIndependentPreview] = useState(false);

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const pdfFiles = uploadedFiles.filter(file => file.type === 'application/pdf');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">PDF Preview Demo</h1>
          <p className="text-muted-foreground">
            Demonstration of PDF preview functionality across all tools
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Integrated File Upload with Preview */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Integrated File Upload with Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                File upload component with built-in PDF preview
              </p>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFilesChange={handleFilesChange}
                accept=".pdf"
                multiple
                maxSize={10}
                placeholder="Upload PDF files to see preview"
                showPreview={true}
                previewClassName="mt-4"
              />
            </CardContent>
          </Card>

          {/* Independent PDF Preview */}
          <Card className="material-elevation-2">
            <CardHeader>
              <CardTitle>Independent PDF Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Standalone PDF preview component
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pdfFiles.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select PDF to Preview:</label>
                    <div className="flex flex-wrap gap-2">
                      {pdfFiles.map((file, index) => (
                        <Button
                          key={index}
                          variant={selectedFile === file ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedFile(file)}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowIndependentPreview(!showIndependentPreview)}
                    className="w-full"
                  >
                    {showIndependentPreview ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Independent Preview
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Independent Preview
                      </>
                    )}
                  </Button>

                  {showIndependentPreview && selectedFile && (
                    <PDFPreview
                      file={selectedFile}
                      onClose={() => setShowIndependentPreview(false)}
                      showPreview={true}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>Upload PDF files using the left panel to see preview options</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card className="material-elevation-2 mt-8">
          <CardHeader>
            <CardTitle>PDF Preview Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">Integrated Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    Built into FileUpload component, automatically shows when PDF is uploaded
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">Zoom Controls</h4>
                  <p className="text-sm text-muted-foreground">
                    Zoom in/out with percentage indicator for better readability
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">Toggle Visibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Show/hide preview to save space when not needed
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">Download Option</h4>
                  <p className="text-sm text-muted-foreground">
                    Quick download button for easy file access
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">File Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Shows filename, file size, and type information
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">✓</Badge>
                <div>
                  <h4 className="font-medium">Multiple Files</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically previews first PDF when multiple files uploaded
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="material-elevation-2 mt-8">
          <CardHeader>
            <CardTitle>Implementation Across Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground mb-4">
                The PDF preview feature has been integrated into all file upload components across the PaperMind platform:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Research Tools</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• CAG System - Multi-document Q&A</li>
                    <li>• Gap Analyzer - Research gap identification</li>
                    <li>• Systematic Review - Literature analysis</li>
                    <li>• Research Insights - Paper analysis</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Content Generation</h4>
                  <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <li>• Podcast Generator - Audio content creation</li>
                    <li>• Research Assistant - Paper Q&A</li>
                    <li>• Future tools with PDF uploads</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Usage:</strong> Simply upload any PDF file using the file upload components, 
                  and the preview will automatically appear below. You can toggle visibility, zoom in/out, 
                  and download the file directly from the preview interface.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
