"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { uploadBytesToWalrus, isWalrusMocked, isSealMocked } from "@/lib/services/walrus";
import {
  buildCreateFileAccessWithSealTx,
  extractFileAccessId,
  isGasError,
  getErrorMessage,
  PrivateAccess,
} from "@/lib/services/blockchain";
import {
  createSealClient,
  encryptWithSeal,
  fileToUint8Array,
  generateEncryptionId,
  encryptionIdToHex,
  prependFileMetadata,
} from "@/lib/services/seal";

export interface UploadResult {
  id: string;
  name: string;
}

interface UseFileUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadFile: (
    file: File,
    isPublic: boolean,
    privateAccessList?: PrivateAccess[]
  ) => Promise<UploadResult | null>;
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
  ): Promise<UploadResult | null> => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // =====================================================
      // STEP 1: Generate encryption ID (client-side)
      // =====================================================
      setUploadProgress(10);
      toast.info("Generating encryption identity...");

      const encryptionId = generateEncryptionId();
      const encryptionIdHex = encryptionIdToHex(encryptionId);

      setUploadProgress(20);

      // =====================================================
      // STEP 2: Encrypt file with Seal using encryption ID
      // =====================================================
      toast.info(isSealMocked() ? "Mock mode: Skipping encryption..." : "Encrypting file with Seal...");

      const fileData = await fileToUint8Array(file);

      // Prepend metadata (filename, type, size) so we can restore it on download
      const dataWithMetadata = prependFileMetadata(fileData, {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      });

      let dataToUpload: Uint8Array;

      if (isSealMocked()) {
        // In mock mode, skip actual Seal encryption but keep metadata
        dataToUpload = dataWithMetadata;
      } else {
        // Real mode: Encrypt with Seal using the encryption ID
        const sealClient = createSealClient(client as any);
        dataToUpload = await encryptWithSeal(sealClient, dataWithMetadata, encryptionIdHex);
      }

      setUploadProgress(40);

      // =====================================================
      // STEP 3: Upload encrypted data to Walrus
      // =====================================================
      toast.info(isWalrusMocked() ? "Mock mode: Skipping Walrus upload..." : "Uploading encrypted file to Walrus...");

      const { blobId } = await uploadBytesToWalrus(dataToUpload);

      setUploadProgress(60);

      // =====================================================
      // STEP 4: Create FileAccess on-chain (SINGLE TRANSACTION!)
      // =====================================================
      // Now we have everything: blobId from Walrus, encryption_id we generated
      // Create FileAccess + grant access in ONE transaction = ONE wallet approval
      toast.info("Creating access control on blockchain...");

      const createTx = buildCreateFileAccessWithSealTx(
        blobId,
        encryptionId,
        isPublic,
        privateAccessList || [],
        account.address
      );
      const createResult = await signAndExecute({ transaction: createTx });

      // Wait for transaction and get FileAccess object ID
      const txDetails = await client.waitForTransaction({
        digest: createResult.digest,
        options: { showObjectChanges: true },
      });

      const fileAccessId = extractFileAccessId(txDetails.objectChanges || []);
      if (!fileAccessId) {
        throw new Error("Failed to get FileAccess object ID");
      }

      setUploadProgress(100);

      // Build success message based on what was mocked
      let successMsg = "File uploaded successfully!";
      if (isSealMocked() && isWalrusMocked()) {
        successMsg = "File uploaded (mock mode - no encryption/storage)";
      } else if (isSealMocked()) {
        successMsg = "File uploaded (mock encryption, real storage)";
      } else if (isWalrusMocked()) {
        successMsg = "File encrypted (mock storage)";
      } else {
        successMsg = "File encrypted and uploaded!";
      }
      toast.success(successMsg);

      return {
        id: fileAccessId,
        name: file.name,
      };
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
