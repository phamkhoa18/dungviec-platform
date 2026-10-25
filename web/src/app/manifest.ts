import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Đúng Việc",
    short_name: "Đúng Việc",
    description: "Tuyển dụng ứng dụng AI phân tích CV",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1E5CE6",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
