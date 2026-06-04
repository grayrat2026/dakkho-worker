import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "DAKKHO — Student Streaming Platform",
  description: "Bangladesh's premier polytechnic student streaming platform. Watch courses, learn from top instructors, and ace your diploma exams with DAKKHO.",
  keywords: ["DAKKHO", "polytechnic", "Bangladesh", "student", "streaming", "courses", "diploma", "education", "bteb"],
  authors: [{ name: "DAKKHO Team" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "DAKKHO — Student Streaming Platform",
    description: "Watch courses, learn from top instructors, and ace your diploma exams.",
    siteName: "DAKKHO",
    type: "website",
    locale: "bn_BD",
  },
  twitter: {
    card: "summary_large_image",
    title: "DAKKHO — Student Streaming Platform",
    description: "Watch courses, learn from top instructors, and ace your diploma exams.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* OneSignal Push Notifications */}
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              window.OneSignalDeferred.push(function(OneSignal) {
                OneSignal.init({
                  appId: "ba6c42b2-d564-4254-b422-a2bed67d8b0f",
                  safari_web_id: "web.onesignal.auto.028d9952-ba2c-477b-babc-6aee5c5ba0de",
                  notifyButton: { enable: true },
                });
              });
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
