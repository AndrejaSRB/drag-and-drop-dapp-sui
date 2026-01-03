// Contract deployment info (from testnet deployment)
// Updated with create_with_access_and_share for proper shared object support
export const PACKAGE_ID = "0x462708965638752db291d4a6809a5f43a95da2f77f926bb28cf20dd9cb261e31";
export const CLOCK_ID = "0x6"; // Sui's global clock object

// Walrus configuration (testnet)
export const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
export const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

// Upload Relay - works without needing WAL tokens (sponsored)
export const WALRUS_UPLOAD_RELAY = "https://upload-relay.testnet.walrus.space";

// Contract module and functions
export const MODULE_NAME = "access_grant";

export const FUNCTIONS = {
  CREATE_AND_TRANSFER: `${PACKAGE_ID}::${MODULE_NAME}::create_and_transfer`,
  CREATE_FILE_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::create_file_access`,
  GRANT_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::grant_access`,
  REVOKE_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::revoke_access`,
  CAN_DOWNLOAD: `${PACKAGE_ID}::${MODULE_NAME}::can_download`,
  GET_ACCESS_INFO: `${PACKAGE_ID}::${MODULE_NAME}::get_access_info`,
  HAS_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::has_access`,
  SET_FILE_ID: `${PACKAGE_ID}::${MODULE_NAME}::set_file_id`,
  SEAL_APPROVE: `${PACKAGE_ID}::${MODULE_NAME}::seal_approve`,
} as const;

// Seal key servers are configured in lib/services/seal.ts
// The SDK fetches the server URLs from on-chain based on objectIds
