import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (filesToUpload: File[]) => api.uploadFEC(filesToUpload),
    onSuccess: (response) => {
      // Now process the data
      processData(response.session_id);
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to upload files');
    },
  });

  // Process mutation
  const processMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.processFEC({
        session_id: sessionId,
        company_name: companyName || 'Untitled',
      }),
    onSuccess: (response) => {
      navigate(`/dashboard/${response.session_id}`);
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to process data');
    },
  });

  const processData = (sessionId: string) => {
    processMutation.mutate(sessionId);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')
    );

    if (droppedFiles.length === 0) {
      setError('Please drop FEC files (CSV or TXT)');
      return;
    }

    setFiles(droppedFiles);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    uploadMutation.mutate(files);
  };

  const isLoading = uploadMutation.isPending || processMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Wincap</h1>
          <p className="text-lg text-muted-foreground">Financial Due Diligence from FEC Files</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Upload FEC File</CardTitle>
            <CardDescription>
              Drag and drop your FEC (Fichier des Écritures Comptables) file or click to select
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                multiple
                accept=".csv,.txt"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'Drop your FEC file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
              </div>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Selected files:</p>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.name} className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company Name Input */}
            <div className="space-y-2">
              <Label htmlFor="company">
                Company Name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="company"
                placeholder="e.g., Acme Corporation"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
                className="max-w-md"
              />
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                'Upload & Analyze'
              )}
            </Button>

            {/* Info Section */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold text-foreground">What happens next?</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Your FEC file will be parsed and validated</li>
                <li>Financial statements (P&L, Balance Sheet) will be generated</li>
                <li>KPIs and key metrics will be calculated</li>
                <li>A comprehensive financial dashboard will be created</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Your files are processed securely and not stored permanently
          </p>
        </div>
      </div>
    </div>
  );
}
