"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Header } from "@/components/Header";
import { DropZone } from "@/components/DropZone";
import { UploadSuccess } from "@/components/UploadSuccess";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { HowItWorks } from "@/components/HowItWorks";
import { useUploadFlow } from "@/app/hooks/useUploadFlow";

export default function HomePage() {
  const account = useCurrentAccount();
  const {
    flowState,
    uploadResult,
    isUploading,
    uploadProgress,
    handleUpload,
    resetFlow,
  } = useUploadFlow();

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLogoClick={resetFlow} />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Header - only show in idle/uploading state */}
          {flowState !== "success" && (
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Secure File Sharing
              </h1>
              <p className="text-lg text-muted-foreground">
                Upload files to decentralized storage and control who can access
                them using blockchain-based permissions.
              </p>
            </div>
          )}

          {/* Main content based on state */}
          {!account ? (
            <ConnectWalletPrompt />
          ) : flowState === "success" && uploadResult ? (
            <UploadSuccess
              fileName={uploadResult.fileName}
              shareableLink={uploadResult.shareableLink}
              onUploadNew={resetFlow}
            />
          ) : (
            <DropZone
              onFileSelect={handleUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          )}

          {/* How it works - only show in idle state */}
          {flowState === "idle" && account && <HowItWorks />}
        </div>
      </main>
    </div>
  );
}
