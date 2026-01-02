import { WALRUS_PUBLISHER, WALRUS_AGGREGATOR } from "@/lib/constants";

// Set to true to skip Walrus and use mock blobId (for testing on-chain logic)
const MOCK_WALRUS = true;

export interface WalrusUploadResult {
  blobId: string;
}

export interface WalrusError {
  message: string;
  isInsufficientFunds: boolean;
}

/**
 * Upload a file to Walrus decentralized storage
 */
export async function uploadToWalrus(file: File): Promise<WalrusUploadResult> {
  if (MOCK_WALRUS) {
    // MOCK MODE: Skip Walrus, generate fake blobId
    await new Promise((resolve) => setTimeout(resolve, 500));
    const blobId = `mock-blob-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "")}`;
    return { blobId };
  }

  // REAL MODE: Upload to Walrus
  const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
    method: "PUT",
    body: file,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || "Failed to upload to Walrus";
    const isInsufficientFunds =
      errorMsg.includes("insufficient balance") || errorMsg.includes("SUI coins");

    const error: WalrusError = {
      message: isInsufficientFunds
        ? "Walrus publisher out of funds. Try again later."
        : errorMsg,
      isInsufficientFunds,
    };
    throw error;
  }

  const blobId = data.newlyCreated?.blobObject?.blobId || data.alreadyCertified?.blobId;

  if (!blobId) {
    throw { message: "No blob ID returned from Walrus", isInsufficientFunds: false };
  }

  return { blobId };
}

/**
 * Download a file from Walrus by blobId
 */
export async function downloadFromWalrus(
  blobId: string,
  fileName: string
): Promise<void> {
  if (MOCK_WALRUS) {
    // MOCK MODE: Simulate download
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockContent = `This is a mock file content for: ${fileName}\nBlob ID: ${blobId}`;
    const blob = new Blob([mockContent], { type: "text/plain" });
    triggerDownload(blob, fileName || "download.txt");
    return;
  }

  // REAL MODE: Fetch from Walrus aggregator
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);

  if (!response.ok) {
    throw new Error("Failed to download from Walrus");
  }

  const blob = await response.blob();
  triggerDownload(blob, fileName || "download");
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

export function isMockMode(): boolean {
  return MOCK_WALRUS;
}
