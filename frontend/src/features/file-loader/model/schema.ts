import { z } from "zod";
import {
  MAX_IMAGES,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
} from "./constants";

export const fileLoaderTitleSchema = z
  .string()
  .trim()
  .min(MIN_TITLE_LENGTH, `Название минимум ${MIN_TITLE_LENGTH} символа`);

export const fileLoaderDescriptionSchema = z
  .string()
  .trim()
  .min(
    MIN_DESCRIPTION_LENGTH,
    `Описание минимум ${MIN_DESCRIPTION_LENGTH} символа`,
  );

export const fileLoaderImageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  previewUrl: z.string().min(1),
});

export const fileLoaderImagesSchema = z
  .array(fileLoaderImageSchema)
  .min(1, "Загрузите хотя бы одно изображение")
  .max(MAX_IMAGES, `Лимит ${MAX_IMAGES} изображений`);

export const fileLoaderDraftSchema = z.object({
  title: fileLoaderTitleSchema,
  description: fileLoaderDescriptionSchema,
  images: fileLoaderImagesSchema,
});

export const analyzeProductCardInputSchema = z.object({
  title: fileLoaderTitleSchema,
  description: fileLoaderDescriptionSchema,
  images: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        size: z.number().nonnegative(),
        src: z.string().optional(),
        alt: z.string().optional(),
        caption: z.string().optional(),
      }),
    )
    .min(1, "Загрузите хотя бы одно изображение")
    .max(MAX_IMAGES, `Лимит ${MAX_IMAGES} изображений`),
});
