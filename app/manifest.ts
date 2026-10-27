import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Protikkha Electric",
    short_name: "Protikkha",
    description: "Electrical Retail POS & Inventory Management System",
    start_url: "/",
    display: "standalone",
    background_color: "#0B3D91",
    theme_color: "#0B3D91",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
