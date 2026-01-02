"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { uploadToWalrus, isMockMode } from "@/lib/services/walrus";
import {
  buildCreateAndTransferTx,
  buildGrantAccessTx,
  extractFileAccessId,
  isGasError,
  getErrorMessage,
  PrivateAccess,
} from "@/lib/services/blockchain";
import { saveFile, StoredFile } from "@/lib/services/fileStorage";

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadFile: (
    file: File,
    isPublic: boolean,
    privateAccessList?: PrivateAccess[]
  ) => Promise<StoredFile | null>;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const uploadFile = async (
    file: File,
    isPublic: boolean,
    privateAccessList?: PrivateAccess[]
  ): Promise<StoredFile | null> => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload to Walrus
      setUploadProgress(10);
      if (isMockMode()) {
        toast.info("Mock mode: Skipping Walrus upload...");
      } else {
        toast.info("Uploading file to Walrus...");
      }

      const { blobId } = await uploadToWalrus(file);
      setUploadProgress(30);

      // Step 2: Create FileAccess on-chain
      toast.info("Creating access control on blockchain...");
      const createTx = buildCreateAndTransferTx(blobId, isPublic);
      const createResult = await signAndExecute({ transaction: createTx });
      setUploadProgress(50);

      // Wait for transaction and get FileAccess object ID
      const txDetails = await client.waitForTransaction({
        digest: createResult.digest,
        options: { showObjectChanges: true },
      });

      const fileAccessId = extractFileAccessId(txDetails.objectChanges || []);
      if (!fileAccessId) {
        throw new Error("Failed to get FileAccess object ID");
      }

      // Step 3: Grant access for private files
      if (!isPublic && privateAccessList && privateAccessList.length > 0) {
        setUploadProgress(60);
        toast.info("Granting access to specified addresses...");

        for (let i = 0; i < privateAccessList.length; i++) {
          const { address, expiresAt } = privateAccessList[i];
          const grantTx = buildGrantAccessTx(fileAccessId, address, expiresAt);
          await signAndExecute({ transaction: grantTx });

          const progressPerAddress = 30 / privateAccessList.length;
          setUploadProgress(60 + progressPerAddress * (i + 1));
        }
      }

      setUploadProgress(95);

      // Step 4: Save to localStorage
      const uploadedFile: StoredFile = {
        id: fileAccessId,
        name: file.name,
        size: file.size,
        blobId: blobId,
        isPublic: isPublic,
        createdAt: Date.now(),
      };

      saveFile(uploadedFile);
      setUploadProgress(100);
      toast.success("File uploaded and secured successfully!");

      return uploadedFile;
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = getErrorMessage(error);

      if (isGasError(errorMessage)) {
        toast.error(
          "Out of gas! Please add SUI to your wallet to pay for transaction fees."
        );
      } else {
        toast.error(errorMessage || "Failed to upload file");
      }

      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    isUploading,
    uploadProgress,
    uploadFile,
  };
}
