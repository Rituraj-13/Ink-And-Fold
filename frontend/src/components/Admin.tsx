import { useState, useEffect } from "react";
import api from "../api";
import Toast from "./Toast";

interface User {
  id: string;
  email: string;
  name?: string | null;
  userType: "USER" | "ADMIN";
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: {
    posts: number;
  };
}

interface ModerationPost {
  id: string;
  title: string;
  content: string;
  coverImage?: string | null;
  flaggedMetrics: string[];
  createdAt: string;
  author: {
    name?: string | null;
    email: string;
  };
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"moderation" | "users">("moderation");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [queue, setQueue] = useState<ModerationPost[]>([]);
  const [toast, setToast] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Premium UI enhancements:
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "admins" | "suspended" | "writers">("all");
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "moderation") {
        const res = await api.get("/api/v1/admin/review-queue");
        setQueue(res.data.queue || []);
      } else {
        const res = await api.get("/api/v1/admin/userslist");
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      setToast("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.post(`/api/v1/admin/blog/${id}/approve`);
      setQueue((prev) => prev.filter((p) => p.id !== id));
      setToast("Post approved and published!");
    } catch (err) {
      setToast("Failed to approve post.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessing(id);
    try {
      await api.post(`/api/v1/admin/blog/${id}/reject`, { reason });
      setQueue((prev) => prev.filter((p) => p.id !== id));
      setToast("Post rejected and returned to drafts.");
      setRejectingId(null);
      setRejectionReason("");
    } catch (err) {
      setToast("Failed to reject post.");
    } finally {
      setProcessing(null);
    }
  };

  const handlePromote = async (userId: string) => {
    setProcessing(userId);
    try {
      await api.post(`/api/v1/admin/promote/${userId}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, userType: "ADMIN" } : u))
      );
      setToast("User promoted to Admin!");
    } catch (err) {
      setToast("Failed to promote user.");
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleBan = async (user: User) => {
    setProcessing(user.id);
    const endpoint = user.isBanned
      ? `/api/v1/admin/users/${user.id}/unban`
      : `/api/v1/admin/users/${user.id}/ban`;
    try {
      await api.post(endpoint);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBanned: !u.isBanned } : u))
      );
      setToast(
        user.isBanned
          ? `Suspension revoked for user ${user.email}!`
          : `User ${user.email} suspended successfully!`
      );
    } catch (err) {
      setToast(
        user.isBanned ? "Failed to revoke suspension." : "Failed to suspend user."
      );
    } finally {
      setProcessing(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name?: string | null, email?: string) => {
    const display = name || email || "A";
    return display
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Client-side filtering logic
  const filteredQueue = queue.filter((post) => {
    const matchesQuery =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author.name && post.author.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesQuery;
  });

  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesQuery) return false;

    if (userFilter === "admins") return user.userType === "ADMIN";
    if (userFilter === "suspended") return user.isBanned;
    if (userFilter === "writers") return user.userType === "USER";
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--paper)", color: "var(--ink)", paddingBottom: "5rem" }}>
      {/* Hero Header */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-label">Console Central</div>
            <h1 className="hero-title font-serif" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", marginBottom: "0.8rem" }}>
              Operations Desk
            </h1>
            <p className="hero-subtitle" style={{ maxWidth: "600px", margin: "0 0 2rem 0", color: "#9b8e7a", fontSize: "0.95rem" }}>
              Review pending editorial draft submittals, control writer profiles, and maintain platform content guidelines.
            </p>

            {/* Stats Summary Block */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginTop: "2rem" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1.5px solid rgba(200, 120, 42, 0.25)", padding: "1.25rem", borderRadius: "2px" }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--amber)", marginBottom: "0.5rem" }}>
                  Awaiting Action
                </div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: "2.2rem", fontWeight: 900, color: "var(--cream)", lineHeight: 1.1 }}>
                  {queue.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9b8e7a", marginTop: "0.25rem" }}>
                  Stories in moderation queue
                </div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1.5px solid rgba(200, 120, 42, 0.25)", padding: "1.25rem", borderRadius: "2px" }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--amber)", marginBottom: "0.5rem" }}>
                  Registered Writers
                </div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: "2.2rem", fontWeight: 900, color: "var(--cream)", lineHeight: 1.1 }}>
                  {users.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9b8e7a", marginTop: "0.25rem" }}>
                  Verified user profiles
                </div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1.5px solid rgba(200, 120, 42, 0.25)", padding: "1.25rem", borderRadius: "2px" }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--amber)", marginBottom: "0.5rem" }}>
                  Console Status
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--sage)", borderRadius: "50%", boxShadow: "0 0 8px var(--sage)" }} />
                  <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 900, color: "var(--cream)", lineHeight: 1.1 }}>
                    Operational
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9b8e7a", marginTop: "0.4rem" }}>
                  KV DB & mailers active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Console Controls & Lists */}
      <main className="container" style={{ paddingTop: "2.5rem" }}>
        {/* Navigation Tabs */}
        <div className="myposts-tabbar" style={{ marginBottom: "2rem", borderBottom: "1.5px solid var(--border-light)" }}>
          <button
            className={`myposts-tab ${activeTab === "moderation" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("moderation");
              setSearchQuery("");
            }}
            style={{
              borderTop: "none",
              borderBottom: activeTab === "moderation" ? "3px solid var(--amber)" : "3px solid transparent",
              padding: "1rem 1.5rem",
              background: "transparent",
              margin: 0,
            }}
          >
            Review Queue
            <span className="myposts-tab-count" style={{ marginLeft: "0.5rem" }}>{queue.length}</span>
          </button>
          <button
            className={`myposts-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("users");
              setSearchQuery("");
            }}
            style={{
              borderTop: "none",
              borderBottom: activeTab === "users" ? "3px solid var(--amber)" : "3px solid transparent",
              padding: "1rem 1.5rem",
              background: "transparent",
              margin: 0,
            }}
          >
            User Management
            <span className="myposts-tab-count" style={{ marginLeft: "0.5rem" }}>{users.length}</span>
          </button>
        </div>

        {/* Search & Filter Controls Bar (Only visible on User Management tab) */}
        {activeTab === "users" && (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--cream-warm)",
              padding: "1rem 1.5rem",
              borderRadius: "2px",
              border: "1.5px solid var(--border)",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email..."
                style={{
                  width: "100%",
                  padding: "0.7rem 1rem 0.7rem 2.2rem",
                  border: "1.5px solid var(--border)",
                  borderRadius: "2px",
                  background: "#fff",
                  fontSize: "0.88rem",
                  fontFamily: "inherit",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", opacity: 0.6, fontSize: "0.9rem" }}>
                🔍
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  marginRight: "0.5rem",
                }}
              >
                Filter:
              </span>
              {(["all", "admins", "suspended", "writers"] as const).map((filterOpt) => (
                <button
                  key={filterOpt}
                  onClick={() => setUserFilter(filterOpt)}
                  className={`navbar-btn ${userFilter === filterOpt ? "filled" : ""}`}
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.35rem 0.8rem",
                    height: "auto",
                    lineHeight: 1,
                    borderWidth: "1px",
                  }}
                >
                  {filterOpt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic List Content */}
        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p className="loading-text">Fetching Administrative Data...</p>
          </div>
        ) : activeTab === "moderation" ? (
          /* MODERATION TAB */
          filteredQueue.length === 0 ? (
            <div
              className="empty-state"
              style={{
                background: "#fff",
                border: "1.5px solid var(--border-light)",
                borderRadius: "2px",
                padding: "4rem 2rem",
              }}
            >
              <div className="empty-icon">🛡️</div>
              <p className="empty-title">Queue is clear</p>
              <p className="empty-subtitle">
                {searchQuery
                  ? "No pending contributions match your query."
                  : "No drafts require moderation at this time."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {filteredQueue.map((post, idx) => {
                const isExpanded = expandedPosts[post.id] || false;
                return (
                  <div
                    key={post.id}
                    style={{
                      background: "#fff",
                      border: "1.5px solid var(--border-light)",
                      borderTop: "3px solid var(--rust)",
                      padding: "1.75rem",
                      borderRadius: "2px",
                      position: "relative",
                      boxShadow: "0 4px 12px rgba(26, 18, 9, 0.02)",
                    }}
                  >
                    {/* Card Meta Top */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1.5rem",
                        flexWrap: "wrap",
                        borderBottom: "1.5px solid var(--border-light)",
                        paddingBottom: "1rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                          <span
                            className="mypost-status-badge under-review"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.68rem",
                            }}
                          >
                            ⚠️ Under Moderation
                          </span>

                          {/* Flag Badges */}
                          {post.flaggedMetrics && post.flaggedMetrics.length > 0 && (
                            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                              {post.flaggedMetrics.map((flag) => (
                                <span
                                  key={flag}
                                  style={{
                                    fontSize: "0.65rem",
                                    fontFamily: "DM Mono, monospace",
                                    background: "rgba(155, 57, 34, 0.08)",
                                    color: "var(--rust)",
                                    padding: "0.15rem 0.45rem",
                                    border: "1.5px solid rgba(155, 57, 34, 0.15)",
                                    borderRadius: "2px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Author Info */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: "var(--cream-warm)",
                              border: "1.5px solid var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              fontFamily: "Playfair Display, serif",
                              color: "var(--ink)",
                            }}
                          >
                            {getInitials(post.author.name, post.author.email)}
                          </div>
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink-soft)" }}>
                            {post.author.name || "Anonymous Writer"}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                            ({post.author.email})
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--border-light)" }}>•</span>
                          <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)", fontFamily: "DM Mono, monospace" }}>
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontFamily: "Playfair Display, serif",
                          fontSize: "1.8rem",
                          fontWeight: 900,
                          color: "var(--border-light)",
                          lineHeight: 1,
                        }}
                      >
                        #{String(idx + 1).padStart(2, "0")}
                      </div>
                    </div>

                    {/* Title */}
                    <h2
                      className="font-serif"
                      style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem", lineHeight: 1.25 }}
                    >
                      {post.title}
                    </h2>

                    {/* Excerpt / Story Reader */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      {isExpanded ? (
                        <div
                          style={{
                            background: "var(--paper)",
                            borderLeft: "3.5px solid var(--amber)",
                            padding: "1.5rem",
                            margin: "1rem 0",
                            borderRadius: "2px",
                            fontFamily: '"Playfair Display", Georgia, serif',
                            fontSize: "1.05rem",
                            lineHeight: "1.75",
                            color: "var(--ink-soft)",
                            whiteSpace: "pre-wrap",
                            maxHeight: "450px",
                            overflowY: "auto",
                          }}
                        >
                          {post.content}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            lineHeight: "1.6",
                            color: "var(--ink-muted)",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {post.content}
                        </p>
                      )}

                      <button
                        onClick={() => toggleExpand(post.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--amber)",
                          fontFamily: "DM Mono, monospace",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {isExpanded ? "Collapse Full Draft ↑" : "Read Full Draft ↓"}
                      </button>
                    </div>

                    {/* Review Actions Panel */}
                    <div
                      style={{
                        borderTop: "1.5px solid var(--border-light)",
                        paddingTop: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      {rejectingId !== post.id ? (
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                          <button
                            className="navbar-btn"
                            onClick={() => {
                              setRejectingId(post.id);
                              setRejectionReason("");
                            }}
                            disabled={processing !== null}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.5rem 1.2rem",
                              color: "var(--rust)",
                              borderColor: "var(--rust)",
                              background: "transparent",
                            }}
                          >
                            Reject & Return
                          </button>

                          <button
                            className="navbar-btn filled"
                            onClick={() => handleApprove(post.id)}
                            disabled={processing !== null}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.5rem 1.2rem",
                              background: "var(--sage)",
                              color: "#fff",
                              borderColor: "var(--sage)",
                            }}
                          >
                            {processing === post.id ? "Processing..." : "Approve & Publish"}
                          </button>
                        </div>
                      ) : (
                        /* Reject Comments Box */
                        <div
                          style={{
                            background: "rgba(155, 57, 34, 0.02)",
                            border: "1.5px dashed rgba(155, 57, 34, 0.3)",
                            borderRadius: "2px",
                            padding: "1.25rem",
                            width: "100%",
                          }}
                        >
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              fontFamily: "DM Mono, monospace",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: "var(--rust)",
                              marginBottom: "0.5rem",
                            }}
                          >
                            Editorial Review Feedback (Optional):
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Detail why this contribution is returned to drafts (e.g. formatting guidelines, inappropriate comments)..."
                            style={{
                              width: "100%",
                              minHeight: "90px",
                              padding: "0.75rem",
                              border: "1.5px solid var(--border)",
                              borderRadius: "2px",
                              fontSize: "0.88rem",
                              background: "#fff",
                              color: "var(--ink-soft)",
                              fontFamily: "inherit",
                              resize: "vertical",
                              outline: "none",
                            }}
                          />
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "flex-end" }}>
                            <button
                              className="navbar-btn"
                              onClick={() => setRejectingId(null)}
                              disabled={processing !== null}
                              style={{
                                fontSize: "0.72rem",
                                padding: "0.4rem 1rem",
                                borderColor: "var(--border)",
                                color: "var(--ink-muted)",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className="navbar-btn filled"
                              onClick={() => handleReject(post.id, rejectionReason)}
                              disabled={processing !== null}
                              style={{
                                fontSize: "0.72rem",
                                padding: "0.4rem 1rem",
                                background: "var(--rust)",
                                borderColor: "var(--rust)",
                                color: "#fff",
                              }}
                            >
                              {processing === post.id ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* USER DIRECTORY TAB */
          filteredUsers.length === 0 ? (
            <div
              className="empty-state"
              style={{
                background: "#fff",
                border: "1.5px solid var(--border-light)",
                borderRadius: "2px",
                padding: "4rem 2rem",
              }}
            >
              <div className="empty-icon">👥</div>
              <p className="empty-title">No writers found</p>
              <p className="empty-subtitle">
                {searchQuery
                  ? "No writing accounts match your search filters."
                  : "No writer accounts are currently registered."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredUsers.map((user) => {
                return (
                  <div
                    key={user.id}
                    style={{
                      background: "#fff",
                      border: "1.5px solid var(--border-light)",
                      borderLeft: `4px solid ${
                        user.isBanned
                          ? "var(--rust)"
                          : user.userType === "ADMIN"
                          ? "var(--amber)"
                          : "var(--border)"
                      }`,
                      padding: "1.25rem 1.5rem",
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1.5rem",
                      boxShadow: "0 2px 8px rgba(26, 18, 9, 0.01)",
                    }}
                  >
                    {/* User Profile column */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 2, minWidth: "240px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: user.isBanned ? "rgba(155, 57, 34, 0.08)" : "var(--cream-warm)",
                          border: `1.5px solid ${user.isBanned ? "var(--rust)" : "var(--border)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "Playfair Display, serif",
                          fontWeight: 900,
                          fontSize: "1.15rem",
                          color: user.isBanned ? "var(--rust)" : "var(--ink)",
                        }}
                      >
                        {getInitials(user.name, user.email)}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1.05rem" }}>
                            {user.name || "Anonymous Writer"}
                          </span>

                          {user.isBanned && (
                            <span
                              className="mypost-status-badge under-review"
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.1rem 0.4rem",
                                background: "rgba(155, 57, 34, 0.06)",
                                color: "var(--rust)",
                                border: "1.5px solid rgba(155, 57, 34, 0.15)",
                              }}
                            >
                              Suspended
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: "0.1rem" }}>
                          {user.email}
                        </div>

                        <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", marginTop: "0.2rem", fontFamily: "DM Mono, monospace" }}>
                          Registered: {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Role & Contributions column */}
                    <div style={{ display: "flex", alignItems: "center", gap: "2rem", flex: 1.5, minWidth: "220px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <span
                          className={`mypost-status-badge ${user.userType === "ADMIN" ? "published" : "draft"}`}
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            padding: "0.25rem 0.6rem",
                            background: user.userType === "ADMIN" ? "rgba(74, 103, 65, 0.08)" : "rgba(200, 120, 42, 0.05)",
                            color: user.userType === "ADMIN" ? "var(--sage)" : "var(--ink-muted)",
                            border: user.userType === "ADMIN" ? "1px solid rgba(74, 103, 65, 0.2)" : "1px solid var(--border-light)",
                          }}
                        >
                          {user.userType === "ADMIN" ? "🛡️ System Admin" : "✍️ Writer"}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: "100px" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Contributions
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink-soft)" }}>
                          {user._count.posts} {user._count.posts === 1 ? "Story" : "Stories"}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons column */}
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", width: "240px", flexShrink: 0 }}>
                      {user.userType !== "ADMIN" && (
                        <button
                          className="navbar-btn"
                          onClick={() => handleToggleBan(user)}
                          disabled={processing !== null}
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.4rem 0.85rem",
                            color: user.isBanned ? "var(--sage)" : "var(--rust)",
                            borderColor: user.isBanned ? "var(--sage)" : "var(--rust)",
                            background: "transparent",
                          }}
                        >
                          {processing === user.id ? "..." : user.isBanned ? "Revoke Ban" : "Suspend"}
                        </button>
                      )}

                      {user.userType === "USER" ? (
                        <button
                          className="navbar-btn filled"
                          onClick={() => handlePromote(user.id)}
                          disabled={processing !== null || user.isBanned}
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.4rem 0.85rem",
                            background: user.isBanned ? "var(--border-light)" : "var(--amber)",
                            borderColor: user.isBanned ? "var(--amber)" : "var(--amber)",
                            color: user.isBanned ? "var(--ink-muted)" : "var(--ink)",
                          }}
                        >
                          {processing === user.id ? "..." : "Make Admin"}
                        </button>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--sage)",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "DM Mono, monospace",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            paddingRight: "0.5rem",
                          }}
                        >
                          🛡️ Primary Admin
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default AdminDashboard;
