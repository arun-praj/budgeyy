import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budgeyy - Personal Finance & Budget Tracking",
  description: "Master your finances with the 50/30/20 rule. Track income, expenses, and savings with beautiful visualizations.",
  keywords: ["budget", "finance", "expense tracker", "50/30/20 rule", "savings"],
};

import { ThemeSyncer } from "@/components/providers/theme-syncer";
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

async function ConnectedThemeSyncer() {
  const userSettings = await getUserSettings();
  return <ThemeSyncer theme={userSettings?.theme} />;
}
