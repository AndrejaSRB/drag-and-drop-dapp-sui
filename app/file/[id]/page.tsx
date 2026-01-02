"use client";

import { useParams } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
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

  const {
    isLoading,
    canDownload,
    fileMetadata,
    error,
    isDownloading,
    downloadFile,
  } = useFileAccess(fileAccessId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <Card className="p-8">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} />
            ) : !account ? (
              <ConnectWalletState />
            ) : !canDownload ? (
              <AccessDeniedState />
            ) : (
              <DownloadReadyState
                fileName={fileMetadata?.name}
                fileSize={fileMetadata?.size}
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
