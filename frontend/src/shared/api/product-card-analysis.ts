import { analyzeProductCardInputSchema } from "@/features/file-loader/model/schema";

type AnalyzeProductCardImageInput = {
  id: string;
  name: string;
  size: number;
  src?: string;
  alt?: string;
  caption?: string;
};

type AnalyzeProductCardPayload = {
  title: string;
  description: string;
  images: AnalyzeProductCardImageInput[];
};

type AnalyzeProductCardRankedImage = {
  id: string;
  score: number;
  reason: string;
};

type AnalyzeProductCardResult = {
  overallScore: number;
  rankedImages: AnalyzeProductCardRankedImage[];
  suggestedDescription: string;
  suggestedOverallScore: number;
  suggestedRankedImages: AnalyzeProductCardRankedImage[];
  recommendations: string[];
};

type AnalyzeProductCardOptions = {
  latencyMs?: number;
};

type ProductCardAnalysisApi = {
  analyze: (
    payload: AnalyzeProductCardPayload,
    options?: AnalyzeProductCardOptions,
  ) => Promise<AnalyzeProductCardResult>;
};

const analyzeProductCard = async (
  payload: AnalyzeProductCardPayload,
  options?: AnalyzeProductCardOptions,
): Promise<AnalyzeProductCardResult> => {
  const validatedPayload = analyzeProductCardInputSchema.parse(payload);
  return productCardAnalysisApi.analyze(validatedPayload, options);
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

const createHttpProductCardAnalysisApi = (): ProductCardAnalysisApi => ({
  analyze: async (payload, options) => {
    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Math.max(2_000, options?.latencyMs ?? 0) + 8_000,
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      return (await response.json()) as AnalyzeProductCardResult;
    } finally {
      window.clearTimeout(timeout);
    }
  },
});

const productCardAnalysisApi = createHttpProductCardAnalysisApi();

export {
  analyzeProductCard,
  productCardAnalysisApi,
};

export type {
  AnalyzeProductCardImageInput,
  AnalyzeProductCardOptions,
  AnalyzeProductCardPayload,
  AnalyzeProductCardRankedImage,
  AnalyzeProductCardResult,
  ProductCardAnalysisApi,
};
