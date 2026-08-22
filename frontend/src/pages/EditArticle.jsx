import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import ArticleEditor from "../components/ArticleEditor";
import "./EditArticle.css";

const cleanContent = (html) => {
  if (!html) return "";
  return html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim();
};

const EditArticle = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios
      .get(`${API_URL}/articles/${id}`)
      .then((res) => setArticle(res.data))
      .catch(() => setError("Failed to fetch article"));
  }, [id]);

  const handleChange = (e) => {
    setArticle({ ...article, [e.target.name]: e.target.value });
  };

  const handleContentChange = (value) => {
    setArticle({ ...article, content: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...article,
        content: cleanContent(article.content),
      };

      await axios.put(`${API_URL}/articles/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate(`/article/${id}`);
    } catch (err) {
      console.error("Failed to update article", err);
      setError("Failed to update article");
    }
  };

  if (!article) return <p className="edit-loading">Loading article...</p>;

  return (
    <div className="edit-container">
      <form onSubmit={handleSubmit} className="edit-form">
        <div className="edit-topbar">
          <span className="edit-label">Editing</span>
          <button type="submit" className="edit-submit">
            Save changes
          </button>
        </div>

        {error && <p className="edit-error">{error}</p>}

        <input
          type="text"
          name="title"
          value={article.title}
          onChange={handleChange}
          placeholder="Title"
          className="edit-input title"
          required
        />

        <input
          type="text"
          name="description"
          value={article.description}
          onChange={handleChange}
          placeholder="Short description (optional)"
          className="edit-input description"
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

export default EditArticle;
