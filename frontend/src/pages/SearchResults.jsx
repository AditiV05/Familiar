import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";

const SearchResults = () => {
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const query = new URLSearchParams(location.search).get("q");

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/search?q=${query}`).then((res) => {
      setArticles(res.data.articles);
      setUsers(res.data.users);
      setLoading(false);
    });
  }, [query]);

  if (loading) return <p>Loading results...</p>;

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
      <h2>Search Results for "{query}"</h2>

      <h3>Articles</h3>
      {articles.length > 0 ? (
        articles.map((article) => (
          <div key={article._id}>
            <Link to={`/article/${article._id}`}>
              <h4>{article.title}</h4>
            </Link>
            <p>{article.description}</p>
          </div>
        ))
      ) : (
        <p>No matching articles found.</p>
      )}

      <h3>Users</h3>
      {users.length > 0 ? (
        users.map((user) => (
          <div key={user._id}>
            <Link to={`/profile/${user._id}`}>
              <p>{user.name}</p>
            </Link>
          </div>
        ))
      ) : (
        <p>No matching users found.</p>
      )}
    </div>
  );
};

export default SearchResults;
