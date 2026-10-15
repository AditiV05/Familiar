import { Link, useNavigate } from "react-router-dom";
import { getInitial, getAvatarColor } from "../utils/avatarColor";
import { useState, useEffect, useRef } from "react";
import { isLoggedIn, logout } from "../utils/auth";
import { getTheme, setTheme } from "../utils/theme";
import axios from "axios";
import { API_URL } from "../config";
import "./Navbar.css";

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const notifLabel = (n) => {
  const name = n.sender?.name || "Someone";
  if (n.type === "like") return `${name} liked your article`;
  if (n.type === "comment") return `${name} commented on your article`;
  if (n.type === "reply") return `${name} replied to your comment`;
  return "";
};

const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const userName = localStorage.getItem("userName") || "";
  const userId = localStorage.getItem("userId") || "";
  const token = localStorage.getItem("token") || "";

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(
        `${API_URL}/notifications/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const handleDeleteNotif = async (e, id) => {
    // the row itself is clickable, so stop the click before it navigates
    e.stopPropagation();

    const previous = notifications;
    // drop it straight away, put it back if the request fails
    const next = notifications.filter((n) => n._id !== id);
    setNotifications(next);
    setUnreadCount(next.filter((n) => !n.read).length);

    try {
      await axios.delete(`${API_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to delete notification", err);
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.read).length);
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) return;

    fetchNotifications();

    // poll for new notifications every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [dark, setDark] = useState(() => getTheme() === "dark");

  // The device can switch the theme too (see utils/theme), so keep the
  // switch in step rather than only flipping it on click.
  useEffect(() => {
    const sync = () => setDark(getTheme() === "dark");
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);

  const toggleTheme = () => setTheme(dark ? "light" : "dark");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setSearchQuery("");
    }
  };

  const handleBellClick = async () => {
    const opening = !showNotif;
    setShowNotif(opening);
    if (opening) {
      await fetchNotifications();
      setUnreadCount(0);
      markAllRead();
    }
  };

  const handleNotifClick = (n) => {
    setShowNotif(false);
    if (n.article?._id) navigate(`/article/${n.article._id}`);
  };

  return (
    <nav className={`navbar ${isLoggedIn() ? "navbar-auth" : "navbar-guest"}`}>
      {/* Left - Logo and Search */}
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          Familiar
        </Link>

        {/* Search moved into navbar-left */}
        <form onSubmit={handleSearch} className="simple-search-form">
          <input
            type="text"
            placeholder="Search Familiar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Center section removed or can be used for other elements */}
      <div className="navbar-center">
        {/* This can be empty or used for other elements */}
      </div>

      {/* Right - Links & Icons */}
      <div className="navbar-right">
        {isLoggedIn() ? (
          <>
            <Link to="/write" className="write-link">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 4a.5.5 0 0 0 0-1v1zm7 6a.5.5 0 0 0-1 0h1zm-7-7H4v1h10V3zM3 4v16h1V4H3zm1 17h16v-1H4v1zm17-1V10h-1v10h1zm-1 1a1 1 0 0 0 1-1h-1v1zM3 20a1 1 0 0 0 1 1v-1H3zM4 3a1 1 0 0 0-1 1h1V3z"
                  fill="currentColor"
                ></path>
                <path
                  d="M17.5 4.5l-8.46 8.46a.25.25 0 0 0-.06.1l-.82 2.47c-.07.2.12.38.31.31l2.47-.82a.25.25 0 0 0 .1-.06L19.5 6.5m-2-2l2.32-2.32c.1-.1.26-.1.36 0l1.64 1.64c.1.1.1.26 0 .36L19.5 6.5"
                  fill="currentColor"
                ></path>
              </svg>
              <span>Write</span>
            </Link>

            <div className="notif-menu" ref={notifRef}>
              <button
                className="navbar-icon bell-icon"
                onClick={handleBellClick}
                aria-label="Notifications"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                    fill="currentColor"
                  ></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="notif-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <div className={`notif-dropdown ${showNotif ? "open" : ""}`}>
                <div className="notif-header">Notifications</div>
                {notifications.length === 0 ? (
                  <p className="notif-empty">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`notif-item ${!n.read ? "unread" : ""}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div
                        className="notif-avatar"
                        style={{ background: getAvatarColor(n.sender?.name) }}
                      >
                        {getInitial(n.sender?.name)}
                      </div>
                      <div className="notif-body">
                        <p className="notif-label">{notifLabel(n)}</p>
                        {n.article?.title && (
                          <p className="notif-article">{n.article.title}</p>
                        )}
                        {n.text && <p className="notif-snippet">{n.text}</p>}
                        <span className="notif-time">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <button
                        className="notif-delete"
                        onClick={(e) => handleDeleteNotif(e, n._id)}
                        aria-label="Delete notification"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="profile-menu" ref={profileRef}>
              <div
                className="profile-circle"
                style={{ background: getAvatarColor(userName) }}
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                {getInitial(userName)}
              </div>
              <div
                className={`profile-dropdown ${showProfileMenu ? "open" : ""}`}
              >
                <Link to={`/profile/${userId}`} className="dropdown-item">
                  Profile
                </Link>
                <Link to="/drafts" className="dropdown-item">
                  Drafts
                </Link>
                <Link to="/saved" className="dropdown-item">
                  Saved
                </Link>
                <button
                  type="button"
                  className="dropdown-item theme-toggle"
                  role="switch"
                  aria-checked={dark}
                  onClick={toggleTheme}
                >
                  Dark mode
                  <span className={`theme-switch ${dark ? "on" : ""}`} />
                </button>
                <Link to="/settings" className="dropdown-item">
                  Settings
                </Link>
                <button onClick={handleLogout} className="dropdown-item logout">
                  Sign out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              Sign In
            </Link>
            <Link to="/signup" className="get-started-btn">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
