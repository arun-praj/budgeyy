import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SyncWrapper } from "@/components/providers/sync-wrapper";

export const viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: {
    default: "Budgeyy - Personal Finance Mastered",
    template: "%s | Budgeyy"
  },
  manifest: "/manifest.json",
  description: "Master your finances with the 50/30/20 rule. Track income, expenses, and savings with beautiful visualizations and localized Nepali calendar support.",
  keywords: ["budget", "finance", "expense tracker", "50/30/20 rule", "savings", "nepali calendar", "personal finance"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://budgeyy.com",
    title: "Budgeyy - Master Your Personal Finances",
    description: "The simplest way to track your money using the 50/30/20 rule. Now with Nepali calendar support.",
    siteName: "Budgeyy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Budgeyy - Personal Finance Mastered",
    description: "Master your finances with the 50/30/20 rule. Track income, expenses, and savings with beautiful visualizations.",
  },
};

import { ThemeSyncer } from "@/components/providers/theme-syncer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getUserSettings } from "@/actions/user";

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <ConnectedThemeSyncer />
          </Suspense>
          <SyncWrapper>
            {children}
            <SpeedInsights />

            <ServiceWorkerRegister />
          </SyncWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function ConnectedThemeSyncer() {
  const userSettings = await getUserSettings();
  return <ThemeSyncer theme={userSettings?.theme} />;
}
