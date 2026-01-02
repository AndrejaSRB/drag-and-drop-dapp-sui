"use client";

import { useParams } from "next/navigation";
import { useCurrentAccount, useAutoConnectWallet } from "@mysten/dapp-kit";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { useFileAccess } from "@/app/hooks/useFileAccess";
import {
  LoadingState,
  ErrorState,
  ConnectWalletState,
  AccessDeniedState,
  DownloadReadyState,
} from "./components";

export default function FilePage() {
  const params = useParams();
  const fileAccessId = params.id as string;
  const account = useCurrentAccount();
  const autoConnectStatus = useAutoConnectWallet();

  const { isLoading, canDownload, error, isDownloading, downloadFile, hasCheckedWithWallet } =
    useFileAccess(fileAccessId);

  // Show loading if:
  // 1. Hook is loading, OR
  // 2. Wallet is still auto-connecting, OR
  // 3. We have a wallet connected but haven't completed a check with it yet
  const isWalletConnecting = autoConnectStatus === "idle";
  const needsWalletCheck = account && !hasCheckedWithWallet;
  const showLoading = isLoading || isWalletConnecting || needsWalletCheck;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="p-8">
            {showLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} />
            ) : !account ? (
              <ConnectWalletState />
            ) : !canDownload ? (
              <AccessDeniedState />
            ) : (
              <DownloadReadyState
                isDownloading={isDownloading}
                onDownload={downloadFile}
              />
            )}
          </Card>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground break-all">
              File ID: {fileAccessId}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
