"use client";

import { use } from "react";
import type { AnalyzeProductCardResult } from "@/shared/api";

export function useAnalysisResult(
  analysis: AnalyzeProductCardResult | null,
  analysisPromise: Promise<AnalyzeProductCardResult> | null,
) {
  if (analysisPromise) {
    return use(analysisPromise);
  }

  if (!analysis) {
    throw new Error("Результат недоступен");
  }

  return analysis;
}
