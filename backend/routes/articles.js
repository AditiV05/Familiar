const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Article = require("../models/Article");
const authenticateToken = require("../middleware/authMiddleware");
const createNotification = require("../utils/createNotification");

// Pull the first <img src> out of the article body.
// Mirrors getFirstImage(html) in frontend/src/components/ArticleCard.jsx
// so the feed card and the link preview always show the same image.
const getFirstImage = (html) => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  const src = match[1].trim();
  // Crawlers need an absolute URL. Skip relative paths and data URIs.
  if (!/^https?:\/\//i.test(src)) return null;
  return src;
};

// Turn article HTML into a short plain-text summary for the OG description
// when the article has no subtitle of its own.
const summarise = (html, maxLength = 160) => {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + "...";
};

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const articles = await Article.find()
      .populate("author", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all articles the current user has bookmarked
router.get("/user/bookmarks", authenticateToken, async (req, res) => {
  try {
    const articles = await Article.find({ bookmarks: req.user.id })
      .populate("author", "name")
      .sort({ date: -1 });

    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// populating
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate("author", "name")
      .populate("comments.user", "name");
    if (!article) return res.status(404).json({ message: "Article not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lightweight metadata for Open Graph link previews.
// Used by the Vercel Edge Middleware, which serves crawlers a small HTML page
// carrying real per-article <meta> tags. Deliberately excludes comments,
// likes and bookmarks so the middleware stays fast.
router.get("/:id/meta", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Article not found" });
    }

    const article = await Article.findById(req.params.id)
      .select("title description content author date")
      .populate("author", "name")
      .lean();

    if (!article) return res.status(404).json({ message: "Article not found" });

    // Public, unchanging data. Let the edge cache absorb repeat crawler hits
    // instead of waking the Render instance every time.
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");

    res.json({
      title: article.title || "Familiar",
      description: article.description || summarise(article.content),
      authorName: article.author?.name || "",
      coverImage: getFirstImage(article.content),
      date: article.date || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { title, description, content } = req.body;
  const newArticle = new Article({
    title,
    description,
    content,
    author: req.user.id,
  });

  try {
    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });
    if (article.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    const updated = await Article.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });
    if (article.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: "Article deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like or Unlike an Article
router.post("/:id/like", authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const userId = req.user.id;
    const hasLiked = article.likes.includes(userId);

    if (hasLiked) {
      article.likes = article.likes.filter((id) => id.toString() !== userId);
    } else {
      article.likes.push(userId);
      // notify the author on a new like (not on unlike)
      await createNotification({
        recipient: article.author,
        sender: userId,
        type: "like",
        article: article._id,
      });
    }

    await article.save();
    res.json({ likes: article.likes, count: article.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bookmark or Un-bookmark an Article
router.post("/:id/bookmark", authenticateToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const userId = req.user.id;
    const hasBookmarked = article.bookmarks.includes(userId);

    if (hasBookmarked) {
      article.bookmarks = article.bookmarks.filter(
        (id) => id.toString() !== userId,
      );
    } else {
      article.bookmarks.push(userId);
    }

    await article.save();
    res.json({ bookmarks: article.bookmarks, count: article.bookmarks.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment to an article
router.post("/:id/comment", authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: "Article not found" });

    const newComment = { user: req.user.id, text };
    article.comments.push(newComment);

    await article.save();

    // notify the article author about the new comment
    await createNotification({
      recipient: article.author,
      sender: req.user.id,
      type: "comment",
      article: article._id,
      text: text ? text.slice(0, 100) : "",
    });

    res.json(article.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reply to a specific comment
router.post(
  "/:id/comment/:commentId/reply",
  authenticateToken,
  async (req, res) => {
    try {
      const { text } = req.body;
      const article = await Article.findById(req.params.id);
      if (!article)
        return res.status(404).json({ message: "Article not found" });

      const comment = article.comments.id(req.params.commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });

      comment.replies.push({ user: req.user.id, text });
      await article.save();

      // notify the author of the comment being replied to
      await createNotification({
        recipient: comment.user,
        sender: req.user.id,
        type: "reply",
        article: article._id,
        text: text ? text.slice(0, 100) : "",
      });

      res.json(article.comments);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Delete a comment (comment author or article owner)
router.delete(
  "/:id/comment/:commentId",
  authenticateToken,
  async (req, res) => {
    try {
      const article = await Article.findById(req.params.id);
      if (!article)
        return res.status(404).json({ message: "Article not found" });

      const comment = article.comments.id(req.params.commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });

      const isCommentAuthor = comment.user.toString() === req.user.id;
      const isArticleOwner = article.author.toString() === req.user.id;
      if (!isCommentAuthor && !isArticleOwner) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      article.comments.pull({ _id: req.params.commentId });
      await article.save();

      res.json(article.comments);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Delete a reply (reply author or article owner)
router.delete(
  "/:id/comment/:commentId/reply/:replyId",
  authenticateToken,
  async (req, res) => {
    try {
      const article = await Article.findById(req.params.id);
      if (!article)
        return res.status(404).json({ message: "Article not found" });

      const comment = article.comments.id(req.params.commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });

      const reply = comment.replies.id(req.params.replyId);
      if (!reply) return res.status(404).json({ message: "Reply not found" });

      const isReplyAuthor = reply.user.toString() === req.user.id;
      const isArticleOwner = article.author.toString() === req.user.id;
      if (!isReplyAuthor && !isArticleOwner) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      comment.replies.pull({ _id: req.params.replyId });
      await article.save();

      res.json(article.comments);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Get all comments for an article
router.get("/:id/comments", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate("comments.user", "name")
      .populate("comments.replies.user", "name");
    if (!article) return res.status(404).json({ message: "Article not found" });

    res.json(article.comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
