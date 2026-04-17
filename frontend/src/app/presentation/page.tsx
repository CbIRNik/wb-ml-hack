import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "WB Hack ML / Презентация",
  description: "Техническая HTML-презентация WB Hack ML на 10 слайдов.",
};

type SlideProps = {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

function Slide({ id, index, title, subtitle, children }: SlideProps) {
  return (
    <section
      id={id}
      className="snap-start border-b border-border/70 px-4 py-8 md:px-8 md:py-10"
    >
      <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-7xl flex-col justify-center gap-6 md:gap-8">
        <div className="flex flex-col gap-3">
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Слайд {index}
          </div>
          <div className="max-w-5xl">
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              {subtitle}
            </p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.75rem] border border-border bg-card/88 p-4 shadow-sm backdrop-blur md:p-5 ${className}`}
    >
      {title ? (
        <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Node({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

function Bar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-foreground"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function TinyChart({
  values,
}: {
  values: number[];
}) {
  return (
    <div className="flex h-24 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${index}-${value}`} className="flex-1 rounded-t-xl bg-foreground/85" style={{ height: `${value}%` }} />
      ))}
    </div>
  );
}

function Mermaid({
  chart,
  className = "",
}: {
  chart: string;
  className?: string;
}) {
  return (
    <div
      className={`mermaid overflow-x-auto rounded-[1.5rem] border border-border bg-background/70 p-5 text-sm ${className}`}
    >
      {chart}
    </div>
  );
}

const slides = [
  "slide-01",
  "slide-02",
  "slide-03",
  "slide-04",
  "slide-05",
  "slide-06",
  "slide-07",
  "slide-08",
  "slide-09",
  "slide-10",
] as const;

