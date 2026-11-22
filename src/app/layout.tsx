import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ô de Casa — Uma mãozinha pra quem tá aprendendo a se virar",
    template: "%s · Ô de Casa",
  },
  description:
    "Ô de Casa ajuda quem mora sozinho ou está aprendendo a cuidar da casa: cozinha, limpeza, roupas e montagem, com foto e passo a passo.",
  applicationName: "Ô de Casa",
  appleWebApp: { capable: true, title: "Ô de Casa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#BFE4F6",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-meadow text-ink antialiased">{children}</body>
    </html>
  );
}
