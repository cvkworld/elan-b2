import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Élan B2",
    short_name: "Élan B2",
    description: "Personal DELF B2 coach with original non-repeating practice and coach feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5eadb",
    theme_color: "#f5eadb",
    lang: "fr-FR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
