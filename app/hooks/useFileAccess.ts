"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSuiClient, useSignPersonalMessage } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { checkCanDownload } from "@/lib/services/blockchain";
import { fetchBytesFromWalrus, isWalrusMocked, isSealMocked } from "@/lib/services/walrus";
import {
  createSealClient,
  createSessionKey,
  buildSealApproveTx,
  decryptWithSeal,
  uint8ArrayToBlob,
  extractFileMetadata,
} from "@/lib/services/seal";

export interface FileMetadata {
  blobId: string;
  isPublic: boolean;
  encryptionId: Uint8Array | null;
}

interface UseFileAccessReturn {
  isLoading: boolean;
  canDownload: boolean;
  fileMetadata: FileMetadata | null;
  error: string | null;
  isDownloading: boolean;
  hasCheckedWithWallet: boolean;
  checkAccess: () => Promise<void>;
  downloadFile: () => Promise<void>;
}

export function useFileAccess(fileAccessId: string): UseFileAccessReturn {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [isLoading, setIsLoading] = useState(true);
  const [canDownload, setCanDownload] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastCheckedAddress, setLastCheckedAddress] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch file metadata from blockchain
      const objectData = await client.getObject({
        id: fileAccessId,
        options: { showContent: true },
      });

      if (!objectData.data || !objectData.data.content) {
        setError("File not found on blockchain.");
        setIsLoading(false);
        return;
      }

      // Extract fields from on-chain object
      const content = objectData.data.content;
      if (content.dataType === "moveObject" && "fields" in content) {
        const fields = content.fields as {
          file_id: string;
          is_public: boolean;
          encryption_id: number[] | Uint8Array;
        };

        // Convert encryption_id array to Uint8Array
        const encryptionIdArray = Array.isArray(fields.encryption_id)
          ? new Uint8Array(fields.encryption_id)
          : fields.encryption_id;

        setFileMetadata({
          blobId: fields.file_id,
          isPublic: fields.is_public,
          encryptionId: encryptionIdArray,
        });
      }

      // If no wallet connected, can't verify access
      if (!account?.address) {
        setCanDownload(false);
        setLastCheckedAddress(null);
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
      setLastCheckedAddress(account.address);
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

    if (!fileMetadata?.encryptionId) {
      toast.error("No encryption ID found for this file.");
      return;
    }

    if (!account?.address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsDownloading(true);

    try {
      if (isSealMocked() && isWalrusMocked()) {
        // =====================================================
        // FULL MOCK MODE: Skip both Seal and Walrus
        // =====================================================
        toast.info("Mock mode: Simulating download...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockContent = `This is a mock decrypted file.\nFile Access ID: ${fileAccessId}\nBlob ID: ${fileMetadata.blobId}`;
        const blob = new Blob([mockContent], { type: "text/plain" });
        triggerDownload(blob, "mock-file.txt");

        toast.success("File downloaded (mock mode)!");
      } else if (isSealMocked()) {
        // =====================================================
        // SEAL MOCKED: Real Walrus fetch, no decryption
        // Data still has metadata prepended, extract it
        // =====================================================
        toast.info("Fetching file from Walrus...");
        const rawData = await fetchBytesFromWalrus(fileMetadata.blobId);

        // Extract metadata and file data
        const { metadata, fileData } = extractFileMetadata(rawData);
        const blob = uint8ArrayToBlob(fileData, metadata.type);
        triggerDownload(blob, metadata.name);

        toast.success("File downloaded (no decryption)!");
      } else {
        // =====================================================
        // REAL MODE: Seal decryption flow
        // =====================================================

        // Step 0: Debug - check access before attempting Seal
        console.log("[Debug] Current account:", account.address);
        const manualCheck = await checkCanDownload(client, fileAccessId, account.address);
        console.log("[Debug] Manual can_download check:", manualCheck);

        // Step 1: Create session key
        console.log("[Seal] Step 1: Creating session key...");
        toast.info("Creating decryption session...");
        const sessionKey = await createSessionKey(
          client as any,
          account.address
        );
        console.log("[Seal] Session key created");
        console.log("[Debug] Session key address:", (sessionKey as any).getAddress?.() || (sessionKey as any).address || "unknown");

        // Step 2: Sign the session key's personal message
        console.log("[Seal] Step 2: Requesting signature...");
        toast.info("Please sign to verify your identity...");
        const personalMessage = sessionKey.getPersonalMessage();
        const signResult = await signPersonalMessage({
          message: personalMessage,
        });
        await sessionKey.setPersonalMessageSignature(signResult.signature);
        console.log("[Seal] Signature set");

        // Step 3: Fetch encrypted data from Walrus
        console.log("[Seal] Step 3: Fetching from Walrus, blobId:", fileMetadata.blobId);
        toast.info("Fetching encrypted file from Walrus...");
        const encryptedData = await fetchBytesFromWalrus(fileMetadata.blobId);
        console.log("[Seal] Walrus fetch complete, bytes:", encryptedData.length);

        // Step 4: Parse the encrypted object to verify the ID
        console.log("[Seal] Step 4: Parsing encrypted object and building seal_approve tx...");
        console.log("[Seal] FileAccessId:", fileAccessId);
        console.log("[Seal] EncryptionId from on-chain (hex):", Array.from(fileMetadata.encryptionId).map(b => b.toString(16).padStart(2, '0')).join(''));

        // Import and use EncryptedObject to parse the blob
        const { EncryptedObject } = await import("@mysten/seal");
        const parsedObject = EncryptedObject.parse(encryptedData);
        console.log("[Seal] Encrypted object ID from blob:", parsedObject.id);
        console.log("[Seal] Encrypted object packageId:", parsedObject.packageId);
        console.log("[Seal] Encrypted object threshold:", parsedObject.threshold);
        toast.info("Verifying access with key servers...");
        const txBytes = await buildSealApproveTx(
          client,
          fileAccessId,
          fileMetadata.encryptionId
        );
        console.log("[Seal] Tx bytes built, length:", txBytes.length);

        // Step 5: Decrypt with Seal
        console.log("[Seal] Step 5: Decrypting with Seal key servers...");
        const sealClient = createSealClient(client as any);
        const decryptedData = await decryptWithSeal(
          sealClient,
          encryptedData,
          sessionKey,
          txBytes
        );
        console.log("[Seal] Decryption complete, bytes:", decryptedData.length);

        // Step 6: Extract metadata and trigger download
        console.log("[Seal] Step 6: Extracting file metadata...");
        const { metadata, fileData } = extractFileMetadata(decryptedData);
        console.log("[Seal] File metadata:", metadata);

        const blob = uint8ArrayToBlob(fileData, metadata.type);
        triggerDownload(blob, metadata.name);

        toast.success(`File "${metadata.name}" decrypted and downloaded!`);
      }
    } catch (err: any) {
      console.error("Download error:", err);
      console.error("Error name:", err?.name);
      console.error("Error message:", err?.message);
      console.error("Error stack:", err?.stack);

      // Try to get more details if available
      if (err?.cause) {
        console.error("Error cause:", err.cause);
      }

      // Check for specific Seal errors
      const errorStr = String(err);
      if (errorStr.includes("NoAccessError")) {
        toast.error("Access denied. You don't have permission to decrypt this file.");
      } else if (errorStr.includes("ExpiredSessionKeyError")) {
        toast.error("Session expired. Please try again.");
      } else if (errorStr.includes("User rejected")) {
        toast.error("Signature rejected. Cannot decrypt without verification.");
      } else if (errorStr.includes("Failed to fetch")) {
        toast.error("Network error connecting to key servers. Check console for details.");
      } else {
        toast.error("Failed to download file. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Check access on mount and when account changes
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // We've checked with wallet if lastCheckedAddress matches current account
  const hasCheckedWithWallet = !!(account?.address && lastCheckedAddress === account.address);

  return {
    isLoading,
    canDownload,
    fileMetadata,
    error,
    isDownloading,
    hasCheckedWithWallet,
    checkAccess,
    downloadFile,
  };
}

/**
 * Trigger browser file download
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
