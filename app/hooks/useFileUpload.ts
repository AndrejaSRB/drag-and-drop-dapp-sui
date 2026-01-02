"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { uploadBytesToWalrus, isMockMode } from "@/lib/services/walrus";
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
      toast.info(isMockMode() ? "Mock mode: Preparing file..." : "Encrypting file with Seal...");

      const fileData = await fileToUint8Array(file);
      let dataToUpload: Uint8Array;

      if (isMockMode()) {
        // In mock mode, skip actual Seal encryption
        dataToUpload = fileData;
      } else {
        // Real mode: Encrypt with Seal using the encryption ID
        const sealClient = createSealClient(client as any);
        dataToUpload = await encryptWithSeal(sealClient, fileData, encryptionIdHex);
      }

      setUploadProgress(40);

      // =====================================================
      // STEP 3: Upload encrypted data to Walrus
      // =====================================================
      toast.info(isMockMode() ? "Mock mode: Uploading to Walrus..." : "Uploading encrypted file to Walrus...");

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
      toast.success(
        isMockMode()
          ? "File uploaded successfully (mock mode)!"
          : "File encrypted and uploaded successfully!"
      );

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
