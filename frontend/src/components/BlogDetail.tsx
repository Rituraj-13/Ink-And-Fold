import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import api from "../api";
import type { Blog, Comment } from "../types";
import Toast from "./Toast";

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

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

const getLoggedInUserId = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload).sub;
  } catch (e) {
    return null;
  }
};

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Likes and Bookmarks state
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [toast, setToast] = useState("");
  
  const loggedInUserId = getLoggedInUserId();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signin");
      return;
    }
    fetchBlog();
    fetchComments();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const res = await api.get(`/api/v1/blog/${id}`);
      const blogData = res.data.blog;
      setBlog(blogData);
      setLikesCount(blogData._count?.likes ?? 0);
      setIsLiked((blogData.likes ?? []).length > 0);
      setIsBookmarked((blogData.bookmarks ?? []).length > 0);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/signin");
      } else if (err?.response?.status === 404) {
        setError("This story doesn't exist or has been removed.");
      } else {
        setError("Failed to load the story.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/v1/blog/${id}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const handleLike = async () => {
    if (!blog) return;
    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousLiked);
    setLikesCount((prev) => (previousLiked ? prev - 1 : prev + 1));

    try {
      const res = await api.post(`/api/v1/blog/${blog.id}/like`);
      setIsLiked(res.data.liked);
    } catch (err) {
      // Revert
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  const handleBookmark = async () => {
    if (!blog) return;
    // Optimistic update
    const previousBookmarked = isBookmarked;
    setIsBookmarked(!previousBookmarked);

    try {
      const res = await api.post(`/api/v1/blog/${blog.id}/bookmark`);
      setIsBookmarked(res.data.bookmarked);
    } catch (err) {
      setIsBookmarked(previousBookmarked);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);

    try {
      const res = await api.post(`/api/v1/blog/${id}/comment`, {
        content: commentText,
      });
      setComments((prev) => [res.data.comment, ...prev]);
      setCommentText("");
    } catch (err) {
      alert("Failed to submit comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      await api.delete(`/api/v1/blog/comment/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setToast("Comment deleted successfully!");
    } catch (err) {
      setToast("Failed to delete comment.");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading story...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <p className="empty-title">Story not found</p>
        <p className="empty-subtitle">{error}</p>
        <Link
          to="/blogs"
          className="btn-primary"
          style={{ display: "inline-flex", marginTop: "1.5rem" }}
        >
          ← Back to Stories
        </Link>
      </div>
    );
  }

  return (
    <article className="blog-detail">
      {/* Back nav */}
      <div style={{ marginBottom: "2rem" }}>
        <Link to="/blogs" className="blog-detail-back">
          ← All Stories
        </Link>
      </div>

      {/* Cover Image Hero */}
      {blog.coverImage && (
        <div className="blog-cover-hero">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="blog-cover-hero-img"
          />
          <div className="blog-cover-hero-gradient" />
        </div>
      )}

      {/* Header */}
      <header className="blog-detail-header">
        <div className="blog-detail-meta">
          <span className="blog-detail-tag">Story</span>
          <span className="blog-detail-dot" />
          <span className="blog-detail-date">
            {estimateReadTime(blog.content)}
          </span>
        </div>
        <h1 className="blog-detail-title">{blog.title}</h1>
      </header>

      {/* Author Bar */}
      <div className="blog-detail-author-bar">
        <div className="author-avatar-lg">{getAuthorInitials(blog)}</div>
        <div className="author-info">
          <div className="author-name">{getAuthorName(blog)}</div>
          <div className="author-meta">
            Ink &amp; Fold Contributor · {estimateReadTime(blog.content)}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="blog-interactions-bar">
        <div className="interactions-left">
          <button
            onClick={handleLike}
            className={`interaction-btn ${isLiked ? "active" : ""}`}
            title={isLiked ? "Unlike this story" : "Like this story"}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{likesCount}</span>
          </button>
          <a
            href="#comments"
            className="interaction-btn"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("comments")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{comments.length}</span>
          </a>
        </div>
        <button
          onClick={handleBookmark}
          className={`interaction-btn ${isBookmarked ? "active" : ""}`}
          title={isBookmarked ? "Remove bookmark" : "Bookmark this story"}
        >
          <svg viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Markdown Body */}
      <div className="blog-detail-body md-rendered">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeHighlight]}
        >
          {blog.content}
        </ReactMarkdown>
      </div>

      {/* Divider */}
      <div className="blog-detail-divider">◆</div>

      {/* Comments Section */}
      <section id="comments" className="comments-section">
        <h3 className="comments-title">Comments ({comments.length})</h3>

        <form onSubmit={handleCommentSubmit} className="comment-form">
          <div className="comment-input-wrapper">
            <textarea
              className="comment-textarea"
              placeholder="What are your thoughts on this story?..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              required
            />
          </div>
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={submittingComment || !commentText.trim()}
          >
            {submittingComment ? "Publishing..." : "Comment"}
          </button>
        </form>

        <div className="comments-list">
          {comments.map((comment) => {
            const commenterName =
              comment.user.name || comment.user.email || "Anonymous";
            const commenterInitials = commenterName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const isCommentOwner = comment.userId === loggedInUserId;
            const isPostOwner = blog.authorId === loggedInUserId;

            return (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <div className="commenter-info">
                    <div className="commenter-avatar">
                      {commenterInitials}
                    </div>
                    <div>
                      <div className="commenter-name">{commenterName}</div>
                      <div className="comment-date">
                        {new Date(comment.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                  </div>
                  {(isCommentOwner || isPostOwner) && (
                    <button
                      onClick={() => handleCommentDelete(comment.id)}
                      className="comment-delete-btn"
                      title="Delete response"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            );
          })}
          {comments.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--ink-muted)",
                fontStyle: "italic",
                fontFamily: '"Playfair Display", serif',
                fontSize: "1.1rem",
              }}
            >
              Be the first to share your thoughts on this story.
            </p>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
          marginTop: "4rem",
        }}
      >
        <p
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: "italic",
            fontSize: "1.1rem",
            color: "var(--ink-muted)",
          }}
        >
          Enjoyed this story? There's more where that came from.
        </p>
        <Link to="/blogs" className="btn-primary">
          Read More Stories
        </Link>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </article>
  );
};

export default BlogDetail;
