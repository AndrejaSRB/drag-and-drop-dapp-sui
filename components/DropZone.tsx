"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadOptions } from "@/components/UploadOptions";

interface PrivateAccess {
  address: string;
  expiresAt: number;
}

interface DropZoneProps {
  onFileSelect: (file: File, isPublic: boolean, accessList: PrivateAccess[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function DropZone({ onFileSelect, isUploading, uploadProgress }: DropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [accessList, setAccessList] = useState<PrivateAccess[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isUploading,
  });

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile, isPublic, accessList);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Uploading...</p>
                {uploadProgress !== undefined && (
                  <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-lg font-medium">
                  {isDragActive ? "Drop your file here" : "Drag & drop a file"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse from your computer
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {selectedFile && !isUploading && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <UploadOptions
            isPublic={isPublic}
            onIsPublicChange={setIsPublic}
            accessList={accessList}
            onAccessListChange={setAccessList}
          />

          <Button onClick={handleUpload} className="w-full" size="lg">
            Upload & Secure
          </Button>
        </div>
      )}
    </div>
  );
}
