"use client";

import { useState } from "react";
import { Check, Copy, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadSuccessProps {
  fileName: string;
  shareableLink: string;
  onUploadNew: () => void;
}

export function UploadSuccess({
  fileName,
  shareableLink,
  onUploadNew,
}: UploadSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="p-8 text-center space-y-6">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Upload Complete!</h2>
        <p className="text-sm text-muted-foreground">
          {fileName} has been secured on the blockchain
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Shareable Link</p>
        <div className="flex gap-2">
          <code className="flex-1 text-sm bg-muted p-3 rounded-md break-all text-left">
            {shareableLink}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Button onClick={onUploadNew} variant="outline" className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        Upload Another File
      </Button>
    </Card>
  );
}
