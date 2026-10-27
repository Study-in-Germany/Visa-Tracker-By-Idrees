import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Visa Tracker by Idrees",
    short_name: "Visa Tracker",
    description: "Community tracker for German student visa timelines, queues and outcomes.",
    id: "/",
    lang: "en",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#efeee9",
    theme_color: "#efeee9",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Track my application", short_name: "Tracker", url: "/tracker", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Browse universities", short_name: "Universities", url: "/universities", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Find programmes", short_name: "Programmes", url: "/programmes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Find accommodation", short_name: "Housing", url: "/accommodation", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
