import { next } from "@vercel/edge";

// Only run on article URLs. Every other path skips this function entirely,
// so the homepage, profiles and /write are untouched.
export const config = {
  matcher: "/article/:path*",
};

const SITE_URL = "https://familiar-blog.vercel.app";
const API_URL = "https://s58-aditi-capstone-blog.onrender.com/api";
const FALLBACK_IMAGE = `${SITE_URL}/og-image.png`;

// Bots that fetch a URL purely to build a link preview or index it.
// They do not run JavaScript, which is the whole reason this file exists.
const CRAWLER_PATTERN = new RegExp(
  [
    "facebookexternalhit",
    "facebookcatalog",
    "Facebot",
    "WhatsApp",
    "Twitterbot",
    "LinkedInBot",
    "Slackbot",
    "Slack-ImgProxy",
    "Discordbot",
    "TelegramBot",
    "SkypeUriPreview",
    "Applebot",
    "redditbot",
    "Pinterest",
    "Googlebot",
    "Google-InspectionTool",
    "bingbot",
    "DuckDuckBot",
    "YandexBot",
    "Baiduspider",
    "Mastodon",
    "Iframely",
    "embedly",
    "quora link preview",
    "vkShare",
    "W3C_Validator",
    "flipboard",
    "tumblr",
    "nuzzel",
    "bitlybot",
    "outbrain",
    "Snapchat",
    "SignalBot",
  ].join("|"),
  "i",
);

// Escape anything that would break out of an HTML attribute.
// Article titles are user input, so this is not optional.
const escapeHtml = (value) =>
  String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildHtml = ({ title, description, authorName, image, url, isCover }) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeAuthor = escapeHtml(authorName);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);

  // Only declare dimensions for the fallback card, where we know them.
  // Claiming 1200x630 for an arbitrary embedded photo makes platforms
  // render a stretched or cropped card.
  const dimensionTags = isCover
    ? ""
    : `
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />`;

  const authorTag = safeAuthor
    ? `<meta property="article:author" content="${safeAuthor}" />`
    : "";

  // No og:description or twitter:description on purpose. The preview image
  // already carries the title and author, so a description underneath it is
  // the same words twice. The plain name="description" tag stays for search.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <link rel="canonical" href="${safeUrl}" />

    <meta name="description" content="${safeDescription}" />
    <meta name="theme-color" content="#5c1a2b" />

    <meta property="og:site_name" content="Familiar" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:alt" content="${safeTitle}" />${dimensionTags}
    ${authorTag}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <p>${safeAuthor}</p>
    <p>${safeDescription}</p>
    <p><a href="${safeUrl}">Read on Familiar</a></p>
  </body>
</html>`;
};

export default async function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";

  // Real people get the untouched SPA. This is the common path and it
  // costs one regex test.
  if (!CRAWLER_PATTERN.test(userAgent)) {
    return next();
  }

  const url = new URL(request.url);
  const id = url.pathname.split("/").filter(Boolean)[1];
  const canonical = `${SITE_URL}/article/${id}`;

  const genericPayload = {
    title: "Familiar",
    description: "A quiet place to read, write, and think out loud.",
    authorName: "",
    image: FALLBACK_IMAGE,
    url: canonical,
    isCover: false,
  };

  const genericResponse = () =>
    new Response(buildHtml(genericPayload), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });

  if (!id) return genericResponse();

  try {
    // Crawlers give up quickly. If Render is cold-starting we would rather
    // bail out and serve the generic card than hang until the bot times out
    // and shows nothing at all.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${API_URL}/articles/${id}/meta`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("meta request failed");

    const meta = await res.json();

    // No image in the article body, so render a typographic card for this
    // specific article instead of the one shared static image.
    const generatedCard = `${SITE_URL}/api/og?id=${id}`;

    return new Response(
      buildHtml({
        title: meta.title || "Familiar",
        description:
          meta.description ||
          "A quiet place to read, write, and think out loud.",
        authorName: meta.authorName || "",
        image: meta.coverImage || generatedCard,
        url: canonical,
        isCover: Boolean(meta.coverImage),
      }),
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
          // Safe to cache. The article's title and author rarely change,
          // and crawlers re-fetch far more often than articles get edited.
          "cache-control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  } catch {
    // Backend cold, down, or slow. Serve the branded generic card so the
    // share still looks intentional, and tell the edge not to remember it.
    return genericResponse();
  }
}
