"use client";

import Image from "next/image";
import { APP_FULL_NAME, LOGO_WORDMARK } from "@/lib/brand";

/**
 * Resting state for the AI output canvas, shown until the model produces its
 * first message. Deliberately holds nothing but the brand mark — no prompts,
 * no suggestions — so the canvas reads as empty rather than unstarted.
 */
export function CanvasEmptyState() {
  return (
    <div className="pointer-events-none flex h-full w-full items-center justify-center p-8">
      <Image
        alt={APP_FULL_NAME}
        className="h-auto w-[min(70%,26rem)] dark:invert"
        height={310}
        priority
        src={LOGO_WORDMARK}
        width={720}
      />
    </div>
  );
}
