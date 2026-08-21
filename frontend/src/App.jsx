import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { API_URL } from "./config";
import Home from "./pages/Home";
import Article from "./pages/Article";
import Profile from "./pages/Profile";
import Writer from "./pages/Writer";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import GoogleSuccess from "./pages/GoogleSuccess";
import PrivateRoute from "./utils/PrivateRoute";
import SearchResults from "./pages/SearchResults";
import EditArticle from "./pages/EditArticle";
import Saved from "./pages/Saved";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
// import Footer from "./components/Footer";

function Layout() {
  const location = useLocation();
  const hideChrome =
    ["/login", "/signup", "/forgot-password"].includes(location.pathname) ||
    location.pathname.startsWith("/reset-password");

  return (
    <div className="app-shell">
      {!hideChrome && <Navbar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<Article />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/profile/:id/" element={<Profile />} />
          <Route path="/search" element={<SearchResults />} />
          <Route
            path="/write"
            element={
              <PrivateRoute>
                <Writer />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <PrivateRoute>
                <EditArticle />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/google-success" element={<GoogleSuccess />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/verify/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </main>
      {/* {!hideChrome && <Footer />} */}
    </div>
  );
}

function App() {
  // Render's free tier sleeps after inactivity and takes around 40 seconds to
  // wake. Nudge it the moment the app loads, so it is already up by the time
  // someone signs in or opens an article. Failure here is harmless.
  useEffect(() => {
    fetch(`${API_URL}/health`).catch(() => {});
  }, []);

  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
