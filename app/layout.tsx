import "./globals.css";
import type { Viewport } from "next";
import Header from "@/components/Header";

export const metadata = {
  title: "Yazkap Properties",
  description: "Tenant & Property Management Portal — Valencia Laundry Building, Abu Dhabi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F4C81",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-bg font-sans text-slate-800">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-12 bg-primary-dark pb-[env(safe-area-inset-bottom)] text-white">
          <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-lg font-bold">
                Yazkap <span className="text-accent">Properties</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-primary-100">
                Valencia Laundry Building
                <br />
                302 Electra Street, Abu Dhabi, UAE
              </p>
            </div>
            <div className="text-sm">
              <p className="mb-2 font-semibold uppercase tracking-wider text-accent">Contact</p>
              <ul className="space-y-1.5 text-primary-100">
                <li>
                  <a href="tel:+97150512276" className="transition hover:text-white">
                    📞 +971 50 512 276
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/97150512276"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-white"
                  >
                    💬 WhatsApp the landlord
                  </a>
                </li>
              </ul>
            </div>
            <div className="text-sm">
              <p className="mb-2 font-semibold uppercase tracking-wider text-accent">Quick Links</p>
              <ul className="space-y-1.5 text-primary-100">
                <li>
                  <a href="/" className="transition hover:text-white">
                    Available units
                  </a>
                </li>
                <li>
                  <a href="/register" className="transition hover:text-white">
                    Tenant registration
                  </a>
                </li>
                <li>
                  <a href="/login" className="transition hover:text-white">
                    Tenant login
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 py-4 text-center text-xs text-primary-200">
            © {new Date().getFullYear()} Yazkap Investment · Studios · Partitions · Bedspace · Big Halls — AED | USD | UGX
          </div>
        </footer>
      </body>
    </html>
  );
}
