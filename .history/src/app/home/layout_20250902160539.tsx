import type { Metadata } from "next";
import { Inter, Urbanist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";
import { ConditionalLayout } from "@/components/landing/layout/conditional-layout";
import { ThemeProvider } from "@/components/dashboard/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urban"
});

const calSans = localFont({
  src: "../../assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
  display: "swap",
});

const geist = localFont({
  src: "../../assets/fonts/GeistVF.woff2",
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CraCha - Intelligente Wissensspeicher durch RAG-Technologie",
  description: "Verwandle komplexe Websites in intelligente, durchsuchbare Wissensspeicher. CraCha nutzt modernste RAG-Technologie für präzise, kontextuelle Antworten aus Ihren Daten.",
};

interface HomeLayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: HomeLayoutProps) {
  return (
    <div className={`${inter.variable} ${urbanist.variable} ${calSans.variable} ${geist.variable} font-sans antialiased`}>
      <ThemeProvider>
        <AuthProvider>
          {/* Dark-mode landing background with top glow */}
          <div className="min-h-screen w-full bg-white dark:bg-black">
            {/* Radial glow overlay only in dark mode */}
            <div
              className="hidden dark:block fixed inset-0 z-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120, 180, 255, 0.25), transparent 70%), #000000",
              }}
            />
            {/* Content on top of background */}
            <div className="relative">
              <ConditionalLayout>{children}</ConditionalLayout>
              <Toaster position="top-right" richColors />
            </div>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}