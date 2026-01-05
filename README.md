# Sui Drag & Drop File Sharing dApp

A decentralized file sharing application built on Sui blockchain with Walrus storage and Seal threshold encryption.

## Features

- **Drag & drop file uploads** with progress tracking
- **End-to-end encryption** using Seal threshold encryption
- **Decentralized storage** on Walrus
- **Access control** - public or private files with allowlist
- **Wallet integration** - works with Sui wallets

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) package manager
- A Sui wallet (e.g., [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil))

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd drag_and_drop_dapp
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` based on your needs (see [Configuration](#configuration) below).

### 4. Start the development server

```bash
pnpm dev
```

### 5. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

The app supports different modes via environment variables in `.env.local`:

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MOCK_WALRUS` | `true` | Skip real Walrus storage (use fake blobIds) |
| `NEXT_PUBLIC_MOCK_SEAL` | `true` | Skip Seal encryption (no real encryption) |
| `NEXT_PUBLIC_WALRUS_PUBLISHER` | - | Publisher URL for uploads (required when MOCK_WALRUS=false) |
| `NEXT_PUBLIC_WALRUS_AGGREGATOR` | - | Aggregator URL for downloads (required when MOCK_WALRUS=false) |

### Recommended Configurations

#### 1. Fast UI Testing (Default)

For quick UI development and testing without external dependencies:

```env
NEXT_PUBLIC_MOCK_WALRUS=true
NEXT_PUBLIC_MOCK_SEAL=true
```

#### 2. Test Seal Encryption Only

Test the encryption flow without needing Walrus funds:

```env
NEXT_PUBLIC_MOCK_WALRUS=true
NEXT_PUBLIC_MOCK_SEAL=false
```

#### 3. Local Walrus Publisher (Full Flow)

Use a local Walrus publisher for complete end-to-end testing:

```env
NEXT_PUBLIC_MOCK_WALRUS=false
NEXT_PUBLIC_MOCK_SEAL=false
NEXT_PUBLIC_WALRUS_PUBLISHER=http://localhost:31415
NEXT_PUBLIC_WALRUS_AGGREGATOR=http://localhost:31416
```

See [Setting Up Local Publisher](#setting-up-local-walrus-publisher) below.

#### 4. Community Testnet Publisher

Use a community-operated testnet publisher (no local setup needed):

```env
NEXT_PUBLIC_MOCK_WALRUS=false
NEXT_PUBLIC_MOCK_SEAL=false
NEXT_PUBLIC_WALRUS_PUBLISHER=https://walrus-testnet-publisher.nami.cloud
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
```

Other community publishers:
- NodeInfra: `https://walrus-testnet-publisher.nodeinfra.com`
- RubyNodes: `https://walrus-publisher.rubynodes.io`

## Setting Up Local Walrus Publisher

To run your own local Walrus publisher:

### 1. Install Walrus CLI

Follow the [Walrus installation guide](https://docs.walrus.site/walrus-sites/tutorial-install.html) to install the Walrus CLI.

### 2. Run the Publisher

Start a local publisher on port 31415:

```bash
walrus publisher --port 31415
```

### 3. Fund the Publisher

The publisher wallet needs SUI tokens for gas. Get testnet SUI from the [Sui Testnet Faucet](https://faucet.testnet.sui.io/).

### 4. Configure the App

Set your `.env.local`:

```env
NEXT_PUBLIC_MOCK_WALRUS=false
NEXT_PUBLIC_MOCK_SEAL=false
NEXT_PUBLIC_WALRUS_PUBLISHER=http://localhost:31415
NEXT_PUBLIC_WALRUS_AGGREGATOR=http://localhost:31416
```

## Using Mocked Walrus/Seal

Mock modes are useful for development and testing without external dependencies.

### Mocked Walrus (`NEXT_PUBLIC_MOCK_WALRUS=true`)

When enabled:
- File uploads return fake blob IDs (e.g., `mock-blob-1234567890-filename.txt`)
- Downloads simulate a 1-second delay and return mock content
- No actual network requests to Walrus

### Mocked Seal (`NEXT_PUBLIC_MOCK_SEAL=true`)

When enabled:
- Files are **not encrypted** - metadata is prepended but content remains readable
- No session keys or key server communication
- Useful for testing the upload/download flow without wallet signing

### Combining Mock Modes

| Walrus | Seal | Use Case |
|--------|------|----------|
| Mock | Mock | Fastest - UI development only |
| Mock | Real | Test encryption without Walrus costs |
| Real | Mock | Test storage without encryption overhead |
| Real | Real | Full production flow |

## Available Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

## Project Structure

```
drag_and_drop_dapp/
├── app/
│   ├── file/[id]/       # File download page
│   ├── hooks/           # React hooks (useFileUpload, useFileAccess)
│   ├── page.tsx         # Home page with upload UI
│   ├── layout.tsx       # Root layout
│   └── providers.tsx    # Sui/Query/Wallet providers
├── lib/
│   ├── services/
│   │   ├── walrus.ts    # Walrus storage integration
│   │   ├── seal.ts      # Seal encryption integration
│   │   └── blockchain.ts # Sui transaction building
│   ├── constants.ts     # Package ID, module name
│   └── utils.ts         # Utility functions
├── components/
│   ├── ui/              # shadcn UI components
│   ├── DropZone.tsx     # File upload drop zone
│   └── UploadOptions.tsx # Access control settings
└── public/              # Static assets
```

## How It Works

### Upload Flow

1. User drops a file and configures access settings
2. App generates a unique encryption ID
3. File is encrypted using Seal threshold encryption
4. Encrypted file is uploaded to Walrus storage
5. FileAccess object is created on Sui blockchain with access rules

### Download Flow

1. User visits file link with FileAccess object ID
2. App verifies user has download permission on-chain
3. Encrypted file is fetched from Walrus
4. Seal decryption keys are retrieved from key servers
5. File is decrypted and downloaded to user's device

## Network

The app is configured for **Sui Testnet** by default. The smart contract is deployed at:

```
Package ID: 0x462708965638752db291d4a6809a5f43a95da2f77f926bb28cf20dd9cb261e31
```

## Troubleshooting

### "Insufficient funds" error

The Walrus publisher wallet needs SUI for gas. Either:
- Use mock mode (`NEXT_PUBLIC_MOCK_WALRUS=true`)
- Fund your local publisher wallet
- Use a community publisher (Nami Cloud, NodeInfra, RubyNodes)

### Wallet not connecting

- Ensure you have a Sui wallet extension installed
- Switch to Sui Testnet in your wallet settings

### Decryption failing

- Ensure `NEXT_PUBLIC_MOCK_SEAL=false` if using real encryption
- Check that the wallet used for download has access permission
- Verify the FileAccess object exists on-chain

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Blockchain**: Sui via @mysten/sui
- **Storage**: Walrus via @mysten/walrus
- **Encryption**: Seal via @mysten/seal
- **Wallet**: @mysten/dapp-kit
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: TanStack Query
