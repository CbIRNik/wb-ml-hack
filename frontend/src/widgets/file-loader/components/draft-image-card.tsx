import { Trash2 } from "lucide-react";
import Image from "next/image";
import type { ProductImage } from "@/entities/file-loader/model";
import { getScoreBadgeStyle } from "@/features/file-loader/model";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

type DraftImageCardProps = {
  image: ProductImage;
  index: number;
  isActive: boolean;
  score: number | null;
  onSelect: () => void;
  onRemove: () => void;
};

export function DraftImageCard({
  image,
  index,
  isActive,
  score,
  onSelect,
  onRemove,
}: DraftImageCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border text-left transition-colors",
        isActive
          ? "border-foreground"
          : "border-border hover:border-foreground/30",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="relative aspect-4/3 w-full">
          <Image
            src={image.previewUrl}
            alt={image.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover"
          />
        </div>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <Badge variant="outline">#{index + 1}</Badge>
          {score !== null ? (
            <div
              className="rounded-full px-2 py-1 text-xs font-medium"
              style={getScoreBadgeStyle(score)}
            >
              {score}%
            </div>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 pr-10 text-white">
          <span className="truncate text-xs">{image.name}</span>
        </div>
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить ${image.name}`}
        className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white transition-colors hover:bg-black/60"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
