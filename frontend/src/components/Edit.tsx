import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import api from "../api";
import type { Blog } from "../types";
import Toast from "./Toast";

type Tab = "write" | "preview";

interface ToolbarAction {
  label: string;
  title: string;
  prefix: string;
  suffix: string;
  block?: boolean;
  placeholder?: string;
}

const TOOLBAR: (ToolbarAction | "|")[] = [
  { label: "B", title: "Bold", prefix: "**", suffix: "**", placeholder: "bold text" },
  { label: "I", title: "Italic", prefix: "_", suffix: "_", placeholder: "italic text" },
  { label: "~~", title: "Strikethrough", prefix: "~~", suffix: "~~", placeholder: "strikethrough" },
  "|",
  { label: "H1", title: "Heading 1", prefix: "# ", suffix: "", block: true, placeholder: "Heading 1" },
  { label: "H2", title: "Heading 2", prefix: "## ", suffix: "", block: true, placeholder: "Heading 2" },
  { label: "H3", title: "Heading 3", prefix: "### ", suffix: "", block: true, placeholder: "Heading 3" },
  "|",
  { label: "❝", title: "Blockquote", prefix: "> ", suffix: "", block: true, placeholder: "Blockquote" },
  { label: "• List", title: "Bullet List", prefix: "- ", suffix: "", block: true, placeholder: "List item" },
  "|",
  { label: "</>", title: "Inline Code", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "``` Block", title: "Code Block", prefix: "```\n", suffix: "\n```", block: true, placeholder: "code here" },
  "|",
  { label: "Link", title: "Insert Link", prefix: "[", suffix: "](url)", placeholder: "link text" },
];

const EditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalBlog, setOriginalBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"save" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/signin"); return; }
    fetchBlog();
  }, [id]);

  useEffect(() => {
    const el = titleRef.current;
    if (el) { el.style.height = "0"; el.style.height = `${el.scrollHeight}px`; }
  }, [title]);

  useEffect(() => {
    const el = contentRef.current;
    if (el) { el.style.height = "0"; el.style.height = `${Math.max(el.scrollHeight, 400)}px`; }
  }, [content]);

  const fetchBlog = async () => {
    try {
      const res = await api.get(`/api/v1/blog/${id}`);
      const blog: Blog = res.data.blog;
      setOriginalBlog(blog);
      setTitle(blog.title);
      setContent(blog.content);
    } catch (err: any) {
      if (err?.response?.status === 401) { localStorage.removeItem("token"); navigate("/signin"); }
      else setError("Failed to load blog. It may not exist or you don't have access.");
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const applyAction = useCallback((action: ToolbarAction) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || action.placeholder || "";
    const before = content.slice(0, start);
    const after = content.slice(end);
    let insertion: string;
    if (action.block) {
      const lineStart = before.lastIndexOf("\n") + 1;
      const linePrefix = content.slice(lineStart, start);
      insertion = before.slice(0, lineStart) + action.prefix + linePrefix + selected + action.suffix + after;
    } else {
      insertion = before + action.prefix + selected + action.suffix + after;
    }
    setContent(insertion);
    const newPos = start + action.prefix.length + selected.length;
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(newPos, newPos); });
  }, [content]);

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = contentRef.current!;
      const s = ta.selectionStart;
      setContent(content.slice(0, s) + "  " + content.slice(ta.selectionEnd));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  };

  const validate = () => {
    if (!title.trim()) { setError("Please add a title."); return false; }
    if (!content.trim()) { setError("Please write some content."); return false; }
    return true;
  };

  // Save edits (keep same published/draft state)
  const handleSave = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting("save");
    try {
      await api.put(`/api/v1/blog/${id}`, { title, content });
      setToast("Changes saved!");
      setTimeout(() => navigate("/my-posts"), 1500);
    } catch (err: any) {
      if (err?.response?.status === 401) { localStorage.removeItem("token"); navigate("/signin"); }
      else if (err?.response?.status === 403) setError("You don't have permission to edit this post.");
      else setError(err?.response?.data?.message || "Failed to save.");
    } finally {
      setSubmitting(null);
    }
  };

  // Publish a draft (update + mark as published)
  const handlePublish = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting("publish");
    try {
      await api.put(`/api/v1/blog/${id}`, { title, content, publish: true, draft: false });
      setToast("Story published!");
      setTimeout(() => navigate("/my-posts"), 1500);
    } catch (err: any) {
      if (err?.response?.status === 401) { localStorage.removeItem("token"); navigate("/signin"); }
      else if (err?.response?.status === 403) setError("You don't have permission to edit this post.");
      else setError(err?.response?.data?.message || "Failed to publish.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Loading story...</p>
      </div>
    );
  }

  return (
    <>
      {/* Top Bar */}
      <div className="write-topbar">
        <button className="write-topbar-back" onClick={() => navigate("/my-posts")}>
          ← My Posts
        </button>
        <span className="write-topbar-brand">Ink<span>&</span>Fold</span>
        <div className="write-topbar-right">
          <span className="write-wordcount">{wordCount} words · {readTime} min</span>
          {/* Show Publish only if the post is still a draft */}
          {originalBlog?.draft && !originalBlog?.published && (
            <button id="publish-from-edit-btn" onClick={handlePublish} disabled={submitting !== null} className="write-publish-btn">
              {submitting === "publish" ? "Publishing..." : "Publish →"}
            </button>
          )}
          <button id="save-edit-btn" onClick={handleSave} disabled={submitting !== null} className="write-draft-btn">
            {submitting === "save" ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="write-page">
        {/* Edit badge */}
        <div className="write-category-label">
          <span className="write-category-dash" />
          Editing: {originalBlog?.published ? (
            <span style={{ color: "var(--sage)", marginLeft: "0.4rem" }}>Published</span>
          ) : (
            <span style={{ color: "var(--ink-muted)", marginLeft: "0.4rem" }}>Draft</span>
          )}
        </div>

        {error && <div className="form-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

        {/* Title */}
        <textarea
          ref={titleRef}
          id="edit-story-title"
          className="write-title-input"
          placeholder="Your story title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
        />

        {/* Editor Shell */}
        <div className="editor-shell">
          <div className="editor-tabbar">
            <div className="editor-tabs">
              <button className={`editor-tab ${tab === "write" ? "active" : ""}`} onClick={() => setTab("write")}>
                ✏ Write
              </button>
              <button className={`editor-tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>
                ◉ Preview
              </button>
            </div>
            {tab === "write" && (
              <div className="md-toolbar" role="toolbar">
                {TOOLBAR.map((item, i) =>
                  item === "|" ? (
                    <span key={i} className="md-toolbar-sep" />
                  ) : (
                    <button key={i} type="button" title={item.title} className="md-toolbar-btn"
                      onMouseDown={(e) => { e.preventDefault(); applyAction(item); }}>
                      {item.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {tab === "write" ? (
            <textarea
              ref={contentRef}
              id="edit-story-content"
              className="write-content-input"
              placeholder="Start editing..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              rows={20}
            />
          ) : (
            <div className="md-preview">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="md-preview-empty">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
};

export default EditPage;
