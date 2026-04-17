export type ProductImage = {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
};

export type DraftSnapshot = {
  title: string;
  description: string;
  imageIds: string[];
};

export type DraftField = "title" | "description";

export type ResultVariant = "original" | "suggested";

export type AnalysisStatus = "idle" | "done" | "error";

export type AnalysisPromise = Promise<
  import("@/shared/api").AnalyzeProductCardResult
>;

export type WorkflowStep = 1 | 2 | 3 | 4;
