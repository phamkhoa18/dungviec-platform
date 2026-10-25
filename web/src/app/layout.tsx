import type { Metadata, Viewport } from "next";
import { Inter, Lexend, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1E5CE6",
};

export const metadata: Metadata = {
  applicationName: "Đúng Việc",
  openGraph: {
    title: "Đúng Việc — Tuyển dụng ứng dụng AI phân tích CV",
    description: "Đánh giá mức độ phù hợp giữa CV và vị trí tuyển dụng.",
    siteName: "Đúng Việc",
    locale: "vi_VN",
    type: "website",
  },
  title: "Đúng Việc — Tìm việc, tuyển người, AI chấm độ phù hợp",
  description:
    "Đúng Việc giúp ứng viên tìm đúng công việc và nhà tuyển dụng tìm đúng người nhờ AI phân tích CV và đánh giá mức độ phù hợp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${lexend.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
