"use client";

import { create } from "zustand";

import type { AnalyzeProductCardResult } from "@/shared/api";
import type {
  AnalysisPromise,
  AnalysisStatus,
  DraftSnapshot,
  ProductImage,
  ResultVariant,
  WorkflowStep,
} from "./types";

type FileLoaderState = {
  currentStep: WorkflowStep;
  title: string;
  description: string;
  images: ProductImage[];
  activeImageId: string | null;
  analysis: AnalyzeProductCardResult | null;
  analysisPromise: AnalysisPromise | null;
  analysisKey: string | null;
  resultBaselineDraft: DraftSnapshot | null;
  resultSelectedVariant: ResultVariant;
  lastAnalyzedDraft: DraftSnapshot | null;
  status: AnalysisStatus;
  errorMessage: string | null;
  setStep: (step: WorkflowStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  replaceDraftContent: (title: string, description: string) => void;
  appendImages: (images: ProductImage[]) => void;
  removeImage: (id: string) => void;
  setActiveImage: (id: string | null) => void;
  setResultSelectedVariant: (variant: ResultVariant) => void;
  clearDraft: () => void;
  startAnalysis: (
    snapshot: DraftSnapshot,
    key: string,
    promise: AnalysisPromise,
  ) => void;
  resolveAnalysis: (key: string, analysis: AnalyzeProductCardResult) => void;
  rejectAnalysis: (key: string, message: string) => void;
  resetAnalysis: () => void;
  dismissError: () => void;
};

const initialState = {
  currentStep: 1 as WorkflowStep,
  title: "",
  description: "",
  images: [],
  activeImageId: null,
  analysis: null,
  analysisPromise: null,
  analysisKey: null,
  resultBaselineDraft: null,
  resultSelectedVariant: "original" as ResultVariant,
  lastAnalyzedDraft: null,
  status: "idle",
  errorMessage: null,
} satisfies Pick<
  FileLoaderState,
  | "currentStep"
  | "title"
  | "description"
  | "images"
  | "activeImageId"
  | "analysis"
  | "analysisPromise"
  | "analysisKey"
  | "resultBaselineDraft"
  | "resultSelectedVariant"
  | "lastAnalyzedDraft"
  | "status"
  | "errorMessage"
>;

function getDraftResetState() {
  return {
    analysis: null,
    analysisPromise: null,
    analysisKey: null,
    resultSelectedVariant: "original" as ResultVariant,
    lastAnalyzedDraft: null,
    status: "idle" as AnalysisStatus,
    errorMessage: null,
  };
}

export const useFileLoaderStore = create<FileLoaderState>()((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  goToNextStep: () =>
    set((state) => ({
      currentStep: Math.min(4, state.currentStep + 1) as WorkflowStep,
    })),
  goToPreviousStep: () =>
    set((state) => ({
      currentStep: Math.max(1, state.currentStep - 1) as WorkflowStep,
    })),
  setTitle: (title) =>
    set(() => ({
      title,
      resultBaselineDraft: null,
      ...getDraftResetState(),
    })),
  setDescription: (description) =>
    set(() => ({
      description,
      resultBaselineDraft: null,
      ...getDraftResetState(),
    })),
  replaceDraftContent: (title, description) =>
    set(() => ({
      title,
      description,
      resultBaselineDraft: null,
      ...getDraftResetState(),
    })),
  appendImages: (images) =>
    set((state) => {
      const nextImages = [...state.images, ...images];

      return {
        images: nextImages,
        activeImageId: state.activeImageId ?? nextImages[0]?.id ?? null,
        resultBaselineDraft: null,
        ...getDraftResetState(),
      };
    }),
  removeImage: (id) =>
    set((state) => {
      const nextImages = state.images.filter((image) => image.id !== id);
      const nextActiveId =
        state.activeImageId === id
          ? (nextImages[0]?.id ?? null)
          : state.activeImageId;

      return {
        images: nextImages,
        activeImageId: nextActiveId,
        resultBaselineDraft: null,
        ...getDraftResetState(),
      };
    }),
  setActiveImage: (id) => set({ activeImageId: id }),
  setResultSelectedVariant: (variant) =>
    set({ resultSelectedVariant: variant }),
  clearDraft: () => set(initialState),
  startAnalysis: (snapshot, key, promise) =>
    set((state) => ({
      analysisPromise: promise,
      analysisKey: key,
      errorMessage: null,
      lastAnalyzedDraft: snapshot,
      resultBaselineDraft: state.resultBaselineDraft ?? snapshot,
      resultSelectedVariant: "original",
    })),
  resolveAnalysis: (key, analysis) =>
    set((state) =>
      state.analysisKey !== key
        ? state
        : {
            analysis,
            analysisPromise: null,
            status: "done",
            errorMessage: null,
            currentStep: 4,
            resultSelectedVariant: "original",
          },
    ),
  rejectAnalysis: (key, message) =>
    set((state) =>
      state.analysisKey !== key
        ? state
        : {
            analysisPromise: null,
            status: "error",
            errorMessage: message,
          },
    ),
  resetAnalysis: () => set(getDraftResetState()),
  dismissError: () =>
    set((state) => ({
      errorMessage: null,
      status: state.status === "error" ? "idle" : state.status,
    })),
}));
