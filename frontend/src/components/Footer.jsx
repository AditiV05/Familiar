import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-inner">
      <Link to="/" className="footer-mark">
        Familiar
      </Link>
      <span className="footer-note">© {new Date().getFullYear()}</span>
    </div>
  </footer>
);

export default Footer;
