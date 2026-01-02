"use client";

import { useState } from "react";
import { Plus, Trash2, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PrivateAccess {
  address: string;
  expiresAt: number; // timestamp in ms (0 = never)
}

interface UploadOptionsProps {
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
  accessList: PrivateAccess[];
  onAccessListChange: (accessList: PrivateAccess[]) => void;
}

export function UploadOptions({
  isPublic,
  onIsPublicChange,
  accessList,
  onAccessListChange,
}: UploadOptionsProps) {
  const [newAddress, setNewAddress] = useState("");
  const [newExpiry, setNewExpiry] = useState(""); // datetime-local value

  const handleAddAddress = () => {
    if (!newAddress.trim()) {
      toast.error("Please enter an address");
      return;
    }

    // Validate Sui address format (0x followed by 64 hex characters)
    const isValidSuiAddress = /^0x[a-fA-F0-9]{64}$/.test(newAddress.trim());
    if (!isValidSuiAddress) {
      toast.error("Invalid Sui address. Must be 0x followed by 64 hex characters.");
      return;
    }

    // Check for duplicate
    if (accessList.some((a) => a.address === newAddress.trim())) {
      toast.error("This address is already in the list");
      return;
    }

    // Calculate expiry timestamp
    let expiresAt = 0;
    if (newExpiry) {
      expiresAt = new Date(newExpiry).getTime();
    } else {
      // Default: 10 minutes from now
      expiresAt = Date.now() + 10 * 60 * 1000;
    }

    onAccessListChange([
      ...accessList,
      { address: newAddress.trim(), expiresAt },
    ]);
    setNewAddress("");
    setNewExpiry("");
  };

  const handleRemoveAddress = (address: string) => {
    onAccessListChange(accessList.filter((a) => a.address !== address));
  };

  const formatExpiry = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Public/Private Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Globe className="h-4 w-4 text-green-600" />
          ) : (
            <Lock className="h-4 w-4 text-yellow-600" />
          )}
          <Label htmlFor="access-mode" className="font-medium">
            {isPublic ? "Public Access" : "Private Access"}
          </Label>
        </div>
        <Switch
          id="access-mode"
          checked={isPublic}
          onCheckedChange={onIsPublicChange}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {isPublic
          ? "Anyone with the link can download this file."
          : "Only specified wallet addresses can download this file."}
      </p>

      {/* Address Inputs (only shown for private) */}
      {!isPublic && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Allowed Addresses</Label>

          {/* Add new address */}
          <div className="flex gap-2">
            <Input
              placeholder="0x... (Sui address)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Input
              type="datetime-local"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-48"
              title="Expiry date (leave empty for 10 min default)"
            />
            <Button size="icon" variant="outline" onClick={handleAddAddress}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave expiry empty for default 10 minutes.
          </p>

          {/* List of added addresses */}
          {accessList.length > 0 && (
            <div className="space-y-2">
              {accessList.map((access) => (
                <div
                  key={access.address}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="space-y-1">
                    <code className="text-sm font-mono">
                      {truncateAddress(access.address)}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Expires: {formatExpiry(access.expiresAt)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveAddress(access.address)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {accessList.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No addresses added yet. Add at least one address for private
              files.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
