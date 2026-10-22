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
  const [followerCount, setFollowerCount] = useState(0);
  const [articles, setArticles] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");

  useEffect(() => {
    // Clear the last profile so moving between profiles never shows the
    // previous person while the next one loads.
    setUser(null);
    setLoadError("");
    setFollowError("");

    let cancelled = false;
    // Signed in, the server also returns your own email on your profile.
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios
      .get(`${API_URL}/users/${id}`, { headers })
      .then((res) => {
        if (cancelled) return;
        setUser(res.data.user);
        setFollowerCount(res.data.user.followers.length);
        setArticles(
          res.data.articles.sort((a, b) => new Date(b.date) - new Date(a.date)),
        );
        setIsFollowing(
          res.data.user.followers.some((f) => f._id === currentUserId),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err.response?.status === 404
            ? "This profile doesn't exist."
            : "Couldn't load this profile. Check your connection and try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [id, currentUserId, token, reloadKey]);

  const handleFollowToggle = async () => {
    // One request at a time. A second tap mid-request used to send a second
    // follow and count the same person twice.
    if (followBusy) return;
    setFollowBusy(true);
    setFollowError("");

    const endpoint = isFollowing ? "unfollow" : "follow";
    try {
      const res = await axios.post(
        `${API_URL}/users/${id}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsFollowing(res.data.following);
      setFollowerCount(res.data.followers);
    } catch (err) {
      console.error("Follow/unfollow failed", err);
      setFollowError("Couldn't update. Try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="profile-status">
        <p>{loadError}</p>
        <button
          className="edit-profile-btn"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

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
          <>
            <button
              className={`follow-btn ${isFollowing ? "unfollow" : "follow"}`}
              onClick={handleFollowToggle}
              disabled={followBusy}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
            {followError && (
              <p className="profile-follow-error" role="alert">
                {followError}
              </p>
            )}
          </>
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
          <span className="stat-num">{followerCount}</span>
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
