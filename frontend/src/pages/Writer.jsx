import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ArticleEditor from "../components/ArticleEditor";
import "./Writer.css";

const cleanContent = (html) => {
  if (!html) return "";
  return html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim();
};

// How long typing has to pause before the draft is saved.
const SAVE_DELAY = 1500;

const BLANK = { title: "", description: "", content: "" };

// Nothing worth keeping yet. Opening /write and leaving should not litter
// the drafts list with empty entries.
const isEmpty = ({ title, description, content }) =>
  !title.trim() &&
  !description.trim() &&
  !/<img/i.test(content) &&
  !cleanContent(content)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .trim();

const STATUS_LABEL = {
  idle: "Draft",
  loading: "Loading draft...",
  saving: "Saving...",
  saved: "Saved to drafts",
  error: "Not saved. Check your connection.",
};

const Write = () => {
  const [searchParams] = useSearchParams();
  // Read once. Each visit to /write is its own mount (see the wrapper below).
  const [initialDraftId] = useState(() => searchParams.get("draft"));

  const [article, setArticle] = useState(BLANK);
  const [status, setStatus] = useState(initialDraftId ? "loading" : "idle");
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  // A fast double tap can fire again before React re-renders the disabled
  // button. The ref blocks it synchronously; the state is only for the label.
  const inFlight = useRef(false);

  // Autosave bookkeeping lives in refs so the save, unmount and page-hide
  // handlers always see the latest values without re-subscribing.
  const latest = useRef(BLANK);
  const draftId = useRef(null);
  const dirty = useRef(false);
  const timer = useRef(null);
  const saving = useRef(null);
  const published = useRef(false);
  const mounted = useRef(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const saveNow = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;

    // One save at a time. Two overlapping first saves would create two drafts.
    while (saving.current) await saving.current;
    if (published.current || !dirty.current) return;

    const snapshot = latest.current;
    if (!draftId.current && isEmpty(snapshot)) return;

    dirty.current = false;
    const run = (async () => {
      if (mounted.current) setStatus("saving");
      try {
        const headers = { Authorization: `Bearer ${token}` };
        if (draftId.current) {
          await axios.put(`${API_URL}/drafts/${draftId.current}`, snapshot, {
            headers,
          });
        } else {
          const res = await axios.post(`${API_URL}/drafts`, snapshot, {
            headers,
          });
          draftId.current = res.data._id;
          // Put the draft in the address bar so a refresh reopens it. Done
          // behind the router's back on purpose: a router navigation would
          // remount this page mid-sentence.
          if (mounted.current) {
            window.history.replaceState(
              window.history.state,
              "",
              `/write?draft=${draftId.current}`,
            );
          }
        }
        if (mounted.current) setStatus("saved");
      } catch {
        // Keep the changes marked unsaved so the next edit tries again.
        dirty.current = true;
        if (mounted.current) setStatus("error");
      }
    })();

    saving.current = run;
    try {
      await run;
    } finally {
      if (saving.current === run) saving.current = null;
    }
  }, [token]);

  const update = (changes) => {
    const next = { ...latest.current, ...changes };
    latest.current = next;
    setArticle(next);
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, SAVE_DELAY);
  };

  const handleChange = (e) => {
    update({ [e.target.name]: e.target.value });
  };

  const handleContentChange = (value, delta, source) => {
    // Quill also reports its own clean-up of loaded HTML. Only the author's
    // edits should trigger a save.
    if (source === "user") {
      update({ content: value });
    } else {
      latest.current = { ...latest.current, content: value };
      setArticle(latest.current);
    }
  };

  // Reopening a saved draft.
  useEffect(() => {
    if (!initialDraftId) return;

    axios
      .get(`${API_URL}/drafts/${initialDraftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (!mounted.current) return;
        const { title = "", description = "", content = "" } = res.data;
        latest.current = { title, description, content };
        setArticle(latest.current);
        draftId.current = res.data._id;
        setStatus("saved");
      })
      .catch(() => {
        if (!mounted.current) return;
        // Deleted or someone else's. Start fresh rather than overwrite it.
        window.history.replaceState(window.history.state, "", "/write");
        setError("That draft could not be found. Starting a new one.");
        setStatus("idle");
      });
  }, [initialDraftId, token]);

  // Leaving the page. Moving elsewhere in the app unmounts this component, so
  // the cleanup saves. Closing the tab or switching apps on a phone does not,
  // so those are handled separately.
  useEffect(() => {
    mounted.current = true;

    const handleHidden = () => {
      if (document.visibilityState === "hidden" && dirty.current) saveNow();
    };

    // The page is going away and a normal request would be cancelled.
    // keepalive lets it finish after the tab closes.
    const handlePageHide = () => {
      if (!dirty.current || published.current) return;
      const snapshot = latest.current;
      if (!draftId.current && isEmpty(snapshot)) return;

      const id = draftId.current;
      fetch(id ? `${API_URL}/drafts/${id}` : `${API_URL}/drafts`, {
        method: id ? "PUT" : "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(snapshot),
      }).catch(() => {});
      dirty.current = false;
    };

    // keepalive requests are capped at 64KB, so a long article might not make
    // it. If the last few seconds are still unsaved, let the browser ask.
    const handleBeforeUnload = (e) => {
      if (!dirty.current || published.current) return;
      if (!draftId.current && isEmpty(latest.current)) return;
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      mounted.current = false;
      if (dirty.current && !published.current) saveNow();
      else clearTimeout(timer.current);
    };
  }, [saveNow, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;

    inFlight.current = true;
    setPublishing(true);
    setError("");

    // Let a save that is already on its way finish, so its draft id is known
    // and the draft can be removed once the article is live.
    clearTimeout(timer.current);
    while (saving.current) await saving.current;
    published.current = true;

    try {
      const payload = {
        ...latest.current,
        content: cleanContent(latest.current.content),
        draftId: draftId.current,
      };

      const response = await axios.post(`${API_URL}/articles`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newArticleId = response.data._id;
      // Deliberately not resetting on success: we are navigating away, and
      // re-enabling would flash the button back to "Publish" on the way out.
      navigate(`/article/${newArticleId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post article");
      published.current = false;
      inFlight.current = false;
      setPublishing(false);
      if (dirty.current) timer.current = setTimeout(saveNow, SAVE_DELAY);
    }
  };

  // Typing into a blank editor while the draft is on its way would be
  // overwritten when it lands.
  if (status === "loading") {
    return <p className="writer-loading">Loading draft...</p>;
  }

  return (
    <div className="writer-container">
      <form onSubmit={handleSubmit} className="writer-form">
        <div className="writer-topbar">
          <span
            className={`writer-label ${status === "error" ? "writer-label-error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {STATUS_LABEL[status]}
          </span>
          <button
            type="submit"
            className="writer-submit-btn"
            disabled={publishing}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <input
          type="text"
          name="title"
          placeholder="Title"
          value={article.title}
          onChange={handleChange}
          required
          className="writer-input title-input"
        />

        <input
          type="text"
          name="description"
          placeholder="Short description (optional)"
          value={article.description}
          onChange={handleChange}
          className="writer-input description-input"
        />

        <ArticleEditor
          value={article.content}
          onChange={handleContentChange}
          placeholder="Tell your story..."
        />
      </form>
    </div>
  );
};

// Every visit to /write gets a fresh editor, including clicking "Write" while
// already on it. The old one saves its work as it unmounts.
const Writer = () => {
  const location = useLocation();
  return <Write key={location.key} />;
};

export default Writer;
