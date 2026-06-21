import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  let isAdmin = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isAdmin = payload.userType === "ADMIN" || payload.UserType === "ADMIN";
    } catch (e) {
      console.error("Failed to decode token in Navbar:", e);
    }
  }

  const handleLogout = async () => {
    try {
      await api.post("/api/v1/signout");
    } catch (error) {
      console.error("Failed to signout backend session:", error);
    }
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        Ink<span>&</span>Fold
      </Link>

      <div className="navbar-links">
        {token ? (
          <>
            <Link to="/blogs" className="navbar-link">Read</Link>
            <Link to="/my-posts" className="navbar-link">My Posts</Link>
            {isAdmin && <Link to="/admin" className="navbar-link">Admin</Link>}
            <Link to="/write" className="navbar-btn filled">Write</Link>
            <button onClick={handleLogout} className="navbar-btn" style={{ marginLeft: "0.25rem" }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signin" className="navbar-link">Sign In</Link>
            <Link to="/signup" className="navbar-btn filled">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
