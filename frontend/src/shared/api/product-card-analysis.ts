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
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

const createMockProductCardAnalysisApi = (): ProductCardAnalysisApi => ({
  analyze: async (payload, options) => {
    const latencyMs = options?.latencyMs ?? 900;

    await new Promise((resolve) => {
      window.setTimeout(resolve, latencyMs);
    });

    const normalizedTitle = payload.title.trim();
    const normalizedDescription = payload.description.trim();

    const buildRankedImages = (
      sourceText: string,
      {
        scoreBoost = 0,
        strongReason,
        midReason,
        weakReason,
        lowReason,
      }: {
        scoreBoost?: number;
        strongReason: string;
        midReason: string;
        weakReason: string;
        lowReason: string;
      },
    ) => {
      const tokens = sourceText
        .toLowerCase()
        .split(/[^a-zа-я0-9]+/i)
        .map((token) => token.trim())
        .filter(Boolean);

      return payload.images
        .map((image, index) => {
          const imageText = [image.name, image.alt ?? "", image.caption ?? ""]
            .join(" ")
            .toLowerCase();
          const matchCount = tokens.filter((token) =>
            imageText.includes(token),
          ).length;
          const sizeFactor =
            image.size > 1_500_000 ? 4 : image.size > 700_000 ? 8 : 12;
          const positionFactor = Math.max(0, 10 - index * 2);
          const rawScore =
            38 + matchCount * 11 + sizeFactor + positionFactor + scoreBoost;
          const score = Math.max(12, Math.min(97, rawScore));

          return {
            id: image.id,
            score,
            reason:
              score >= 80
                ? strongReason
                : score >= 60
                  ? midReason
                  : score >= 40
                    ? weakReason
                    : lowReason,
          };
        })
        .toSorted((left, right) => right.score - left.score);
    };

    const buildOverallScore = (
      descriptionText: string,
      rankedImages: AnalyzeProductCardRankedImage[],
      boost = 0,
    ) => {
      const keywordDensity = descriptionText
        .toLowerCase()
        .split(/[^a-zа-я0-9]+/i)
        .filter(Boolean).length;
      const strongImages = rankedImages.filter(
        (image) => image.score >= 72,
      ).length;
      const weakImages = rankedImages.filter(
        (image) => image.score < 45,
      ).length;
      const topImageScore = rankedImages[0]?.score ?? 0;

      const score =
        28 +
        Math.min(24, keywordDensity) +
        strongImages * 9 +
        Math.round(topImageScore * 0.24) -
        weakImages * 5 +
        boost;

      return Math.max(12, Math.min(98, score));
    };

    const rankedImages = buildRankedImages(
      `${normalizedTitle} ${normalizedDescription}`,
      {
        strongReason: "Сильное совпадение с текущим текстом и удачная подача.",
        midReason: "Текст поддержан, но связку еще можно усилить.",
        weakReason: "Попадание частичное, смысл раскрыт не до конца.",
        lowReason: "Слабо поддерживает текущий текст карточки.",
      },
    );

    const overallScore = buildOverallScore(normalizedDescription, rankedImages);

    const suggestedDescription = [
      normalizedDescription,
      "Сделай первый экран карточки про главный материал, сценарий использования и заметимую выгоду.",
      "Усиль формулировки под изображения с максимальной релевантностью и убери слабые повторения.",
    ].join("\n\n");

    const suggestedRankedImages = buildRankedImages(
      `${normalizedTitle} ${suggestedDescription}`,
      {
        scoreBoost: 7,
        strongReason:
          "Вариант ИИ хорошо поддержан этим кадром и считывается быстрее.",
        midReason:
          "После правки ИИ связка стала плотнее, но кадр еще можно усилить.",
        weakReason:
          "Вариант ИИ улучшает связку, но этот кадр остается вторичным.",
        lowReason: "Даже после правки ИИ кадр поддерживает смысл слабо.",
      },
    );

    const suggestedOverallScore = buildOverallScore(
      suggestedDescription,
      suggestedRankedImages,
      6,
    );

    const recommendations = [
      "Первые кадры должны повторять главный тезис описания.",
      "Добавь в описание материал, сценарий и визуальный контекст товара.",
      "Слабые кадры лучше увести ниже или заменить.",
    ];

    return {
      overallScore,
      rankedImages,
      suggestedDescription,
      suggestedOverallScore,
      suggestedRankedImages,
      recommendations,
    };
  },
});

const createHttpProductCardAnalysisApi = (): ProductCardAnalysisApi => ({
  analyze: async (payload, options) => {
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

const productCardAnalysisApi =
  process.env.NEXT_PUBLIC_USE_MOCK_API === "true"
    ? createMockProductCardAnalysisApi()
    : createHttpProductCardAnalysisApi();

export {
  analyzeProductCard,
  createMockProductCardAnalysisApi,
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
