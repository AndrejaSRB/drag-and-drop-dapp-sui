/**
 * Seal Service - Handles encryption/decryption using Mysten Labs' Seal protocol
 *
 * Seal provides decentralized secrets management using:
 * - Identity-based encryption (IBE)
 * - Threshold cryptography (t-of-n key servers must agree)
 * - On-chain access control via Move contracts
 *
 * Flow:
 * 1. Encrypt: File is encrypted client-side, linked to a FileAccess object ID
 * 2. Store: Encrypted blob is uploaded to Walrus (useless without decryption keys)
 * 3. Decrypt: User requests keys from Seal servers, which verify access on-chain
 */

import { SealClient, SessionKey } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "@mysten/sui/client";
import { PACKAGE_ID, MODULE_NAME, CLOCK_ID } from "@/lib/constants";

// Threshold: Need 2 out of 3 key servers to agree
const SEAL_THRESHOLD = 2;

// Session key TTL in minutes (how long the session is valid)
const SESSION_TTL_MINUTES = 10;

// Testnet key servers with full URL information
// The SDK fetches the URL from on-chain but we need valid objectIds
const TESTNET_KEY_SERVERS = [
  {
    objectId: "0x9c949e53c36ab7a9c484ed9e8b43267a77d4b8d70e79aa6b39042e3d4c434105", // Overclock
    weight: 1,
  },
  {
    objectId: "0x39cef09b24b667bc6ed54f7159d82352fe2d5dd97ca9a5beaa1d21aa774f25a2", // H2O Nodes
    weight: 1,
  },
  {
    objectId: "0x4cded1abeb52a22b6becb42a91d3686a4c901cf52eee16234214d0b5b2da4c46", // Triton One
    weight: 1,
  },
];

/**
 * Create a SealClient instance
 * This is used for both encryption and decryption
 * The SDK automatically fetches key server URLs from on-chain based on objectIds
 */
export function createSealClient(suiClient: SuiClient): SealClient {
  return new SealClient({
    suiClient: suiClient as any, // Type compatibility
    serverConfigs: TESTNET_KEY_SERVERS,
    verifyKeyServers: false, // Skip verification for testnet
  });
}

/**
 * Encrypt data using Seal
 *
 * @param sealClient - The SealClient instance
 * @param data - Raw bytes to encrypt
 * @param fileAccessId - The FileAccess object ID (used as identity for encryption)
 * @returns Encrypted bytes that can only be decrypted by authorized users
 */
export async function encryptWithSeal(
  sealClient: SealClient,
  data: Uint8Array,
  fileAccessId: string
): Promise<Uint8Array> {
  const { encryptedObject } = await sealClient.encrypt({
    threshold: SEAL_THRESHOLD,
    packageId: PACKAGE_ID,
    id: fileAccessId, // The FileAccess object ID becomes the encryption identity
    data,
  });

  return encryptedObject;
}

/**
 * Build transaction bytes for seal_approve verification
 *
 * This creates a transaction that calls our seal_approve function.
 * The key servers execute this to verify the user has access.
 *
 * @param suiClient - The SuiClient for building the transaction
 * @param fileAccessId - The FileAccess object ID
 * @param encryptionId - The encryption ID bytes (stored in FileAccess.encryption_id)
 * @returns Transaction bytes for the key servers
 */
export async function buildSealApproveTx(
  suiClient: SuiClient,
  fileAccessId: string,
  encryptionId: Uint8Array
): Promise<Uint8Array> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::seal_approve`,
    arguments: [
      tx.pure.vector("u8", Array.from(encryptionId)), // id: vector<u8> - must match encryption_id
      tx.object(fileAccessId), // file_access: &FileAccess
      tx.object(CLOCK_ID), // clock: &Clock
    ],
  });

  // Build with onlyTransactionKind - this is what Seal expects
  return await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });
}

/**
 * Create a session key for decryption
 *
 * Session keys are temporary keys that allow decryption requests.
 * They need to be signed by the user's wallet to prove identity.
 *
 * @param suiClient - The SuiClient
 * @param userAddress - The user's wallet address
 * @returns A SessionKey instance (needs personal message signature)
 */
export async function createSessionKey(
  suiClient: SuiClient,
  userAddress: string
): Promise<SessionKey> {
  return await SessionKey.create({
    address: userAddress,
    packageId: PACKAGE_ID,
    ttlMin: SESSION_TTL_MINUTES,
    suiClient: suiClient as any,
  });
}

/**
 * Decrypt data using Seal
 *
 * @param sealClient - The SealClient instance
 * @param encryptedData - The encrypted bytes from Walrus
 * @param sessionKey - A signed session key for authentication
 * @param txBytes - Transaction bytes that prove access (calls seal_approve)
 * @returns Decrypted original data
 */
export async function decryptWithSeal(
  sealClient: SealClient,
  encryptedData: Uint8Array,
  sessionKey: SessionKey,
  txBytes: Uint8Array
): Promise<Uint8Array> {
  return await sealClient.decrypt({
    data: encryptedData,
    sessionKey,
    txBytes,
  });
}

/**
 * Helper to convert a File to Uint8Array
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Generate a random encryption ID as bytes
 * This is used as the identity for Seal encryption.
 *
 * We generate this client-side BEFORE creating the FileAccess on-chain,
 * enabling single-transaction flow:
 * 1. Generate encryption_id
 * 2. Encrypt file with Seal using encryption_id
 * 3. Upload to Walrus → get blobId
 * 4. Create FileAccess on-chain with (blobId, encryption_id) in ONE transaction
 */
export function generateEncryptionId(): Uint8Array {
  // Generate a random 32-byte ID
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Convert encryption ID bytes to hex string for Seal encryption
 * Seal expects the ID as a hex string with 0x prefix
 */
export function encryptionIdToHex(encryptionId: Uint8Array): string {
  const hexString = Array.from(encryptionId)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hexString}`;
}

/**
 * Helper to convert Uint8Array back to a Blob for download
 */
export function uint8ArrayToBlob(data: Uint8Array, mimeType: string = "application/octet-stream"): Blob {
  // Create a new ArrayBuffer copy to ensure TypeScript compatibility
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);
  return new Blob([buffer], { type: mimeType });
}
