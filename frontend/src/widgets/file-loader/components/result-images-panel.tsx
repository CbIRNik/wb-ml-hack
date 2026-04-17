import type { ProductImage, ResultVariant } from "@/entities/file-loader/model";
import { getImageScore } from "@/features/file-loader/model";
import type { AnalyzeProductCardResult } from "@/shared/api";
import { ResultImageCard } from "./result-image-card";

type ResultImagesPanelProps = {
  analysis: AnalyzeProductCardResult;
  images: ProductImage[];
  selectedVariant: ResultVariant;
  isRefreshing?: boolean;
};

export function ResultImagesPanel({
  analysis,
  images,
  selectedVariant,
  isRefreshing = false,
}: ResultImagesPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ul className="grid h-full min-h-0 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {images.map((image, index) => (
          <li key={image.id}>
            <ResultImageCard
              image={image}
              rank={index + 1}
              score={getImageScore(analysis, image.id, selectedVariant)}
              isRefreshing={isRefreshing}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
