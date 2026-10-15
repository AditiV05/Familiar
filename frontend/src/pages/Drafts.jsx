import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import "./Drafts.css";

const editedAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "Edited just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `Edited ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Edited ${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Edited ${d}d ago`;
  return `Edited ${new Date(date).toLocaleDateString()}`;
};

const Drafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios
      .get(`${API_URL}/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDrafts(res.data))
      .catch(() => setError("Could not load your drafts. Try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const confirmDelete = async () => {
    const id = deleteTarget._id;
    setDeleteTarget(null);
    try {
      await axios.delete(`${API_URL}/drafts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrafts((prev) => prev.filter((d) => d._id !== id));
    } catch {
      setError("Could not delete that draft. Try again.");
    }
  };

  return (
    <div className="drafts-container">
      <h1 className="drafts-title">Drafts</h1>
      <p className="drafts-sub">
        Stories you started. Saved as you write, only visible to you.
      </p>

      {error && <p className="drafts-error">{error}</p>}

      {loading ? (
        <p className="drafts-status">Loading your drafts...</p>
      ) : drafts.length > 0 ? (
        <div className="drafts-list">
          {drafts.map((draft) => (
            <div key={draft._id} className="draft-item">
              <Link to={`/write?draft=${draft._id}`} className="draft-link">
                <h2
                  className={`draft-name ${draft.title.trim() ? "" : "untitled"}`}
                >
                  {draft.title.trim() || "Untitled draft"}
                </h2>
                {(draft.description || draft.preview) && (
                  <p className="draft-preview">
                    {draft.description || draft.preview}
                  </p>
                )}
                <span className="draft-meta">{editedAgo(draft.updatedAt)}</span>
              </Link>
              <button
                type="button"
                className="draft-delete"
                onClick={() => setDeleteTarget(draft)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="drafts-empty">
            <p>No drafts yet.</p>
            <span>
              Start writing and leave whenever you like. It will be here.
            </span>
          </div>
        )
      )}

      {/* Same modal styles as deleting an article (pages/Article.css). */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">Delete this draft?</h4>
            <p className="modal-text">
              &ldquo;{deleteTarget.title.trim() || "Untitled draft"}&rdquo;
              will be gone for good.
            </p>
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

export default Drafts;
