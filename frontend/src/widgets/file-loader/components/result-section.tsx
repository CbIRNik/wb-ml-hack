"use client"

import { motion } from "framer-motion"
import { RefreshCcw } from "lucide-react"
import { Suspense } from "react"
import type { ResultVariant } from "@/entities/file-loader/model"
import {
  revealTransition,
  useAnalysisResult,
  useFileLoaderController,
} from "@/features/file-loader/model"
import { Button } from "@/shared/ui/button"
import { ResultDescriptionPanel } from "./result-description-panel"
import { ResultImagesPanel } from "./result-images-panel"
import { ResultSkeleton } from "./result-skeleton"

export function ResultSection() {
  const {
    analysis,
    analysisPromise,
    errorMessage,
    handleRetryAnalysis,
    handleSelectResultVariant,
    resultBaselineDraft,
    resultSelectedVariant,
    sortedImages,
    isRefreshingAnalysis,
  } = useFileLoaderController()

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...revealTransition, delay: 0.04 }}
      className="py-1"
    >
      {errorMessage ? (
        <div className="grid gap-4 rounded-2xl bg-muted/20 p-4">
          <div className="text-sm font-medium">
            Не удалось получить результат
          </div>
          <div className="text-sm text-muted-foreground">{errorMessage}</div>
          <div>
            <Button variant="outline" onClick={handleRetryAnalysis}>
              <RefreshCcw data-icon="inline-start" />
              Повторить
            </Button>
          </div>
        </div>
      ) : analysis ? (
        <ResolvedResultContent
          resolvedAnalysis={analysis}
          baselineDraft={resultBaselineDraft}
          selectedVariant={resultSelectedVariant}
          sortedImages={sortedImages}
          isRefreshing={isRefreshingAnalysis}
          onSelectResultVariant={handleSelectResultVariant}
        />
      ) : !analysis && !analysisPromise ? (
        <ResultSkeleton />
      ) : (
        <Suspense fallback={<ResultSkeleton />}>
          <InitialResultContent
            analysisPromise={analysisPromise}
            baselineDraft={resultBaselineDraft}
            selectedVariant={resultSelectedVariant}
            sortedImages={sortedImages}
            isRefreshing={false}
            onSelectResultVariant={handleSelectResultVariant}
          />
        </Suspense>
      )}
    </motion.section>
  )
}

type ResultContentProps = {
  baselineDraft: ReturnType<
    typeof useFileLoaderController
  >["resultBaselineDraft"]
  selectedVariant: ResultVariant
  sortedImages: ReturnType<typeof useFileLoaderController>["sortedImages"]
  isRefreshing: boolean
  onSelectResultVariant: ReturnType<
    typeof useFileLoaderController
  >["handleSelectResultVariant"]
}

type InitialResultContentProps = ResultContentProps & {
  analysisPromise: ReturnType<typeof useFileLoaderController>["analysisPromise"]
}

function InitialResultContent({
  analysisPromise,
  baselineDraft,
  selectedVariant,
  sortedImages,
  isRefreshing,
  onSelectResultVariant,
}: InitialResultContentProps) {
  const resolvedAnalysis = useAnalysisResult(null, analysisPromise)

  return (
    <ResolvedResultContent
      resolvedAnalysis={resolvedAnalysis}
      baselineDraft={baselineDraft}
      selectedVariant={selectedVariant}
      sortedImages={sortedImages}
      isRefreshing={isRefreshing}
      onSelectResultVariant={onSelectResultVariant}
    />
  )
}

type ResolvedResultContentProps = ResultContentProps & {
  resolvedAnalysis: NonNullable<
    ReturnType<typeof useFileLoaderController>["analysis"]
  >
}

function ResolvedResultContent({
  resolvedAnalysis,
  baselineDraft,
  selectedVariant,
  sortedImages,
  isRefreshing,
  onSelectResultVariant,
}: ResolvedResultContentProps) {
  if (!baselineDraft) {
    return <ResultSkeleton />
  }

  return (
    <div className="grid gap-6 xl:min-h-112 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-stretch">
      <div className="grid h-132 gap-3">
        <ResultImagesPanel
          analysis={resolvedAnalysis}
          images={sortedImages}
          selectedVariant={selectedVariant}
          isRefreshing={isRefreshing}
        />
      </div>

      <div className="self-start">
        <ResultDescriptionPanel
          analysis={resolvedAnalysis}
          baselineDraft={baselineDraft}
          selectedVariant={selectedVariant}
          isRefreshing={isRefreshing}
          onSelectVariant={onSelectResultVariant}
        />
      </div>
    </div>
  )
}
