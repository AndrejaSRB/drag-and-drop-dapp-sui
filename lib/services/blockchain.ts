import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { PACKAGE_ID, CLOCK_ID } from "@/lib/constants";

export interface PrivateAccess {
  address: string;
  expiresAt: number;
}

/**
 * Create a FileAccess object on-chain and transfer to caller
 */
export function buildCreateAndTransferTx(
  blobId: string,
  isPublic: boolean
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::access_grant::create_and_transfer`,
    arguments: [
      tx.pure.string(blobId),
      tx.pure.bool(isPublic),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

/**
 * Grant access to an address for a FileAccess object
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
