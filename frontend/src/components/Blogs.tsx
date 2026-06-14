import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import type { Blog } from "../types";

const TICKER_ITEMS = [
  "Long-form essays",
  "Tech & Culture",
  "Personal narratives",
  "Philosophy & Ideas",
  "Creative writing",
  "Opinion pieces",
  "Deep dives",
  "Interview series",
];

function getAuthorName(blog: Blog): string {
  return blog.author?.name || blog.author?.email || "Anonymous";
}

function getAuthorInitials(blog: Blog): string {
  const name = getAuthorName(blog);
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

const BlogsPage = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await api.get("/api/v1/blog/all");
      setBlogs(res.data.blogs || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/signin");
      } else {
        setError("Failed to load stories. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const tickerContent = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-label">Ink & Fold — Est. 2024</div>
          <h1 className="hero-title">
            Stories worth
            <br />
            <em>reading twice.</em>
          </h1>
          <p className="hero-subtitle">
            A curated space for writers who believe words matter. No clutter,
            no noise — just authentic human stories.
          </p>
          <div className="hero-actions">
            <Link to="/write" className="btn-primary">
              Start Writing
            </Link>
            <a
              href="#stories"
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("stories")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Browse Stories ↓
            </a>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker-bar" aria-hidden="true">
        <div className="ticker-inner">
          {tickerContent.map((item, i) => (
            <span key={i} className="ticker-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Stories */}
      <main
        id="stories"
        className="container"
        style={{ paddingTop: "3rem", paddingBottom: "5rem" }}
      >
        <div className="section-header">
          <h2 className="section-title">Latest Stories</h2>
          <span className="section-label">
            {blogs.length} {blogs.length === 1 ? "story" : "stories"} published
          </span>
        </div>

        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading stories...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠</div>
            <p className="empty-title">Something went wrong</p>
            <p className="empty-subtitle">{error}</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p className="empty-title">No stories yet</p>
            <p className="empty-subtitle">
              Be the first to publish something worth reading.
            </p>
            <Link
              to="/write"
              className="btn-primary"
              style={{ display: "inline-flex", marginTop: "1.5rem" }}
            >
              Write First Story
            </Link>
          </div>
        ) : (
          <div className="blog-grid">
            {blogs.map((blog, index) => (
              <Link
                key={blog.id}
                to={`/blog/${blog.id}`}
                className={`blog-card ${index === 0 ? "blog-featured" : ""}`}
                style={{ display: index === 0 ? "grid" : "flex" }}
              >
                {index === 0 ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <div className="blog-card-tag">Featured Story</div>
                      <h2 className="blog-card-title">{blog.title}</h2>
                      <p className="blog-card-excerpt">{blog.content}</p>
                      <div className="blog-card-meta">
                        <div className="blog-card-author">
                          <div className="author-avatar">
                            {getAuthorInitials(blog)}
                          </div>
                          <span>{getAuthorName(blog)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                          <span className="blog-card-read">
                            {estimateReadTime(blog.content)}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8rem", color: "var(--ink-muted)" }} title="Likes">
                            ❤️ {blog._count?.likes ?? 0}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8rem", color: "var(--ink-muted)" }} title="Responses">
                            💬 {blog._count?.comments ?? 0}
                          </span>
                          {blog.bookmarks && blog.bookmarks.length > 0 && (
                            <span style={{ fontSize: "0.8rem" }} title="Bookmarked">
                              🔖
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="featured-visual">
                      {blog.coverImage ? (
                        <img
                          src={blog.coverImage}
                          alt={blog.title}
                          className="featured-cover-img"
                        />
                      ) : (
                        <div className="featured-visual-inner"></div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="blog-card-number">
                      {String(index).padStart(2, "0")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="blog-card-tag">Story</div>
                      <h3 className="blog-card-title">{blog.title}</h3>
                      <p className="blog-card-excerpt">{blog.content}</p>
                      <div className="blog-card-meta">
                        <div className="blog-card-author">
                          <div className="author-avatar">
                            {getAuthorInitials(blog)}
                          </div>
                          <span>{getAuthorName(blog)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                          <span className="blog-card-read">
                            {estimateReadTime(blog.content)}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8rem", color: "var(--ink-muted)" }} title="Likes">
                            ❤️ {blog._count?.likes ?? 0}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.8rem", color: "var(--ink-muted)" }} title="Responses">
                            💬 {blog._count?.comments ?? 0}
                          </span>
                          {blog.bookmarks && blog.bookmarks.length > 0 && (
                            <span style={{ fontSize: "0.8rem" }} title="Bookmarked">
                              🔖
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {blog.coverImage && (
                      <div className="blog-card-thumb">
                        <img src={blog.coverImage} alt={blog.title} className="blog-card-thumb-img" />
                      </div>
                    )}
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogsPage;
