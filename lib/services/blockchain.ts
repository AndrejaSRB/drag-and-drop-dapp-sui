import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { PACKAGE_ID, CLOCK_ID } from "@/lib/constants";

export interface PrivateAccess {
  address: string;
  expiresAt: number;
}

/**
 * Create a FileAccess object on-chain and transfer to caller
 * Updated for new contract with encryption_id field
 */
export function buildCreateAndTransferTx(
  blobId: string,
  encryptionId: Uint8Array,
  isPublic: boolean
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_and_transfer`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.vector("u8", Array.from(encryptionId)),
      tx.pure.bool(isPublic),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Create FileAccess AND grant access to multiple addresses in a single transaction
 * Uses the new create_with_access_and_share entry function which:
 * 1. Creates the FileAccess object
 * 2. Grants access to all specified addresses
 * 3. Shares the object (so grantees can access it for seal_approve)
 */
export function buildCreateWithAccessTx(
  blobId: string,
  encryptionId: Uint8Array,
  isPublic: boolean,
  privateAccessList: PrivateAccess[],
  _ownerAddress: string // kept for API compatibility but not used
): Transaction {
  const tx = new Transaction();

  // Extract addresses and expiry values into separate arrays for the Move function
  const users = privateAccessList.map(p => p.address);
  const expiresAtValues = privateAccessList.map(p => p.expiresAt);

  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_with_access_and_share`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.vector("u8", Array.from(encryptionId)),
      tx.pure.bool(isPublic),
      tx.pure.vector("address", users),
      tx.pure.vector("u64", expiresAtValues),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

/**
 * Grant access to an address for a FileAccess object
 * Used for granting additional access after initial creation
 */
export function buildGrantAccessTx(
  fileAccessId: string,
  address: string,
  expiresAt: number
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::grant_access`,
    arguments: [
      tx.object(fileAccessId),
      tx.pure.address(address),
      tx.pure.u64(expiresAt),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Build can_download check transaction
 */
export function buildCanDownloadTx(
  fileAccessId: string,
  userAddress: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::can_download`,
    arguments: [
      tx.object(fileAccessId),
      tx.pure.address(userAddress),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Extract FileAccess object ID from transaction result
 */
export function extractFileAccessId(
  objectChanges: Array<{ type: string; objectType?: string; objectId?: string }>
): string | null {
  const created = objectChanges.find(
    (change) =>
      change.type === "created" && change.objectType?.includes("FileAccess")
  );
  return created?.objectId || null;
}

/**
 * Check if user can download a file using devInspect
 */
export async function checkCanDownload(
  client: SuiClient,
  fileAccessId: string,
  userAddress: string
): Promise<boolean> {
  const tx = buildCanDownloadTx(fileAccessId, userAddress);

  const result = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: userAddress,
  });

  if (result.results && result.results.length > 0) {
    const returnValues = result.results[0].returnValues;
    if (returnValues && returnValues.length > 0) {
      // Boolean is returned as [1] for true, [0] for false
      return returnValues[0][0][0] === 1;
    }
  }

  return false;
}

/**
 * Parse gas-related errors
 */
export function isGasError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("insufficient gas") ||
    lower.includes("insufficient funds") ||
    lower.includes("not enough gas") ||
    lower.includes("gas budget") ||
    lower.includes("balance insufficient")
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

// ============================================
// SEAL-SPECIFIC TRANSACTION BUILDERS
// ============================================

/**
 * Build a single PTB transaction for Seal encrypted file upload.
 * This is the optimized flow: 1 wallet approval instead of 2.
 *
 * Flow (client-side before calling this):
 * 1. Generate encryption_id client-side
 * 2. Encrypt file with Seal using encryption_id
 * 3. Upload encrypted bytes to Walrus → get blobId
 * 4. Call this function to create FileAccess with all data in ONE transaction
 */
export function buildCreateFileAccessWithSealTx(
  blobId: string,
  encryptionId: Uint8Array,
  isPublic: boolean,
  privateAccessList: PrivateAccess[],
  _ownerAddress: string // kept for API compatibility but not used
): Transaction {
  const tx = new Transaction();

  // Extract addresses and expiry values into separate arrays for the Move function
  const users = privateAccessList.map(p => p.address);
  const expiresAtValues = privateAccessList.map(p => p.expiresAt);

  // Use the new entry function that creates, grants access, and shares in one call
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_with_access_and_share`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.vector("u8", Array.from(encryptionId)),
      tx.pure.bool(isPublic),
      tx.pure.vector("address", users),
      tx.pure.vector("u64", expiresAtValues),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

/**
 * Build a transaction to update the blobId on a FileAccess object
 * Kept for backwards compatibility, but new flow doesn't need this
 */
export function buildSetFileIdTx(
  fileAccessId: string,
  newBlobId: string
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::set_file_id`,
    arguments: [
      tx.object(fileAccessId),
      tx.pure.string(newBlobId),
    ],
  });
  return tx;
}
