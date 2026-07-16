import { useEffect, useState } from "react";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import ArticleCard from "../components/ArticleCard";
import { API_URL } from "../config";
import "./Home.css";

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
    </div>
  );
};

export default Home;
