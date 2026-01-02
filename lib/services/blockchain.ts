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
 * Create FileAccess AND grant access to multiple addresses in a single PTB
 * This combines everything into one transaction = one wallet approval
 * Updated for new contract with encryption_id field
 */
export function buildCreateWithAccessTx(
  blobId: string,
  encryptionId: Uint8Array,
  isPublic: boolean,
  privateAccessList: PrivateAccess[],
  ownerAddress: string
): Transaction {
  const tx = new Transaction();

  // Step 1: Create the FileAccess object (returns it, doesn't transfer)
  const [fileAccess] = tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_file_access`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.vector("u8", Array.from(encryptionId)),
      tx.pure.bool(isPublic),
      tx.object(CLOCK_ID),
    ],
  });

  // Step 2: Grant access to each address in the list
  for (const { address, expiresAt } of privateAccessList) {
    tx.moveCall({
      target: `${PACKAGE_ID}::access_grant::grant_access`,
      arguments: [
        fileAccess, // Use the object from step 1
        tx.pure.address(address),
        tx.pure.u64(expiresAt),
        tx.object(CLOCK_ID),
      ],
    });
  }

  // Step 3: Transfer the FileAccess object to the owner
  tx.transferObjects([fileAccess], ownerAddress);

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
  ownerAddress: string
): Transaction {
  const tx = new Transaction();

  // Create FileAccess with blobId and encryption_id
  const [fileAccess] = tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_file_access`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.vector("u8", Array.from(encryptionId)),
      tx.pure.bool(isPublic),
      tx.object(CLOCK_ID),
    ],
  });

  // Grant access to each address
  for (const { address, expiresAt } of privateAccessList) {
    tx.moveCall({
      target: `${PACKAGE_ID}::access_grant::grant_access`,
      arguments: [
        fileAccess,
        tx.pure.address(address),
        tx.pure.u64(expiresAt),
        tx.object(CLOCK_ID),
      ],
    });
  }

  // Transfer to owner
  tx.transferObjects([fileAccess], ownerAddress);

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
