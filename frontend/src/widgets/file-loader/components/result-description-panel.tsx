import type {
  DraftSnapshot,
  ResultVariant,
} from "@/entities/file-loader/model";
import type { AnalyzeProductCardResult } from "@/shared/api";
import { cn } from "@/shared/lib/utils";

type ResultDescriptionPanelProps = {
  analysis: AnalyzeProductCardResult;
  baselineDraft: DraftSnapshot;
  selectedVariant: ResultVariant;
  isRefreshing?: boolean;
  onSelectVariant: (variant: ResultVariant) => void;
};

export function ResultDescriptionPanel({
  analysis,
  baselineDraft,
  selectedVariant,
  isRefreshing = false,
  onSelectVariant,
}: ResultDescriptionPanelProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="text-sm font-medium">Название</div>

        <ContentCard
          label="Исходник"
          value={baselineDraft.title}
          isActive
          isRefreshing={false}
          className="h-32"
          contentClassName="max-h-[4.75rem] overflow-y-auto pr-1"
        />
      </div>

      <div className="text-sm font-medium">Описание</div>

      <div className="grid gap-3 md:grid-cols-2">
        <ContentCard
          label="Исходник"
          value={baselineDraft.description}
          isActive={selectedVariant === "original"}
          isRefreshing={false}
          onClick={() => onSelectVariant("original")}
          className="h-79"
          contentClassName="max-h-79 overflow-y-auto pr-1"
        />
        <ContentCard
          label="Вариант ИИ"
          value={analysis.suggestedDescription}
          isActive={selectedVariant === "suggested"}
          isRefreshing={isRefreshing}
          onClick={() => onSelectVariant("suggested")}
          className="h-79"
          contentClassName="max-h-79 overflow-y-auto pr-1"
        />
      </div>
    </div>
  );
}

type ContentCardProps = {
  label: string;
  value: string;
  isActive: boolean;
  isRefreshing: boolean;
  onClick: () => void;
  className?: string;
  contentClassName?: string;
};

function ContentCard({
  label,
  value,
  isActive,
  isRefreshing,
  onClick,
  className,
  contentClassName,
}: Partial<Pick<ContentCardProps, "onClick">> &
  Omit<ContentCardProps, "onClick">) {
  const isInteractive = Boolean(onClick);
  const rootClassName = cn(
    "rounded-2xl border px-4 py-4 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 flex align-top justify-start",
    isActive
      ? "border-foreground bg-muted text-foreground"
      : "border-border text-muted-foreground",
    isInteractive && "cursor-pointer hover:bg-muted/40",
    className,
  );

  const content = (
    <div className="flex flex-col gap-2 align-top justify-start">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>

      <div
        className={cn(
          "whitespace-pre-wrap text-sm leading-6",
          isRefreshing && "animate-pulse",
          contentClassName,
        )}
      >
        {isRefreshing ? "Пересчет варианта..." : value}
      </div>
    </div>
  );

  if (!isInteractive) {
    return <div className={rootClassName}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={rootClassName}>
      {content}
    </button>
  );
}
