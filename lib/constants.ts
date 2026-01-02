// Contract deployment info (from testnet deployment)
export const PACKAGE_ID = "0xb2eaeab728a271af3cbc115e060e8b87181e7bd6303751fb2027cb7a6eebfd3a";
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
  GRANT_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::grant_access`,
  REVOKE_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::revoke_access`,
  CAN_DOWNLOAD: `${PACKAGE_ID}::${MODULE_NAME}::can_download`,
  GET_ACCESS_INFO: `${PACKAGE_ID}::${MODULE_NAME}::get_access_info`,
  HAS_ACCESS: `${PACKAGE_ID}::${MODULE_NAME}::has_access`,
} as const;
