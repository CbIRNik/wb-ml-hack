import Image from "next/image";
import type { ProductImage } from "@/entities/file-loader/model";
import { getScoreBadgeStyle } from "@/features/file-loader/model";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

type ResultImageCardProps = {
  image: ProductImage;
  rank: number;
  score?: number;
  isRefreshing?: boolean;
};

export function ResultImageCard({
  image,
  rank,
  score,
  isRefreshing = false,
}: ResultImageCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={image.previewUrl}
          alt={image.name}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <Badge variant="outline">#{rank}</Badge>
        {score !== undefined ? (
          <div
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              isRefreshing && "animate-pulse opacity-60",
            )}
            style={getScoreBadgeStyle(score)}
          >
            {isRefreshing ? "..." : `${score}%`}
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
        <div className="truncate text-sm font-medium">{image.name}</div>
      </div>
    </div>
  );
}
