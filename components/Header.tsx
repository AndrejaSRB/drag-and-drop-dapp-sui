"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import Link from "next/link";
import { FileUp } from "lucide-react";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileUp className="h-6 w-6" />
          <span className="font-semibold text-lg">SecureShare</span>
        </Link>

        <ConnectButton />
      </div>
    </header>
  );
}
