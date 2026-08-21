import { ImageResponse } from "@vercel/og";
import { FRAUNCES_SEMIBOLD, INTER_MEDIUM } from "./fonts.js";

// Runs at the edge, same as middleware.js
export const config = { runtime: "edge" };

const API_URL = "https://s58-aditi-capstone-blog.onrender.com/api";
const OXBLOOD = "#5c1a2b";
const CREAM = "#f5f0e6";
const MUTED = "#6b4750";

// Fonts are inlined rather than fetched. A network fetch here is fatal:
// ImageResponse sends its headers before rendering, so anything that throws
// mid-render returns a 200 with an empty body and no error to read.
const toBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Builds an element without JSX. Vite does not transpile files in /api,
// so writing JSX here would not compile. Plain objects work identically.
const el = (type, style, children) => ({
  type,
  props: children === undefined ? { style } : { style, children },
});

// Long titles get smaller type so they always fit in four lines or fewer.
const titleSize = (text) => {
  const n = text.length;
  if (n <= 24) return 64;
  if (n <= 45) return 54;
  if (n <= 80) return 46;
  if (n <= 120) return 40;
  return 34;
};

const trim = (text, max) =>
  text.length <= max ? text : text.slice(0, max).trimEnd() + "...";

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Defaults double as the card for a failed lookup, so a bad request
  // still returns a branded image rather than a broken one.
  let title = "Familiar";
  let author = "A quiet place to read, write, and think out loud";

  if (id) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_URL}/articles/${id}/meta`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      clearTimeout(timer);

      if (res.ok) {
        const meta = await res.json();
        if (meta.title) title = meta.title;
        author = meta.authorName || "";
      }
    } catch {
      // Keep the defaults above.
    }
  }

  title = trim(title, 150);

  const column = [
    el(
      "div",
      {
        fontFamily: "Inter",
        fontSize: 17,
        letterSpacing: 4,
        color: "rgba(92, 26, 43, 0.62)",
        marginBottom: 34,
      },
      "FAMILIAR",
    ),
    el(
      "div",
      {
        fontFamily: "Fraunces",
        fontSize: titleSize(title),
        color: OXBLOOD,
        lineHeight: 1.14,
        textAlign: "center",
      },
      title,
    ),
  ];

  if (author) {
    column.push(
      el("div", {
        width: 46,
        height: 1,
        backgroundColor: "rgba(92, 26, 43, 0.32)",
        marginTop: 30,
        marginBottom: 24,
      }),
    );
    column.push(
      el("div", { fontFamily: "Inter", fontSize: 21, color: MUTED }, author),
    );
  }

  return new ImageResponse(
    el(
      "div",
      {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: CREAM,
      },
      [
        el("div", {
          position: "absolute",
          top: 30,
          left: 30,
          right: 30,
          bottom: 30,
          border: "1px solid rgba(92, 26, 43, 0.20)",
        }),
        el(
          "div",
          {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 620,
          },
          column,
        ),
      ],
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Fraunces",
          data: toBytes(FRAUNCES_SEMIBOLD),
          weight: 600,
          style: "normal",
        },
        {
          name: "Inter",
          data: toBytes(INTER_MEDIUM),
          weight: 500,
          style: "normal",
        },
      ],
      headers: {
        // Titles change rarely, crawlers refetch constantly.
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
