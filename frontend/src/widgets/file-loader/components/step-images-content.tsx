import { ImagePlus } from "lucide-react";
import Image from "next/image";

import {
  getImageScore,
  useFileLoaderController,
} from "@/features/file-loader/model";
import { cn } from "@/shared/lib/utils";
import { DraftImageCard } from "./draft-image-card";

export function StepImagesContent() {
  const controller = useFileLoaderController();
  const {
    images,
    activeImage,
    analysis,
    setActiveImage,
    handleRemoveImage,
    getRootProps,
    getInputProps,
    isDragActive,
  } = controller;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,2fr)]">
      <div className="flex min-h-56 flex-col gap-3 lg:h-112">
        <button
          type="button"
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col justify-between rounded-xl border border-dashed p-4 text-left transition-colors lg:shrink-0",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20 hover:border-foreground/30",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-start gap-4">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background">
              <ImagePlus className="size-4 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">Добавить файлы</p>
          </div>
        </button>

        <ul className="grid gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {images.length > 0 ? (
            images.map((image, index) => (
              <li key={image.id}>
                <DraftImageCard
                  image={image}
                  index={index}
                  isActive={activeImage?.id === image.id}
                  score={analysis ? getImageScore(analysis, image.id) : null}
                  onSelect={() => setActiveImage(image.id)}
                  onRemove={() => handleRemoveImage(image.id)}
                />
              </li>
            ))
          ) : (
            <li className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Список пуст.
            </li>
          )}
        </ul>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-muted/20 lg:block lg:h-112">
        {activeImage ? (
          <div className="relative h-full w-full">
            <Image
              src={activeImage.previewUrl}
              alt={activeImage.name}
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Нет изображений
          </div>
        )}
      </div>
    </div>
  );
}
