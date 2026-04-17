import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"

import { appConfig } from "@/shared/config/app"
import { ThemeProvider } from "@/shared/providers/theme-provider"
import "./globals.css"

const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
})

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
})

const Toaster = dynamic(() => import("sonner").then(({ Toaster }) => Toaster))
const ThemeToggle = dynamic(() =>
  import("@/widgets/theme-toggle").then(({ ThemeToggle }) => ThemeToggle),
)

export const metadata: Metadata = {
  title: appConfig.title,
  description: appConfig.description,
  metadataBase: new URL(appConfig.url),
  applicationName: appConfig.name,
  keywords: [
    "wildberries",
    "product card",
    "image relevance",
    "marketplace ai",
    "description rewrite",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Suspense>
            <Toaster position="top-right" swipeDirections={["right", "top"]} />
          </Suspense>
          <Suspense>
            <ThemeToggle />
          </Suspense>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
