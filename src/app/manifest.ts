import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OBA — Organização de Beyblade do Amazonas",
    short_name: "OBA",
    description:
      "Sistema oficial de gestão de torneios, chaveamentos e ranking da Organização de Beyblade do Amazonas.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#6d28d9",
    categories: ["sports", "games"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/images/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        label: "Ranking da Organização de Beyblade do Amazonas",
      },
    ],
  };
}
