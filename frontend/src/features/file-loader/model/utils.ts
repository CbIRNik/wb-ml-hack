import type {
  DraftSnapshot,
  ProductImage,
  ResultVariant,
  WorkflowStep,
} from "@/entities/file-loader/model";
import type { AnalyzeProductCardResult } from "@/shared/api";
import {
  fileLoaderDescriptionSchema,
  fileLoaderImagesSchema,
  fileLoaderTitleSchema,
} from "./schema";

export function isStepComplete(
  step: WorkflowStep,
  title: string,
  description: string,
  images: ProductImage[],
  hasAnalysis: boolean,
) {
  if (step === 1) {
    return fileLoaderTitleSchema.safeParse(title).success;
  }

  if (step === 2) {
    return fileLoaderDescriptionSchema.safeParse(description).success;
  }

  if (step === 3) {
    return fileLoaderImagesSchema.safeParse(images).success;
  }

  return hasAnalysis;
}

export function buildSnapshot(
  title: string,
  description: string,
  images: ProductImage[],
): DraftSnapshot {
  return {
    title: title.trim(),
    description: description.trim(),
    imageIds: images.map((image) => image.id),
  };
}

export function getSnapshotKey(snapshot: DraftSnapshot) {
  return JSON.stringify([
    snapshot.title,
    snapshot.description,
    snapshot.imageIds,
  ]);
}

export function getSortedImages(
  images: ProductImage[],
  analysis: AnalyzeProductCardResult | null,
  imageLookup: Map<string, ProductImage>,
  variant: ResultVariant = "original",
) {
  if (!analysis) {
    return images;
  }

  const rankedImages = getRankedImagesForVariant(analysis, variant)
    .map((rankedImage) => imageLookup.get(rankedImage.id))
    .filter((image): image is ProductImage => Boolean(image));

  const unrankedImages = images.filter(
    (image) =>
      !getRankedImagesForVariant(analysis, variant).some(
        (rankedImage) => rankedImage.id === image.id,
      ),
  );

  return [...rankedImages, ...unrankedImages];
}

export function getRankedImagesForVariant(
  analysis: AnalyzeProductCardResult,
  variant: ResultVariant,
) {
  return variant === "suggested"
    ? analysis.suggestedRankedImages
    : analysis.rankedImages;
}

export function getImageScore(
  analysis: AnalyzeProductCardResult,
  imageId: string,
  variant: ResultVariant = "original",
) {
  return (
    getRankedImagesForVariant(analysis, variant).find(
      (image) => image.id === imageId,
    )?.score ?? 0
  );
}

export function getOverallScoreForVariant(
  analysis: AnalyzeProductCardResult,
  variant: ResultVariant,
) {
  return variant === "suggested"
    ? analysis.suggestedOverallScore
    : analysis.overallScore;
}

export function getScoreBadgeStyle(score: number) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const hue = Math.round((clampedScore / 100) * 152);
  const saturation = Math.round(82 - clampedScore * 0.08);
  const lightness = Math.round(53 - clampedScore * 0.05);
  const textColor =
    clampedScore >= 42 && clampedScore <= 72 ? "oklch(0.19 0 0)" : "white";

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    color: textColor,
  };
}

export function getOverallSummary(overallScore: number) {
  if (overallScore >= 80) {
    return "Связка сильная.";
  }

  if (overallScore >= 60) {
    return "Связка рабочая, но не плотная.";
  }

  if (overallScore >= 35) {
    return "Связка частичная.";
  }

  return "Связка слабая.";
}
