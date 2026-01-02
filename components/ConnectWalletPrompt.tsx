"use client";

import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ConnectWalletPrompt() {
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your Sui wallet to start uploading files
          </p>
        </div>
      </div>
    </Card>
  );
}
