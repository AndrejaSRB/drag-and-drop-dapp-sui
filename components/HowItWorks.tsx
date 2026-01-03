"use client";

import { Lock, Upload, Shield, Key } from "lucide-react";

export function HowItWorks() {
  return (
    <div className="pt-8 border-t">
      <h2 className="text-xl font-semibold mb-6">How it works</h2>
      <div className="grid grid-cols-2 gap-4 md:gap-6 text-left">
        {/* Step 1: Encrypt */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50 col-span-1">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-primary">1</div>
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-medium">Encrypt</h3>
          <p className="text-sm text-muted-foreground">
            File is encrypted client-side using Seal threshold encryption
          </p>
        </div>

        {/* Step 2: Store */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50 col-span-1">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-primary">2</div>
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-medium">Store</h3>
          <p className="text-sm text-muted-foreground">
            Encrypted blob stored on Walrus decentralized storage
          </p>
        </div>

        {/* Step 3: Register */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50 col-span-1">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-primary">3</div>
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-medium">Register</h3>
          <p className="text-sm text-muted-foreground">
            Access permissions recorded on Sui blockchain
          </p>
        </div>

        {/* Step 4: Decrypt */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50 col-span-1">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-primary">4</div>
            <Key className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-medium">Decrypt</h3>
          <p className="text-sm text-muted-foreground">
            Key servers verify access on-chain before releasing decryption keys
          </p>
        </div>
      </div>
    </div>
  );
}
