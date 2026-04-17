import { Skeleton } from "@/shared/ui/skeleton";

const SKELETON_IMAGE_KEYS = [
  "image-a",
  "image-b",
  "image-c",
  "image-d",
] as const;

export function ResultSkeleton() {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="grid h-[20rem] gap-3 overflow-hidden sm:grid-cols-2">
          {SKELETON_IMAGE_KEYS.map((key) => (
            <div
              key={key}
              className="overflow-hidden rounded-xl border border-border"
            >
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="grid gap-2 p-3">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-20" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-5 w-20" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-56 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
