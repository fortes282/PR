import type { MetadataRoute } from "next";

/**
 * PWA manifest: name, icons, theme color, display mode.
 * Backend: static; no API. Icons served from /icons/.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pristav Radosti",
    short_name: "Pristav Radosti",
    description: "Rehab Center Management",
    start_url: "/",
    display: "standalone",
    background_color: "#0c4a6e",
    theme_color: "#0ea5e9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
