"use client";

import { useShallow } from "zustand/react/shallow";

import { useFileLoaderStore } from "@/entities/file-loader/model";

export function useFileLoaderState() {
  return useFileLoaderStore(
    useShallow((state) => ({
      currentStep: state.currentStep,
      title: state.title,
      description: state.description,
      images: state.images,
      activeImageId: state.activeImageId,
      analysis: state.analysis,
      analysisPromise: state.analysisPromise,
      analysisKey: state.analysisKey,
      resultBaselineDraft: state.resultBaselineDraft,
      resultSelectedVariant: state.resultSelectedVariant,
      lastAnalyzedDraft: state.lastAnalyzedDraft,
      status: state.status,
      errorMessage: state.errorMessage,
      setStep: state.setStep,
      goToNextStep: state.goToNextStep,
      goToPreviousStep: state.goToPreviousStep,
      setTitle: state.setTitle,
      setDescription: state.setDescription,
      replaceDraftContent: state.replaceDraftContent,
      appendImages: state.appendImages,
      removeImage: state.removeImage,
      setActiveImage: state.setActiveImage,
      setResultSelectedVariant: state.setResultSelectedVariant,
      clearDraft: state.clearDraft,
      startAnalysis: state.startAnalysis,
      resolveAnalysis: state.resolveAnalysis,
      rejectAnalysis: state.rejectAnalysis,
      resetAnalysis: state.resetAnalysis,
      dismissError: state.dismissError,
    })),
  );
}
