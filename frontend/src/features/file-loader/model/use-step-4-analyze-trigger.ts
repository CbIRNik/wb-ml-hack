"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { analyzeProductCard } from "@/shared/api";
import {
  selectCanAnalyze,
  selectDraftSnapshot,
  selectHasReadyAnalysisForSnapshot,
} from "./selectors";
import { useFileLoaderState } from "./use-file-loader-state";
import { getSnapshotKey } from "./utils";

export function useStep4AnalyzeTrigger() {
  const {
    currentStep,
    title,
    description,
    images,
    analysis,
    analysisKey,
    analysisPromise,
    startAnalysis,
    resolveAnalysis,
    rejectAnalysis,
  } = useFileLoaderState();

  useEffect(() => {
    if (currentStep !== 4) {
      return;
    }

    if (!selectCanAnalyze(title, description, images)) {
      return;
    }

    const snapshot = selectDraftSnapshot(title, description, images);
    const snapshotKey = getSnapshotKey(snapshot);

    if (analysisPromise && analysisKey === snapshotKey) {
      return;
    }

    if (selectHasReadyAnalysisForSnapshot(analysis, analysisKey, snapshotKey)) {
      return;
    }

    const promise = Promise.all(
      images.map(async (image) => ({
        id: image.id,
        name: image.name,
        size: image.size,
        src: await readFileAsDataUrl(image.file),
      })),
    ).then((preparedImages) =>
      analyzeProductCard(
        {
          title: snapshot.title,
          description: snapshot.description,
          images: preparedImages,
        },
        { latencyMs: 1100 },
      ),
    );

    startAnalysis(snapshot, snapshotKey, promise);

    promise
      .then((result) => {
        resolveAnalysis(snapshotKey, result);
        toast.success("Результат готов");
      })
      .catch((error) => {
        rejectAnalysis(
          snapshotKey,
          error instanceof Error
            ? error.message
            : "Не удалось оценить карточку",
        );
      });
  }, [
    analysis,
    analysisKey,
    analysisPromise,
    currentStep,
    description,
    images,
    rejectAnalysis,
    resolveAnalysis,
    startAnalysis,
    title,
  ]);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(file);
  });
}
