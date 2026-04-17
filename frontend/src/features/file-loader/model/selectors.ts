import type {
  DraftSnapshot,
  ProductImage,
  WorkflowStep,
} from "@/entities/file-loader/model";
import type { AnalyzeProductCardResult } from "@/shared/api";
import {
  fileLoaderDescriptionSchema,
  fileLoaderDraftSchema,
  fileLoaderImagesSchema,
  fileLoaderTitleSchema,
} from "./schema";
import { buildSnapshot, getSnapshotKey } from "./utils";

export function selectCanContinueFromTitle(title: string) {
  return fileLoaderTitleSchema.safeParse(title).success;
}

export function selectCanContinueFromDescription(description: string) {
  return fileLoaderDescriptionSchema.safeParse(description).success;
}

export function selectCanAnalyze(
  title: string,
  description: string,
  images: ProductImage[],
) {
  return fileLoaderDraftSchema.safeParse({ title, description, images })
    .success;
}

export function selectDraftSnapshot(
  title: string,
  description: string,
  images: ProductImage[],
): DraftSnapshot {
  return buildSnapshot(title, description, images);
}

export function selectDraftSnapshotKey(
  title: string,
  description: string,
  images: ProductImage[],
) {
  return getSnapshotKey(selectDraftSnapshot(title, description, images));
}

export function selectHasReadyAnalysisForSnapshot(
  analysis: AnalyzeProductCardResult | null,
  analysisKey: string | null,
  snapshotKey: string,
) {
  return Boolean(analysis && analysisKey === snapshotKey);
}

export function selectCanMoveToStep(
  targetStep: WorkflowStep,
  title: string,
  description: string,
  images: ProductImage[],
) {
  if (targetStep === 1) {
    return true;
  }

  if (targetStep === 2) {
    return selectCanContinueFromTitle(title);
  }

  if (targetStep === 3) {
    return (
      selectCanContinueFromTitle(title) &&
      selectCanContinueFromDescription(description)
    );
  }

  return selectCanAnalyze(title, description, images);
}

export function selectStepValidationError(
  targetStep: WorkflowStep,
  title: string,
  description: string,
  images: ProductImage[],
) {
  if (targetStep === 1) {
    return null;
  }

  if (targetStep === 2) {
    return (
      fileLoaderTitleSchema.safeParse(title).error?.issues[0]?.message ?? null
    );
  }

  if (targetStep === 3) {
    return (
      fileLoaderDescriptionSchema.safeParse(description).error?.issues[0]
        ?.message ??
      fileLoaderTitleSchema.safeParse(title).error?.issues[0]?.message ??
      null
    );
  }

  return (
    fileLoaderImagesSchema.safeParse(images).error?.issues[0]?.message ??
    fileLoaderDescriptionSchema.safeParse(description).error?.issues[0]
      ?.message ??
    fileLoaderTitleSchema.safeParse(title).error?.issues[0]?.message ??
    null
  );
}
