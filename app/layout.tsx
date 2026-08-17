import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creative Agent",
  description: "AI-powered ad creative generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
