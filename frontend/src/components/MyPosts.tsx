import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import type { Blog } from "../types";
import Toast from "./Toast";

type ActiveTab = "published" | "drafts" | "bookmarks";

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MyPostsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ActiveTab>("published");
  const [allPosts, setAllPosts] = useState<Blog[]>([]);
  const [bookmarks, setBookmarks] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both my posts and bookmarks in parallel
      const [postsRes, bookmarksRes] = await Promise.all([
        api.get("/api/v1/blog/user?type=all"),
        api.get("/api/v1/blog/bookmarks"),
      ]);
      setAllPosts(postsRes.data.blogs || []);
      setBookmarks(bookmarksRes.data.blogs || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const published = allPosts.filter((b) => b.status === "PUBLISHED");
  const drafts = allPosts.filter((b) => b.status === "DRAFT" || b.status === "UNDER_REVIEW");
  
  const displayed =
    tab === "published"
      ? published
      : tab === "drafts"
      ? drafts
      : bookmarks;
 
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/blog/${id}`);
      setAllPosts((prev) => prev.filter((b) => b.id !== id));
      setToast("Story deleted.");
    } catch (err: any) {
      setToast("Failed to delete. You may not own this post.");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };
 
  const handlePublishDraft = async (blog: Blog) => {
    setPublishing(blog.id);
    try {
      const response = await api.put(`/api/v1/blog/${blog.id}`, {
        title: blog.title,
        content: blog.content,
        status: "PUBLISHED",
      });
      
      const updatedBlog = response.data.blog;
      
      setAllPosts((prev) =>
        prev.map((b) =>
          b.id === blog.id ? { ...b, ...updatedBlog } : b
        )
      );
 
      if (updatedBlog?.status === "UNDER_REVIEW") {
        setToast("Flagged! Post remains a draft and under review.");
      } else {
        setToast("Story published!");
      }
    } catch (err: any) {
      setToast("Failed to publish. Try again.");
    } finally {
      setPublishing(null);
    }
  };

  const handleRemoveBookmark = async (id: string) => {
    try {
      await api.post(`/api/v1/blog/${id}/bookmark`);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      setToast("Bookmark removed.");
    } catch (err) {
      setToast("Failed to remove bookmark.");
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="myposts-hero">
        <div className="container">
          <div className="myposts-hero-inner">
            <div>
              <div className="hero-label" style={{ marginBottom: "0.8rem" }}>
                Your Library
              </div>
              <h1 className="myposts-hero-title">My Stories</h1>
              <p className="myposts-hero-sub">
                Manage your writing and saved bookmarks.
              </p>
            </div>
            <Link to="/write" className="btn-primary">
              + New Story
            </Link>
          </div>

          {/* Tab Bar */}
          <div className="myposts-tabbar">
            <button
              className={`myposts-tab ${tab === "published" ? "active" : ""}`}
              onClick={() => setTab("published")}
            >
              Published
              <span className="myposts-tab-count">{published.length}</span>
            </button>
            <button
              className={`myposts-tab ${tab === "drafts" ? "active" : ""}`}
              onClick={() => setTab("drafts")}
            >
              Drafts
              <span className="myposts-tab-count">{drafts.length}</span>
            </button>
            <button
              className={`myposts-tab ${tab === "bookmarks" ? "active" : ""}`}
              onClick={() => setTab("bookmarks")}
            >
              Bookmarks
              <span className="myposts-tab-count">{bookmarks.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main
        className="container"
        style={{ paddingTop: "2rem", paddingBottom: "5rem" }}
      >
        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p className="loading-text">Loading library...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {tab === "published" ? "📖" : tab === "drafts" ? "📝" : "🔖"}
            </div>
            <p className="empty-title">
              {tab === "published"
                ? "No published stories yet"
                : tab === "drafts"
                ? "No drafts saved"
                : "No bookmarks saved"}
            </p>
            <p className="empty-subtitle">
              {tab === "published"
                ? "Publish your first story to see it here."
                : tab === "drafts"
                ? "Save a post as draft to work on it later."
                : "Bookmark stories you like to read them later."}
            </p>
            {tab !== "bookmarks" ? (
              <Link
                to="/write"
                className="btn-primary"
                style={{ display: "inline-flex", marginTop: "1.5rem" }}
              >
                {tab === "published" ? "Write & Publish" : "Start a Draft"}
              </Link>
            ) : (
              <Link
                to="/blogs"
                className="btn-primary"
                style={{ display: "inline-flex", marginTop: "1.5rem" }}
              >
                Explore Stories
              </Link>
            )}
          </div>
        ) : (
          <div className="mypost-list">
            {displayed.map((blog, idx) => (
              <div key={blog.id} className="mypost-card">
                {/* Left: number */}
                <div className="mypost-card-number">
                  {String(idx + 1).padStart(2, "0")}
                </div>

                {/* Middle: content */}
                <div className="mypost-card-body">
                  <div className="mypost-card-meta-top">
                    {tab === "bookmarks" ? (
                      <span
                        className="mypost-author"
                        style={{ fontWeight: 600, color: "var(--ink)" }}
                      >
                        By {blog.author?.name || blog.author?.email || "Anonymous"}
                      </span>
                    ) : (
                      <span
                        className={`mypost-status-badge ${
                          blog.status === "UNDER_REVIEW" ? "under-review" : blog.status === "PUBLISHED" ? "published" : "draft"
                        }`}
                      >
                        {blog.status === "UNDER_REVIEW" ? (
                          `⚠️ Under Review${blog.flaggedMetrics && blog.flaggedMetrics.length > 0 ? ` (${blog.flaggedMetrics.join(", ")})` : ""}`
                        ) : blog.status === "PUBLISHED" ? (
                          "● Published"
                        ) : (
                          "○ Draft"
                        )}
                      </span>
                    )}
                    <span className="mypost-date">
                      {formatDate(blog.updatedAt || blog.createdAt)}
                    </span>
                    <span className="mypost-readtime">
                      {estimateReadTime(blog.content)} read
                    </span>
                  </div>
 
                  <h2 className="mypost-card-title">
                    <Link to={`/blog/${blog.id}`} className="mypost-title-link">
                      {blog.title}
                    </Link>
                  </h2>
 
                  <p className="mypost-card-excerpt">
                    {blog.content.replace(/[#*_`>]/g, "")}
                  </p>

                  {/* Rejection Alert Box */}
                  {blog.status === "DRAFT" && blog.rejectionReason && (
                    <div
                      style={{
                        background: "rgba(155, 57, 34, 0.04)",
                        borderLeft: "3px solid var(--rust)",
                        padding: "0.5rem 0.75rem",
                        marginTop: "0.75rem",
                        fontSize: "0.82rem",
                        color: "var(--rust)",
                        borderRadius: "2px",
                      }}
                    >
                      <strong style={{ fontWeight: 600 }}>Revision Required:</strong> {blog.rejectionReason}
                    </div>
                  )}
                </div>
 
                {/* Right: actions */}
                <div className="mypost-actions">
                  {tab === "bookmarks" ? (
                    <button
                      className="mypost-action-btn delete"
                      onClick={() => handleRemoveBookmark(blog.id)}
                      title="Remove bookmark"
                    >
                      Remove
                    </button>
                  ) : (
                    <>
                      {/* Publish (only for drafts) */}
                      {blog.status !== "PUBLISHED" && (
                        <button
                          id={`publish-draft-${blog.id}`}
                          className="mypost-action-btn publish"
                          onClick={() => handlePublishDraft(blog)}
                          disabled={publishing === blog.id}
                          title="Publish this draft"
                        >
                          {publishing === blog.id ? "..." : "Publish"}
                        </button>
                      )}

                      {/* Edit */}
                      <Link
                        to={`/edit/${blog.id}`}
                        className="mypost-action-btn edit"
                        title="Edit story"
                      >
                        Edit
                      </Link>

                      {/* Delete */}
                      <button
                        id={`delete-${blog.id}`}
                        className="mypost-action-btn delete"
                        onClick={() => setConfirmDelete(blog.id)}
                        title="Delete story"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠</div>
            <h3 className="modal-title">Delete this story?</h3>
            <p className="modal-body">
              This action is permanent and cannot be undone. The story will be
              gone forever.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                className="modal-btn confirm"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
};

export default MyPostsPage;
