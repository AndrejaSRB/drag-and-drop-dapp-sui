"use client";

import { useState, useCallback } from "react";
import { useFileUpload } from "./useFileUpload";

export type UploadFlowState = "idle" | "uploading" | "success";

interface UploadResult {
  fileId: string;
  fileName: string;
  shareableLink: string;
}

interface UseUploadFlowReturn {
  // State
  flowState: UploadFlowState;
  uploadResult: UploadResult | null;
  isUploading: boolean;
  uploadProgress: number;

  // Actions
  handleUpload: (
    file: File,
    isPublic: boolean,
    accessList: { address: string; expiresAt: number }[]
  ) => Promise<void>;
  resetFlow: () => void;
}

export function useUploadFlow(): UseUploadFlowReturn {
  const [flowState, setFlowState] = useState<UploadFlowState>("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const { isUploading, uploadProgress, uploadFile } = useFileUpload();

  const handleUpload = useCallback(
    async (
      file: File,
      isPublic: boolean,
      accessList: { address: string; expiresAt: number }[]
    ) => {
      setFlowState("uploading");

      const result = await uploadFile(file, isPublic, accessList);

      if (result) {
        const shareableLink =
          typeof window !== "undefined"
            ? `${window.location.origin}/file/${result.id}`
            : `/file/${result.id}`;

        setUploadResult({
          fileId: result.id,
          fileName: result.name,
          shareableLink,
        });
        setFlowState("success");
      } else {
        // Upload failed, go back to idle
        setFlowState("idle");
      }
    },
    [uploadFile]
  );

  const resetFlow = useCallback(() => {
    setFlowState("idle");
    setUploadResult(null);
  }, []);

  return {
    flowState,
    uploadResult,
    isUploading,
    uploadProgress,
    handleUpload,
    resetFlow,
  };
}
