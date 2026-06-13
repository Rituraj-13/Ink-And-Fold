import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
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
