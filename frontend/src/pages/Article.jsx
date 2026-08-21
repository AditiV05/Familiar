import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import { getInitial, getAvatarColor } from "../utils/avatarColor";
import "./Article.css";

const getReadTime = (html) => {
  if (!html) return "1 min read";
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
};

const cleanContent = (html) => {
  if (!html) return "";
  return html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim();
};

const HeartIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z" />
  </svg>
);

const CommentIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 15V3" />
    <path d="m8 6.5 4-4 4 4" />
    <path d="M20 14v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V14" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6.5 9.5 17 4 11.5" />
  </svg>
);

const Article = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "";

  const fetchArticle = async () => {
    try {
      const articleRes = await axios.get(`${API_URL}/articles/${id}`);
      setArticle(articleRes.data);
      const commentRes = await axios.get(`${API_URL}/articles/${id}/comments`);
      setComments(commentRes.data);
    } catch (err) {
      console.error("Error loading article:", err);
    }
  };

  useEffect(() => {
    setCopied(false);
    fetchArticle();
  }, [id]);

  // Revert the "Copied" label, and clear the timer if the user leaves first.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/article/${id}`;

    // Phones and some desktop browsers: open the real OS share sheet.
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Dismissing the sheet is a choice, not a failure. Anything else
        // drops through to copy so the button is never a dead end.
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Older or restricted browsers with no clipboard API.
      const temp = document.createElement("textarea");
      temp.value = shareUrl;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }

    setCopied(true);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/articles/${id}/comment`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCommentText("");
      fetchArticle();
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleReplySubmit = async (e, commentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await axios.post(
        `${API_URL}/articles/${id}/comment/${commentId}/reply`,
        { text: replyText },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setReplyText("");
      setReplyingTo(null);
      fetchArticle();
    } catch (err) {
      console.error("Failed to add reply", err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "comment") {
        await axios.delete(
          `${API_URL}/articles/${id}/comment/${deleteTarget.commentId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        await axios.delete(
          `${API_URL}/articles/${id}/comment/${deleteTarget.commentId}/reply/${deleteTarget.replyId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setDeleteTarget(null);
      fetchArticle();
    } catch (err) {
      console.error("Failed to delete", err);
      setDeleteTarget(null);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/");
    } catch (err) {
      console.error("Failed to delete article", err);
    }
  };

  const handleLike = async () => {
    const alreadyLiked = article.likes.includes(userId);
    setArticle((prev) => ({
      ...prev,
      likes: alreadyLiked
        ? prev.likes.filter((uid) => uid !== userId)
        : [...prev.likes, userId],
    }));
    try {
      await axios.post(
        `${API_URL}/articles/${id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error("Failed to like article", err);
      fetchArticle();
    }
  };

  const handleBookmark = async () => {
    const alreadyBookmarked = article.bookmarks.includes(userId);
    setArticle((prev) => ({
      ...prev,
      bookmarks: alreadyBookmarked
        ? prev.bookmarks.filter((uid) => uid !== userId)
        : [...prev.bookmarks, userId],
    }));
    try {
      await axios.post(
        `${API_URL}/articles/${id}/bookmark`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error("Failed to bookmark article", err);
      fetchArticle();
    }
  };

  if (!article) return <p className="article-loading">Loading...</p>;

  const isOwner = article.author._id === userId;

  return (
    <div className="article-container">
      <header className="article-header">
        <h1 className="article-title">{article.title}</h1>
        {article.description && (
          <p className="article-description">{article.description}</p>
        )}

        <div className="article-byline">
          <div
            className="byline-avatar"
            style={{ background: getAvatarColor(article.author.name) }}
            onClick={() => navigate(`/profile/${article.author._id}`)}
          >
            {getInitial(article.author.name)}
          </div>
          <div className="byline-info">
            <span
              className="byline-name"
              onClick={() => navigate(`/profile/${article.author._id}`)}
            >
              {article.author.name}
            </span>
            <span className="byline-meta">
              {new Date(article.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {getReadTime(article.content)}
            </span>
          </div>
        </div>
      </header>

      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: cleanContent(article.content) }}
      />

      {isOwner && (
        <div className="article-owner-actions">
          <button onClick={() => navigate(`/edit/${id}`)}>Edit</button>
          <button onClick={handleDelete} className="delete-btn">
            Delete
          </button>
        </div>
      )}

      <div className="article-engagement">
        <button className="engage-btn" onClick={handleLike}>
          <span
            className={`engage-icon ${article.likes.includes(userId) ? "liked-active" : ""}`}
          >
            <HeartIcon />
          </span>
          {article.likes.length}
        </button>
        <span className="engage-btn engage-static">
          <span className="engage-icon">
            <CommentIcon />
          </span>
          {comments.length}
        </span>
        <button
          className="engage-btn engage-bookmark"
          onClick={handleBookmark}
          aria-label="Bookmark"
        >
          <span
            className={`engage-icon ${article.bookmarks.includes(userId) ? "bookmarked-active" : ""}`}
          >
            <BookmarkIcon />
          </span>
          {article.bookmarks.length}
        </button>
        <button
          className={`engage-btn engage-share ${copied ? "share-copied" : ""}`}
          onClick={handleShare}
          aria-label="Share this article"
        >
          <span className="engage-icon">
            {copied ? <CheckIcon /> : <ShareIcon />}
          </span>
          <span className="engage-label">{copied ? "Copied" : "Share"}</span>
        </button>
      </div>

      <section className="responses-section">
        <h3 className="responses-title">Responses ({comments.length})</h3>

        {token && (
          <div className="comment-composer">
            <div
              className="composer-avatar"
              style={{ background: getAvatarColor(userName) }}
            >
              {getInitial(userName)}
            </div>
            <form className="composer-body" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                rows="2"
                required
              />
              <div className="composer-actions">
                <button type="submit">Respond</button>
              </div>
            </form>
          </div>
        )}

        <div className="comment-list">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment._id} className="comment-item">
                <div
                  className="comment-avatar"
                  style={{ background: getAvatarColor(comment.user.name) }}
                >
                  {getInitial(comment.user.name)}
                </div>
                <div className="comment-body">
                  <div className="comment-head">
                    <span className="comment-name">{comment.user.name}</span>
                    {comment.date && (
                      <span className="comment-time">
                        {new Date(comment.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="comment-text">{comment.text}</p>

                  <div className="comment-actions">
                    {token && (
                      <button
                        className="reply-btn"
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment._id ? null : comment._id,
                          )
                        }
                      >
                        Reply
                      </button>
                    )}
                    {token &&
                      (comment.user._id === userId ||
                        article.author._id === userId) && (
                        <button
                          className="delete-comment-btn"
                          onClick={() =>
                            setDeleteTarget({
                              type: "comment",
                              commentId: comment._id,
                            })
                          }
                        >
                          Delete
                        </button>
                      )}
                  </div>

                  {replyingTo === comment._id && (
                    <form
                      className="reply-form"
                      onSubmit={(e) => handleReplySubmit(e, comment._id)}
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows="2"
                        required
                      />
                      <div className="reply-actions">
                        <button
                          type="button"
                          className="reply-cancel"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit">Reply</button>
                      </div>
                    </form>
                  )}

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="reply-list">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="reply-item">
                          <div
                            className="reply-avatar"
                            style={{
                              background: getAvatarColor(reply.user.name),
                            }}
                          >
                            {getInitial(reply.user.name)}
                          </div>
                          <div className="reply-body">
                            <div className="comment-head">
                              <span className="comment-name">
                                {reply.user.name}
                              </span>
                              {reply.date && (
                                <span className="comment-time">
                                  {new Date(reply.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="comment-text">{reply.text}</p>
                            {token &&
                              (reply.user._id === userId ||
                                article.author._id === userId) && (
                                <button
                                  className="delete-comment-btn"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "reply",
                                      commentId: comment._id,
                                      replyId: reply._id,
                                    })
                                  }
                                >
                                  Delete
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="comment-empty">
              No responses yet. Be the first to respond.
            </p>
          )}
        </div>
      </section>
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">Delete this {deleteTarget.type}?</h4>
            <p className="modal-text">This can&apos;t be undone.</p>
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="modal-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Article;
