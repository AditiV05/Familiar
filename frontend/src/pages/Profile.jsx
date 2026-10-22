import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import { getInitial, getAvatarColor } from "../utils/avatarColor";
import "./Profile.css";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [articles, setArticles] = useState([]);
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    // Signed in, the server also returns your own email on your profile.
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(`${API_URL}/users/${id}`, { headers }).then((res) => {
      setUser(res.data.user);
      setArticles(
        res.data.articles.sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
      setIsFollowing(
        res.data.user.followers.some((f) => f._id === currentUserId),
      );
    });
  }, [id, currentUserId, token]);

  const handleFollowToggle = async () => {
    const endpoint = isFollowing ? "unfollow" : "follow";
    try {
      await axios.post(
        `${API_URL}/users/${id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error("Follow/unfollow failed", err);
    }
  };

  if (!user) return <p className="profile-loading">Loading...</p>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div
          className="profile-avatar"
          style={{ background: getAvatarColor(user.name) }}
        >
          {getInitial(user.name)}
        </div>
        <h1 className="profile-name">{user.name}</h1>
        {currentUserId === id && <p className="profile-email">{user.email}</p>}
        {user.bio ? (
          <p className="profile-bio">{user.bio}</p>
        ) : (
          <p className="profile-bio empty">No bio added yet.</p>
        )}

        {token && currentUserId !== id && (
          <button
            className={`follow-btn ${isFollowing ? "unfollow" : "follow"}`}
            onClick={handleFollowToggle}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        {token && currentUserId === id && (
          <button
            className="edit-profile-btn"
            onClick={() => navigate("/edit-profile")}
          >
            Edit profile
          </button>
        )}
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat-num">{user.followers.length}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat">
          <span className="stat-num">{user.following.length}</span>
          <span className="stat-label">Following</span>
        </div>
        <div className="stat">
          <span className="stat-num">{articles.length}</span>
          <span className="stat-label">Stories</span>
        </div>
      </div>

      <h3 className="profile-articles-heading">Stories by {user.name}</h3>

      <div className="profile-articles">
        {articles.length === 0 ? (
          <p className="profile-empty">No stories yet.</p>
        ) : (
          articles.map((article) => (
            <div className="profile-article-card" key={article._id}>
              <Link
                to={`/article/${article._id}`}
                className="profile-article-link"
              >
                <h4>{article.title}</h4>
                {article.description && <p>{article.description}</p>}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Profile;
