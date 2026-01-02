"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { checkCanDownload } from "@/lib/services/blockchain";
import { downloadFromWalrus, isMockMode } from "@/lib/services/walrus";
import { getStoredFileById } from "@/lib/services/fileStorage";

export interface FileMetadata {
  blobId: string;
  name: string;
  size: number;
  isPublic: boolean;
}

interface UseFileAccessReturn {
  isLoading: boolean;
  canDownload: boolean;
  fileMetadata: FileMetadata | null;
  error: string | null;
  isDownloading: boolean;
  checkAccess: () => Promise<void>;
  downloadFile: () => Promise<void>;
}

export function useFileAccess(fileAccessId: string): UseFileAccessReturn {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const [isLoading, setIsLoading] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get file metadata from localStorage
      const storedFile = getStoredFileById(fileAccessId);

      if (storedFile) {
        setFileMetadata({
          blobId: storedFile.blobId,
          name: storedFile.name,
          size: storedFile.size,
          isPublic: storedFile.isPublic,
        });
      }

      // If no wallet connected, can't verify access
      if (!account?.address) {
        // Try to check if file exists on-chain
        const objectData = await client.getObject({
          id: fileAccessId,
          options: { showContent: true },
        });

        if (!objectData.data) {
          setError("File not found on blockchain.");
          setIsLoading(false);
          return;
        }

        setCanDownload(false);
        setIsLoading(false);
        return;
      }

      // Check can_download on-chain
      const hasAccess = await checkCanDownload(
        client,
        fileAccessId,
        account.address
      );
      setCanDownload(hasAccess);
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Failed to check access permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [fileAccessId, account?.address, client]);

  const downloadFile = async () => {
    if (!fileMetadata?.blobId) {
      toast.error("No blob ID found for this file.");
      return;
    }

    setIsDownloading(true);

    try {
      if (isMockMode()) {
        toast.info("Mock mode: Simulating download...");
      } else {
        toast.info("Downloading from Walrus...");
      }

      await downloadFromWalrus(fileMetadata.blobId, fileMetadata.name);
      toast.success(isMockMode() ? "File downloaded (mock)!" : "File downloaded successfully!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download file.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Check access on mount and when account changes
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    isLoading,
    canDownload,
    fileMetadata,
    error,
    isDownloading,
    checkAccess,
    downloadFile,
  };
}
