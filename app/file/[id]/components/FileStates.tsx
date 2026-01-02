"use client";

import { Loader2, Lock, AlertCircle, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Checking access permissions...</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-destructive">{message}</p>
    </div>
  );
}

export function ConnectWalletState() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <Lock className="h-12 w-12 text-yellow-600" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
        <p className="text-muted-foreground">
          Please connect your Sui wallet to verify access permissions.
        </p>
      </div>
    </div>
  );
}

export function AccessDeniedState() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <Lock className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don&apos;t have permission to download this file, or your access
          has expired.
        </p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface DownloadReadyStateProps {
  fileName?: string;
  fileSize?: number;
  isDownloading: boolean;
  onDownload: () => void;
}

export function DownloadReadyState({
  fileName,
  fileSize,
  isDownloading,
  onDownload,
}: DownloadReadyStateProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <FileIcon className="h-16 w-16 text-primary" />

      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">{fileName || "File"}</h2>
        <p className="text-sm text-muted-foreground">
          {formatFileSize(fileSize || 0)}
        </p>
      </div>

      <Button
        onClick={onDownload}
        disabled={isDownloading}
        size="lg"
        className="w-full"
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download File
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Access verified on Sui blockchain
      </p>
    </div>
  );
}
