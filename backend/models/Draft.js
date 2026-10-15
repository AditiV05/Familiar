const mongoose = require("mongoose");

// Unpublished work. Kept apart from Article so a draft can never leak into
// the feed, search, profiles or link previews, all of which query Article.
// Nothing is required except the author: a draft is allowed to be half done.
const draftSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    content: { type: String, default: "" },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Draft", draftSchema);
