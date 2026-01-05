// ============================================
// MOCK FLAGS - Control what gets skipped
// ============================================
export const MOCK_WALRUS = process.env.NEXT_PUBLIC_MOCK_WALRUS !== "false";
export const MOCK_SEAL = process.env.NEXT_PUBLIC_MOCK_SEAL !== "false";

// Walrus URLs from environment (required when MOCK_WALRUS=false)
export const WALRUS_PUBLISHER_URL = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || "";
export const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "";

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
    const blobId = `mock-blob-${Date.now()}-${file.name.replace(
      /[^a-zA-Z0-9]/g,
      ""
    )}`;
    return { blobId };
  }

  // REAL MODE: Upload to Walrus
  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
    method: "PUT",
    body: file,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || "Failed to upload to Walrus";
    const isInsufficientFunds =
      errorMsg.includes("insufficient balance") ||
      errorMsg.includes("SUI coins");

    const error: WalrusError = {
      message: isInsufficientFunds
        ? "Walrus publisher out of funds. Try again later."
        : errorMsg,
      isInsufficientFunds,
    };
    throw error;
  }

  const blobId =
    data.newlyCreated?.blobObject?.blobId || data.alreadyCertified?.blobId;

  if (!blobId) {
    throw {
      message: "No blob ID returned from Walrus",
      isInsufficientFunds: false,
    };
  }

  return { blobId };
}

/**
 * Upload encrypted bytes to Walrus
 * Used after Seal encryption - the encrypted blob is stored on Walrus
 */
export async function uploadBytesToWalrus(
  data: Uint8Array
): Promise<WalrusUploadResult> {
  if (MOCK_WALRUS) {
    // MOCK MODE: Skip Walrus, generate fake blobId
    await new Promise((resolve) => setTimeout(resolve, 500));
    const blobId = `mock-encrypted-blob-${Date.now()}`;
    return { blobId };
  }

  // REAL MODE: Upload encrypted bytes to Walrus
  // Create a new ArrayBuffer copy to ensure TypeScript compatibility
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);
  const blob = new Blob([buffer]);

  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });

  const responseData = await response.json();

  if (!response.ok || responseData.error) {
    const errorMsg =
      responseData.error?.message || "Failed to upload to Walrus";
    const isInsufficientFunds =
      errorMsg.includes("insufficient balance") ||
      errorMsg.includes("SUI coins");

    const error: WalrusError = {
      message: isInsufficientFunds
        ? "Walrus publisher out of funds. Try again later."
        : errorMsg,
      isInsufficientFunds,
    };
    throw error;
  }

  const blobId =
    responseData.newlyCreated?.blobObject?.blobId ||
    responseData.alreadyCertified?.blobId;

  if (!blobId) {
    throw {
      message: "No blob ID returned from Walrus",
      isInsufficientFunds: false,
    };
  }

  return { blobId };
}

/**
 * Fetch encrypted bytes from Walrus
 * Used before Seal decryption - get the encrypted blob from Walrus
 */
export async function fetchBytesFromWalrus(
  blobId: string
): Promise<Uint8Array> {
  if (MOCK_WALRUS) {
    // MOCK MODE: Return mock encrypted data
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Return some mock bytes that look like encrypted data
    const mockData = new TextEncoder().encode(
      `mock-encrypted-content-${blobId}`
    );
    return mockData;
  }

  // REAL MODE: Fetch from Walrus aggregator
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch from Walrus");
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
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
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);

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

export function isWalrusMocked(): boolean {
  return MOCK_WALRUS;
}

export function isSealMocked(): boolean {
  return MOCK_SEAL;
}
