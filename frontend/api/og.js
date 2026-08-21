import { ImageResponse } from "@vercel/og";
import { FRAUNCES_SEMIBOLD, FRAUNCES_ITALIC, INTER_MEDIUM } from "./fonts.js";
import { PAPER } from "./paper.js";

// Runs at the edge, same as middleware.js
export const config = { runtime: "edge" };

const API_URL = "https://s58-aditi-capstone-blog.onrender.com/api";
const OXBLOOD = "#5c1a2b";
const CREAM = "#f6f1e7";
const PAPER_URL = `url(data:image/jpeg;base64,${PAPER})`;

// Fonts and background are inlined rather than fetched. A network fetch here
// is fatal: ImageResponse sends its headers before rendering, so anything
// that throws mid-render returns a 200 with an empty body and no error.
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

// Big and confident on short titles, stepping down only as far as it must.
const titleSize = (n) =>
  n <= 20
    ? 92
    : n <= 34
      ? 76
      : n <= 55
        ? 62
        : n <= 85
          ? 50
          : n <= 120
            ? 42
            : 36;

const trim = (text, max) =>
  text.length <= max ? text : text.slice(0, max).trimEnd() + "...";

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Defaults double as the card for a failed lookup, so a bad request
  // still returns a branded image rather than a broken one.
  let title = "Familiar";
  let byline = "A quiet place to read, write, and think out loud";
  let isArticle = false;

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
        if (meta.title) {
          title = meta.title;
          isArticle = true;
        }
        byline = meta.authorName || "";
      }
    } catch {
      // Keep the defaults above.
    }
  }

  title = trim(title, 150);

  const stack = [];

  // The small wordmark is redundant on the fallback card, where the title
  // already reads "Familiar".
  if (isArticle) {
    stack.push(
      el(
        "div",
        {
          fontFamily: "Inter",
          fontSize: 16,
          letterSpacing: 6,
          color: "rgba(92, 26, 43, 0.55)",
          marginBottom: 40,
          textShadow: "0 1px 0 rgba(255, 255, 255, 0.8)",
        },
        "FAMILIAR",
      ),
    );
  }

  stack.push(
    el(
      "div",
      {
        fontFamily: "Fraunces",
        fontSize: titleSize(title.length),
        color: OXBLOOD,
        lineHeight: 1.08,
        textAlign: "center",
        // A one pixel highlight underneath, so the type sits in the paper
        // rather than on top of it.
        textShadow: "0 1px 1px rgba(255, 255, 255, 0.6)",
      },
      title,
    ),
  );

  if (byline) {
    stack.push(
      el("div", {
        width: 120,
        height: 1,
        backgroundColor: "rgba(92, 26, 43, 0.30)",
        marginTop: 38,
        marginBottom: 26,
      }),
    );
    stack.push(
      el(
        "div",
        {
          fontFamily: "Fraunces",
          fontStyle: "italic",
          fontSize: 26,
          color: "rgba(92, 26, 43, 0.78)",
          textShadow: "0 1px 0 rgba(255, 255, 255, 0.7)",
        },
        byline,
      ),
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
        backgroundImage: PAPER_URL,
        backgroundSize: "1200px 630px",
      },
      [
        // Two hairlines, the way a printed border sits on a page.
        el("div", {
          position: "absolute",
          top: 22,
          left: 22,
          right: 22,
          bottom: 22,
          border: "1px solid rgba(92, 26, 43, 0.34)",
        }),
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
            width: 1000,
          },
          stack,
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
          name: "Fraunces",
          data: toBytes(FRAUNCES_ITALIC),
          weight: 600,
          style: "italic",
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
