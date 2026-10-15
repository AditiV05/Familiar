const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Draft = require("../models/Draft");
const authenticateToken = require("../middleware/authMiddleware");
const summarise = require("../utils/summarise");

// Every draft route is private to its author.
router.use(authenticateToken);

// Only these fields can be written. Stops a request from reassigning the
// author or anything else on the document.
const pickFields = (body = {}) => {
  const fields = {};
  for (const key of ["title", "description", "content"]) {
    if (typeof body[key] === "string") fields[key] = body[key];
  }
  return fields;
};

// A malformed id would otherwise throw a CastError and come back as a 500.
const findOwnDraft = (id, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Draft.findOne({ _id: id, author: userId });
};

// List the current user's drafts, most recently edited first. The body is
// cut down to a preview line so the list stays light.
router.get("/", async (req, res) => {
  try {
    const drafts = await Draft.find({ author: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      drafts.map((d) => ({
        _id: d._id,
        title: d.title,
        description: d.description,
        preview: summarise(d.content, 140),
        updatedAt: d.updatedAt,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const draft = await findOwnDraft(req.params.id, req.user.id);
    if (!draft) return res.status(404).json({ message: "Draft not found" });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const draft = await Draft.create({
      ...pickFields(req.body),
      author: req.user.id,
    });
    res.status(201).json(draft);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const draft = await findOwnDraft(req.params.id, req.user.id);
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    draft.set(pickFields(req.body));
    await draft.save();
    res.json(draft);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const draft = await findOwnDraft(req.params.id, req.user.id);
    if (!draft) return res.status(404).json({ message: "Draft not found" });

    await draft.deleteOne();
    res.json({ message: "Draft deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
