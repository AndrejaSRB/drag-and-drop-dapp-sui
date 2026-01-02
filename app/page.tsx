"use client";

import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Header } from "@/components/Header";
import { DropZone } from "@/components/DropZone";
import { useFileUpload } from "@/app/hooks/useFileUpload";

export default function HomePage() {
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);

  const account = useCurrentAccount();
  const { isUploading, uploadProgress, uploadFile } = useFileUpload();

  const handleFileUpload = async (
    file: File,
    isPublic: boolean,
    accessList: { address: string; expiresAt: number }[]
  ) => {
    const result = await uploadFile(file, isPublic, accessList);

    if (result) {
      setUploadedFileId(result.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Secure File Sharing
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload files to decentralized storage and control who can access
              them using blockchain-based permissions.
            </p>
          </div>

          {!account ? (
            <div className="p-8 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">
                Connect your Sui wallet to start uploading files
              </p>
            </div>
          ) : (
            <>
              <DropZone
                onFileSelect={handleFileUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />

              {/* Show shareable link after upload */}
              {uploadedFileId && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Shareable link:
                  </p>
                  <code className="text-sm bg-background p-2 rounded block break-all">
                    {typeof window !== "undefined" && window.location.origin}/file/{uploadedFileId}
                  </code>
                </div>
              )}
            </>
          )}

          <div className="pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">1</div>
                <h3 className="font-medium">Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Files are stored on Walrus decentralized storage
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">2</div>
                <h3 className="font-medium">Share</h3>
                <p className="text-sm text-muted-foreground">
                  Grant access to specific wallet addresses with expiration
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">3</div>
                <h3 className="font-medium">Control</h3>
                <p className="text-sm text-muted-foreground">
                  Revoke access anytime, blockchain verifies permissions
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
