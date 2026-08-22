import { useRef, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import ArticleEditor from "../components/ArticleEditor";
import "./Writer.css";

const cleanContent = (html) => {
  if (!html) return "";
  return html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim();
};

const Write = () => {
  const [article, setArticle] = useState({
    title: "",
    description: "",
    content: "",
  });

  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  // A fast double tap can fire again before React re-renders the disabled
  // button. The ref blocks it synchronously; the state is only for the label.
  const inFlight = useRef(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setArticle({ ...article, [e.target.name]: e.target.value });
  };

  const handleContentChange = (value) => {
    setArticle({ ...article, content: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;

    inFlight.current = true;
    setPublishing(true);
    setError("");

    try {
      const payload = {
        ...article,
        content: cleanContent(article.content),
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
      inFlight.current = false;
      setPublishing(false);
    }
  };

  return (
    <div className="writer-container">
      <form onSubmit={handleSubmit} className="writer-form">
        <div className="writer-topbar">
          <span className="writer-label">Draft</span>
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

export default Write;
