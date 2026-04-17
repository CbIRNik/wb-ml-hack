"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { ProductImage } from "@/entities/file-loader/model";
import { MAX_IMAGES } from "./constants";
import {
  selectCanAnalyze,
  selectCanMoveToStep,
  selectDraftSnapshotKey,
  selectStepValidationError,
} from "./selectors";
import { useFileLoaderState } from "./use-file-loader-state";
import { getOverallScoreForVariant, getSortedImages } from "./utils";

function useCreateFileLoaderController() {
  const {
    currentStep,
    title,
    description,
    images,
    activeImageId,
    analysis,
    analysisPromise,
    analysisKey,
    resultBaselineDraft,
    resultSelectedVariant,
    lastAnalyzedDraft,
    status,
    errorMessage,
    goToPreviousStep,
    setTitle,
    setDescription,
    replaceDraftContent,
    appendImages,
    removeImage,
    setActiveImage,
    setResultSelectedVariant,
    clearDraft,
    resetAnalysis,
    setStep,
  } = useFileLoaderState();
  const previewRegistryRef = useRef(new Map<string, string>());

  const imageLookup = useMemo(
    () => new Map(images.map((image) => [image.id, image])),
    [images],
  );
  const sortedImages = useMemo(
    () => getSortedImages(images, analysis, imageLookup, resultSelectedVariant),
    [analysis, imageLookup, images, resultSelectedVariant],
  );
  const activeImage = useMemo(
    () => imageLookup.get(activeImageId ?? "") ?? images[0] ?? null,
    [activeImageId, imageLookup, images],
  );
  const canAnalyze = selectCanAnalyze(title, description, images);
  const draftSnapshotKey = selectDraftSnapshotKey(title, description, images);
  const isRefreshingAnalysis = Boolean(analysis && analysisPromise);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [],
    },
    multiple: true,
    maxFiles: MAX_IMAGES,
    onDrop: (acceptedFiles) => {
      const remainingSlots = Math.max(0, MAX_IMAGES - images.length);

      if (remainingSlots === 0) {
        toast.error(`Лимит ${MAX_IMAGES} изображений`);
        return;
      }

      const nextImages = acceptedFiles.slice(0, remainingSlots).map((file) => {
        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        previewRegistryRef.current.set(id, previewUrl);

        return {
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
        } satisfies ProductImage;
      });

      startTransition(() => {
        appendImages(nextImages);
      });

      if (nextImages.length > 0) {
        toast.success("Изображения добавлены");
      }
    },
    onDropRejected: () => {
      toast.error("Нужны только изображения");
    },
  });

  useEffect(() => {
    return () => {
      previewRegistryRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
      previewRegistryRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    toast.error(errorMessage);
  }, [errorMessage]);

  const handleRemoveImage = (imageId: string) => {
    const previewUrl = previewRegistryRef.current.get(imageId);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewRegistryRef.current.delete(imageId);
    }

    removeImage(imageId);
  };

  const handleReset = () => {
    previewRegistryRef.current.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });
    previewRegistryRef.current.clear();
    clearDraft();
  };

  const handleStepChange = (targetStep: 1 | 2 | 3 | 4) => {
    if (!selectCanMoveToStep(targetStep, title, description, images)) {
      toast.error(
        selectStepValidationError(targetStep, title, description, images) ??
          "Проверь форму",
      );
      return false;
    }

    setStep(targetStep);
    return true;
  };

  const handleNextStep = () => {
    handleStepChange(Math.min(4, currentStep + 1) as 1 | 2 | 3 | 4);
  };

  const handleRetryAnalysis = () => {
    resetAnalysis();
    setStep(4);
  };

  const handleSelectResultVariant = (variant: "original" | "suggested") => {
    setResultSelectedVariant(variant);
  };

  const hasPendingSuggestedResult =
    resultSelectedVariant === "suggested" &&
    Boolean(analysis?.suggestedDescription);

  const handleCommitSuggestedResult = () => {
    if (!analysis?.suggestedDescription || !resultBaselineDraft) {
      return false;
    }

    replaceDraftContent(
      resultBaselineDraft.title,
      analysis.suggestedDescription,
    );
    return true;
  };

  const selectedResultOverallScore = analysis
    ? getOverallScoreForVariant(analysis, resultSelectedVariant)
    : null;

  return {
    currentStep,
    title,
    description,
    images,
    activeImage,
    analysis,
    analysisPromise,
    analysisKey,
    resultBaselineDraft,
    resultSelectedVariant,
    lastAnalyzedDraft,
    status,
    errorMessage,
    sortedImages,
    draftSnapshotKey,
    canAnalyze,
    hasPendingSuggestedResult,
    isRefreshingAnalysis,
    selectedResultOverallScore,
    setTitle,
    setDescription,
    setActiveImage,
    goToPreviousStep,
    handleStepChange,
    handleRemoveImage,
    handleReset,
    handleNextStep,
    handleRetryAnalysis,
    handleSelectResultVariant,
    handleCommitSuggestedResult,
    getRootProps,
    getInputProps,
    isDragActive,
  };
}

type FileLoaderControllerValue = ReturnType<
  typeof useCreateFileLoaderController
>;

const FileLoaderControllerContext =
  createContext<FileLoaderControllerValue | null>(null);

export function FileLoaderControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useCreateFileLoaderController();

  return createElement(
    FileLoaderControllerContext.Provider,
    { value },
    children,
  );
}

export function useFileLoaderController() {
  const context = useContext(FileLoaderControllerContext);

  if (!context) {
    throw new Error("useFileLoaderController must be used within provider");
  }

  return context;
}
