import type { WorkflowStep } from "@/entities/file-loader/model";

export const MIN_TITLE_LENGTH = 4;
export const MIN_DESCRIPTION_LENGTH = 24;
export const MAX_IMAGES = 24;

export const surfaceClassName =
  "rounded-2xl border border-border bg-background";

export const revealTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1],
} as const;

export const workflowSteps: Array<{
  id: WorkflowStep;
  title: string;
}> = [
  {
    id: 1,
    title: "Название",
  },
  {
    id: 2,
    title: "Описание",
  },
  {
    id: 3,
    title: "Картинки",
  },
  {
    id: 4,
    title: "Результат",
  },
];
