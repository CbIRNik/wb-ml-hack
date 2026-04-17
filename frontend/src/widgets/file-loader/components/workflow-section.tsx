import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  getScoreBadgeStyle,
  isStepComplete,
  revealTransition,
  surfaceClassName,
  useFileLoaderController,
  useStep4AnalyzeTrigger,
  workflowSteps,
} from "@/features/file-loader/model";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { ResultSection } from "./result-section";
import { StepDescriptionContent } from "./step-description-content";
import { StepImagesContent } from "./step-images-content";
import { StepTitleContent } from "./step-title-content";

export function WorkflowSection() {
  useStep4AnalyzeTrigger();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStep, setPendingStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const {
    analysis,
    analysisPromise,
    currentStep,
    description,
    goToPreviousStep,
    handleCommitSuggestedResult,
    handleNextStep,
    handleStepChange,
    hasPendingSuggestedResult,
    isRefreshingAnalysis,
    images,
    resultSelectedVariant,
    selectedResultOverallScore,
    title,
  } = useFileLoaderController();

  return (
    <section className={cn(surfaceClassName, "p-4 md:p-5")}>
      <ol className="grid gap-2 md:grid-cols-4">
        {workflowSteps.map((step) => {
          const isActive = currentStep === step.id;
          const isComplete = isStepComplete(
            step.id,
            title,
            description,
            images,
            Boolean(analysis),
          );

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  if (
                    currentStep === 4 &&
                    step.id !== 4 &&
                    hasPendingSuggestedResult
                  ) {
                    setPendingStep(step.id);
                    setIsConfirmOpen(true);
                    return;
                  }

                  handleStepChange(step.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  isActive
                    ? "border-foreground bg-muted/30"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                    isComplete
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : step.id}
                </span>
                <span className="block text-sm font-medium">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {currentStep === 1 ? (
            <motion.div
              key="step-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={revealTransition}
              className="flex flex-col gap-4"
            >
              <StepTitleContent />
            </motion.div>
          ) : null}

          {currentStep === 2 ? (
            <motion.div
              key="step-description"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={revealTransition}
              className="flex flex-col gap-4"
            >
              <StepDescriptionContent />
            </motion.div>
          ) : null}

          {currentStep === 3 ? (
            <motion.div
              key="step-images"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={revealTransition}
              className="flex flex-col gap-4"
            >
              <StepImagesContent />
            </motion.div>
          ) : null}

          {currentStep === 4 ? (
            <motion.div
              key="step-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={revealTransition}
              className="flex flex-col gap-4"
            >
              <ResultSection />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={() => {
            if (currentStep !== 4 || !hasPendingSuggestedResult) {
              goToPreviousStep();
              return;
            }

            setPendingStep(Math.max(1, currentStep - 1) as 1 | 2 | 3 | 4);
            setIsConfirmOpen(true);
          }}
          disabled={currentStep === 1}
        >
          <ChevronLeft data-icon="inline-start" />
          Назад
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNextStep}>
            Далее
            <ChevronRight data-icon="inline-end" />
          </Button>
        ) : analysis ? (
          <Badge
            className={cn(
              "h-8 rounded-full px-2.5 text-[0.8rem] font-medium",
              isRefreshingAnalysis && "animate-pulse opacity-70",
            )}
            style={getScoreBadgeStyle(
              selectedResultOverallScore ?? analysis.overallScore,
            )}
          >
            {isRefreshingAnalysis
              ? "Пересчет..."
              : `${selectedResultOverallScore ?? analysis.overallScore}%`}
          </Badge>
        ) : analysisPromise ? (
          <Skeleton className="h-8 w-16 rounded-full" />
        ) : null}
      </div>

      <ResultDraftConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);

          if (!open) {
            setPendingStep(null);
          }
        }}
        onConfirm={() => {
          setIsConfirmOpen(false);
          const nextStep =
            pendingStep ?? (Math.max(1, currentStep - 1) as 1 | 2 | 3 | 4);

          handleStepChange(nextStep);
          handleCommitSuggestedResult();
          setPendingStep(null);
        }}
        nextDescription={
          resultSelectedVariant === "suggested"
            ? (analysis?.suggestedDescription ?? null)
            : null
        }
      />
    </section>
  );
}

type ResultDraftConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  nextDescription: string | null;
};

function ResultDraftConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  nextDescription,
}: ResultDraftConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Заменить исходное описание</AlertDialogTitle>
          <AlertDialogDescription>
            При выходе из результата исходное описание будет полностью
            перезаписано вариантом ИИ и станет новым исходником.
          </AlertDialogDescription>

          {nextDescription ? (
            <div className="mt-4 grid gap-2 rounded-2xl bg-muted/20 p-3 text-sm text-muted-foreground">
              <div className="line-clamp-4 whitespace-pre-wrap">
                {nextDescription}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Остаться
            </Button>
            <Button onClick={onConfirm}>Заменить</Button>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
