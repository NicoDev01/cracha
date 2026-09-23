import { Inter, Urbanist } from "next/font/google";
import localFont from "next/font/local";

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
  src: "../../../assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
  display: "swap",
});

/**
 * The public part of the site: fonts, theme, navigation and footer. Extracted
 * because the legal pages need exactly the same frame as the landing page but
 * live at their own top-level URLs — Google requires the privacy policy to be
 * reachable at an address that is not the homepage.
 *
 * There is no AuthProvider and no Toaster here: nothing on these pages reads
 * the session or raises a toast, and the dashboard layout brings both itself.
 * Together they put Supabase and sonner into every visitor's first load.
 * The one thing that does care whether someone is signed in, the "open the
 * app" buttons, asks for itself (app-entry-link.tsx).
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${urbanist.variable} ${calSans.variable} font-sans antialiased`}>
      <ThemeProvider>
        <div className="min-h-screen w-full bg-white dark:bg-black">
          {/* Radial glow overlay only in dark mode */}
          <div
            className="hidden dark:block fixed inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120, 180, 255, 0.25), transparent 70%), #000000",
            }}
          />
          <div className="relative">
            <ConditionalLayout>{children}</ConditionalLayout>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
