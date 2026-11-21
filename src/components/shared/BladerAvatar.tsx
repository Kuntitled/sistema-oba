"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "cn";

interface BladerAvatarProps {
  avatarUrl?: string | null;
  nickname?: string | null;
  sizeClass?: string;
  textClass?: string;
  borderClass?: string;
  className?: string;
}

function isRenderableAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  );
}

export function BladerAvatar({
  avatarUrl,
  nickname,
  sizeClass = "h-10 w-10",
  textClass = "text-xs font-bold text-primary",
  borderClass = "border border-border/60",
  className,
}: BladerAvatarProps) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const initials = (nickname?.trim() || "BX").slice(0, 2).toUpperCase();
  const safeUrl = isRenderableAvatarUrl(avatarUrl) ? avatarUrl.trim() : null;
  const showImage = Boolean(safeUrl && failedUrl !== safeUrl);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-muted shrink-0",
        sizeClass,
        borderClass,
        className
      )}
    >
      {showImage && safeUrl ? (
        <Image
          src={safeUrl}
          alt={nickname || "Avatar do Blader"}
          fill
          unoptimized
          onError={() => setFailedUrl(safeUrl)}
          className="object-cover"
        />
      ) : (
        <div
          className={cn(
            "h-full w-full flex items-center justify-center bg-primary/10 select-none",
            textClass
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
