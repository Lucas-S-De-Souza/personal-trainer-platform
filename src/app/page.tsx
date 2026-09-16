import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Thais Santana | Personal Trainer em São Paulo — Treinos Presenciais e Online",
  description:
    "Thais Santana, Personal Trainer (CREF 123456-G/SP). Treinos personalizados presenciais em São Paulo e consultoria online para todo o Brasil. Emagrecimento, hipertrofia e condicionamento físico. Agende sua avaliação.",
  keywords: [
    "personal trainer São Paulo",
    "treino online",
    "hipertrofia feminina",
    "emagrecimento",
    "consultoria fitness",
  ],
  openGraph: {
    type: "website",
    title: "Thais Santana | Personal Trainer — Treinos Presenciais e Online",
    description:
      "Treinos personalizados para emagrecimento, hipertrofia e condicionamento físico. Presencial em São Paulo e online para todo o Brasil.",
    locale: "pt_BR",
    images: [{ url: "/hero-bg.jpg", width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