export default function PresentationPage() {
  return (
    <main className="relative h-svh snap-y snap-mandatory overflow-y-auto scroll-smooth bg-background text-foreground">
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"
        strategy="afterInteractive"
      />
      <Script id="presentation-mermaid" strategy="afterInteractive">{`
        (function () {
          var tries = 0;
          function boot() {
            tries += 1;
            if (!window.mermaid) {
              if (tries < 40) window.setTimeout(boot, 150);
              return;
            }
            window.mermaid.initialize({
              startOnLoad: false,
              securityLevel: "loose",
              theme: "neutral",
              fontFamily: "var(--font-geist-sans), sans-serif",
              themeVariables: {
                background: "#ffffff",
                primaryColor: "#f5f5f5",
                primaryTextColor: "#171717",
                primaryBorderColor: "#d4d4d4",
                lineColor: "#737373",
                secondaryColor: "#fafafa",
                tertiaryColor: "#ffffff"
              },
              flowchart: {
                curve: "monotoneX",
                padding: 24,
                nodeSpacing: 48,
                rankSpacing: 64,
                htmlLabels: true
              }
            });
            window.mermaid.run({ querySelector: ".mermaid" });
          }
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", boot, { once: true });
          } else {
            boot();
          }
        })();
      `}</Script>
      <style>{`
        .mermaid svg {
          width: 100% !important;
          height: auto !important;
          min-height: 300px;
          display: block;
          margin: 0 auto;
        }

        .mermaid .label,
        .mermaid foreignObject div {
          font-size: 16px !important;
          line-height: 1.45 !important;
        }

        .mermaid .node rect,
        .mermaid .node polygon,
        .mermaid .node path {
          stroke-width: 1.5px !important;
        }

        @media (max-width: 768px) {
          .mermaid svg {
            min-height: 220px;
          }

          .mermaid .label,
          .mermaid foreignObject div {
            font-size: 14px !important;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,120,120,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(120,120,120,0.08),transparent_24%)]" />

      <div className="fixed inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <nav className="flex items-center gap-1 rounded-full border border-border bg-background/92 px-2 py-2 shadow-sm backdrop-blur">
          {slides.map((slide, index) => (
            <a
              key={slide}
              href={`#${slide}`}
              className="inline-flex size-8 items-center justify-center rounded-full text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {index + 1}
            </a>
          ))}
        </nav>
      </div>

      <Slide
        id="slide-01"
        index="01"
        title="WB Hack ML"
        subtitle="Сервис оценивает карточку товара целиком: текст, фото, порядок кадров, рекомендации."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Panel className="flex flex-col justify-between">
            <div className="flex flex-wrap gap-2">
              <Chip>Next.js 16.2.3</Chip>
              <Chip>FastAPI</Chip>
              <Chip>Multimodal ML</Chip>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Metric value="4" label="шага UI" />
              <Metric value="1" label="API endpoint" />
              <Metric value="6" label="типов результата" />
            </div>
            <div className="mt-6">
              <Mermaid
                chart={`
flowchart LR
    subgraph A["Вход"]
      A1["title"]
      A2["description"]
      A3["images[]"]
    end
    subgraph B["WB Hack ML runtime"]
      B1["score карточки"]
      B2["ranking кадров"]
      B3["rewrite описания"]
    end
    subgraph C["Результат"]
      C1["оценка"]
      C2["причины"]
      C3["next action"]
    end
    A --> B --> C
                `}
              />
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Продукт не только оценивает карточку, но сразу выдает улучшенное
              описание и список правок, которые можно применить без ручного
              анализа.
            </p>
          </Panel>
          <Panel title="Что получает пользователь">
            <div className="grid gap-3">
              {[
                "Общий score карточки",
                "Рейтинг изображений",
                "Причина по каждому кадру",
                "Новое описание",
                "Прогноз улучшенного score",
                "Рекомендации по правкам",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-02"
        index="02"
        title="Что ломает карточку"
        subtitle="Критична не абстрактная красота кадра, а сила изображения внутри конкретной карточки."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Типовые сбои">
            <div className="grid gap-3 md:grid-cols-2">
              <Node title="Слабый hero" text="Первый кадр хуже второго или третьего." />
              <Node title="Text drift" text="Описание обещает одно, фото показывает другое." />
              <Node title="Service noise" text="Таблица, сертификат, баннер лезут вверх." />
              <Node title="Card mismatch" text="Сильные и слабые кадры перемешаны." />
            </div>
          </Panel>
          <Panel title="Сигналы">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
                <div className="text-sm font-medium">Плюс</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div>товарный кадр</div>
                  <div>чистый фон</div>
                  <div>материал крупно</div>
                  <div>совпадение с текстом</div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
                <div className="text-sm font-medium">Минус</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div>размерная сетка</div>
                  <div>сертификат / manual</div>
                  <div>logo only</div>
                  <div>много текста / grid</div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <Bar label="Товарный сигнал" value={86} />
              <Bar label="Document signal" value={28} />
              <Bar label="Шум карточки" value={41} />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-03"
        index="03"
        title="Поток продукта"
        subtitle="Путь один: данные из UI сразу идут в реальный backend и реальный runtime."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel title="Flow">
            <Mermaid
              chart={`
flowchart TD
    subgraph UI["Frontend / Next.js"]
      U1["Шаги UI<br/>название → описание → фото"]
      U2["Browser prepare<br/>FileReader → base64"]
    end
    subgraph API["Backend / FastAPI"]
      A1["POST /api/analyze"]
    end
    subgraph OUT["Ответ"]
      O1["score"]
      O2["ranking"]
      O3["rewrite"]
    end
    UI --> API --> OUT
              `}
            />
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              Фронтенд отправляет уже готовый inference-payload: изображения
              сериализованы в `src`, snapshot карточки фиксирован, повторный
              анализ того же draft не дублируется.
            </p>
          </Panel>
          <Panel title="Ключ">
            <div className="grid gap-3">
              <Metric value="0" label="лишних адаптеров" />
              <Metric value="1" label="снимок draft на анализ" />
              <Metric value="100%" label="данные фото внутри payload" />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-04"
        index="04"
        title="Фронтенд"
        subtitle="Next.js 16.2.3 здесь не витрина, а рабочая оболочка анализа."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Стек">
            <div className="flex flex-wrap gap-2">
              <Chip>Next.js 16.2.3</Chip>
              <Chip>React 19.2.4</Chip>
              <Chip>Tailwind 4</Chip>
              <Chip>shadcn neutral</Chip>
              <Chip>Zustand</Chip>
              <Chip>Zod</Chip>
              <Chip>Framer Motion</Chip>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Metric value="App Router" label="route-centric UI" />
              <Metric value="State" label="snapshot + dedupe" />
              <Metric value="UI" label="step-by-step flow" />
            </div>
          </Panel>
          <Panel title="Что делает фронт">
            <div className="grid gap-3">
              <Node title="Валидация" text="Формирует payload до сети." />
              <Node title="Сериализация" text="Читает файл и кодирует `src`." />
              <Node title="Оркестрация" text="Не шлет дубль на тот же snapshot." />
              <Node title="Интерпретация" text="Показывает ranking и rewrite как действие." />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-05"
        index="05"
        title="Backend API"
        subtitle="Тонкий слой. Схема на входе. Typed JSON на выходе. Вся сложность внутри ML."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Panel title="Маршруты">
            <div className="grid gap-3">
              <Node title="GET /health" text="Проверка liveness." />
              <Node title="POST /api/analyze" text="Одна точка inference." />
              <Node title="Pydantic" text="Ограничения на title, description, images." />
              <Node title="service.py" text="Прямой вход в `analyze_product_card_ml`." />
            </div>
          </Panel>
          <Panel title="Контракт">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4 font-mono text-xs leading-6 text-muted-foreground">
                <div>{`{`}</div>
                <div>{`  title,`}</div>
                <div>{`  description,`}</div>
                <div>{`  images[]`}</div>
                <div>{`}`}</div>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4 font-mono text-xs leading-6 text-muted-foreground">
                <div>{`{`}</div>
                <div>{`  overallScore,`}</div>
                <div>{`  rankedImages,`}</div>
                <div>{`  suggestedDescription,`}</div>
                <div>{`  recommendations`}</div>
                <div>{`}`}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <Chip>HTTP JSON boundary</Chip>
              <div className="h-px flex-1 bg-border" />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-06"
        index="06"
        title="ML pipeline"
        subtitle="Не одна нейросеть. Гибридный graph: энкодеры, признаки, reranking, ensemble."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Panel title="Архитектура">
            <Mermaid
              chart={`
flowchart TD
    I["Вход карточки<br/>title + description + images"] --> P
    subgraph P["Обработка"]
      P1["Embeddings<br/>image/text"]
      P2["Visual + document features"]
    end
    P --> R["Card-aware ranking"]
    R --> O["Финал<br/>score + rank + reason"]
              `}
            />
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              Пайплайн считает не только соответствие текста и изображения, но
              и document-like сигналы, визуальные priors и относительную силу
              кадра внутри текущей карточки.
            </p>
          </Panel>
          <Panel title="Семейства сигналов">
            <div className="grid gap-3">
              <Bar label="Text-image match" value={82} />
              <Bar label="Visual priors" value={67} />
              <Bar label="Document detect" value={58} />
              <Bar label="Card-aware rank" value={91} />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-07"
        index="07"
        title="Recovered runtime"
        subtitle="Главная ветка берет сохраненные артефакты прошлых версий и собирает более сильный ranking."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Компоненты">
            <Mermaid
              chart={`
flowchart TD
    subgraph E["Encoders"]
      E1["DINOv3 / DINOv2"]
      E2["SigLIP2 / SigLIP"]
    end
    subgraph V2["v2 branch"]
      V21["baseline"]
      V22["image"]
      V23["multimodal"]
      V24["stacker"]
    end
    R["v4.1 reranker"]
    F["Финальный recovered score"]
    E --> V2 --> R --> F
              `}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Эта ветка использует реальные сохраненные модели, поэтому дает
              самый сильный ranking и лучшую чувствительность к порядку кадров.
            </p>
          </Panel>
          <Panel title="Смешивание веток">
            <div className="grid gap-3">
              <Bar label="v2 stacker" value={72} />
              <Bar label="v4.1 reranker" value={18} />
              <Bar label="online branch" value={10} />
              <Bar label="card rank bonus" value={4} />
            </div>
            <div className="mt-4 rounded-[1.5rem] border border-border bg-background/70 p-4 font-mono text-xs leading-6 text-muted-foreground">
              final = 0.72 * v2 + 0.18 * reranker + 0.10 * online - 0.05 *
              document
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Основной вклад у `v2_stacker`, `v4.1` уточняет порядок внутри
              карточки, online-ветка страхует семантику и устойчивость.
            </p>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-08"
        index="08"
        title="Online fallback"
        subtitle="Если тяжелые артефакты не поднялись, API не падает. Включается безопасная online-ветка."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Что внутри">
            <Mermaid
              chart={`
flowchart TD
    subgraph S["Online signals"]
      S1["SigLIP judge<br/>text ↔ image"]
      S2["CLIP taxonomy<br/>product vs document"]
      S3["Image features<br/>brightness · edge · white_frac"]
      S4["NEGATIVE_HINTS<br/>таблица · сертификат · инфографика"]
    end
    S --> X["Fallback score"]
              `}
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Даже без части артефактов система отделяет товарный кадр от
              служебного материала и возвращает полезный ranking без 500.
            </p>
          </Panel>
          <Panel title="Зачем">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
                <div className="text-sm font-medium">Плюс</div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  Устойчивость demo и понятный score даже без части весов.
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
                <div className="text-sm font-medium">Смысл</div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  Отделяет товарный кадр от service noise и поддерживает ranking.
                </div>
              </div>
            </div>
            <div className="mt-4">
              <TinyChart values={[30, 44, 58, 72, 82, 76]} />
            </div>
          </Panel>
        </div>
      </Slide>

      <Slide
        id="slide-09"
        index="09"
        title="Почему подход эффективен"
        subtitle="Эффективность тут не только в качестве score, но в полезности решения для пользователя."
      >
        <div className="grid gap-5 lg:grid-cols-4">
          <Panel title="Ranking">
            <TinyChart values={[26, 48, 82, 61]} />
            <div className="mt-4 text-sm text-muted-foreground">
              Сравнение кадров внутри одной карточки.
            </div>
          </Panel>
          <Panel title="Interpretability">
            <TinyChart values={[35, 68, 74, 88]} />
            <div className="mt-4 text-sm text-muted-foreground">
              Причина по кадру, не только scalar.
            </div>
          </Panel>
          <Panel title="Robustness">
            <TinyChart values={[82, 80, 78, 79]} />
            <div className="mt-4 text-sm text-muted-foreground">
              Runtime деградирует мягко, не рушится.
            </div>
          </Panel>
          <Panel title="Actionability">
            <TinyChart values={[22, 46, 73, 90]} />
            <div className="mt-4 text-sm text-muted-foreground">
              Rewrite + recommendations = next step.
            </div>
          </Panel>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="text-sm leading-6 text-muted-foreground">
            Card-aware ranking лучше single-score, потому что сравнивает кадры
            внутри одной карточки, а не в вакууме.
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            Document penalties режут типичный false positive маркетплейса:
            инфографика выглядит информативно, но ломает hero.
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            Recovered + fallback ветки дают мягкую деградацию и надежный demo
            path.
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            Причины и рекомендации превращают ML score в конкретное действие.
          </div>
        </div>
      </Slide>

      <Slide
        id="slide-10"
        index="10"
        title="Итог"
        subtitle="Уже сейчас это рабочий продуктовый контур: UI, API, runtime, Docker, понятный path к развитию."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Что уже есть">
            <div className="grid gap-3 md:grid-cols-2">
              <Metric value="UI" label="загрузка и результат" />
              <Metric value="API" label="реальный endpoint" />
              <Metric value="ML" label="ranking + rewrite" />
              <Metric value="Docker" label="быстрый запуск" />
            </div>
          </Panel>
          <Panel title="Куда растет">
            <div className="grid gap-3">
              <Node title="Batch mode" text="много карточек за прогон" />
              <Node title="Seller dashboard" text="история, сравнение, weak spots" />
              <Node title="Async inference" text="очереди для тяжелого runtime" />
              <Node title="Offline eval" text="валидация на размеченных WB cards" />
            </div>
          </Panel>
        </div>
      </Slide>
    </main>
  );
}
