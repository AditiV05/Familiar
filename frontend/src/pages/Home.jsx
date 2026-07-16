import { useEffect, useState } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import ArticleCard from "../components/ArticleCard";
import { API_URL } from "../config";
import "./Home.css";

const TRENDING = [
  {
    title: "The MERN stack explained for beginners",
    url: "https://medium.com",
  },
  { title: "React hooks you'll actually use", url: "https://medium.com" },
  {
    title: "Why NoSQL databases are everywhere now",
    url: "https://medium.com",
  },
];

const Home = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const fetchMoreArticles = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/articles?page=${page}&limit=${LIMIT}`,
      );
      const newArticles = res.data;

      setArticles((prevArticles) => [...prevArticles, ...newArticles]);
      setPage((prevPage) => prevPage + 1);

      if (newArticles.length < LIMIT) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      setHasMore(false);
    }
  };

  useEffect(() => {
    fetchMoreArticles();
  }, []);

  return (
    <div className="home-container">
      <div className="feed">
        <InfiniteScroll
          dataLength={articles.length}
          next={fetchMoreArticles}
          hasMore={hasMore}
          loader={<p className="feed-status">Loading more articles...</p>}
          endMessage={
            <p className="feed-status">You&apos;ve reached the end!</p>
          }
        >
          {articles.length > 0 ? (
            articles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))
          ) : (
            <p className="feed-status">No articles found.</p>
          )}
        </InfiniteScroll>
      </div>

      <aside className="sidebar">
        <h3 className="sidebar-title">Trending on Familiar</h3>
        <div className="trending-list">
          {TRENDING.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="trending-item"
            >
              <span className="trending-rank">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="trending-text">{item.title}</span>
            </a>
          ))}
        </div>
        <p className="trending-note">
          Handpicked from around the web while Familiar grows. This section will
          fill with real stories as more people write and react.
        </p>
      </aside>
    </div>
  );
};

export default Home;
