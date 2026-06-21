import { useState, type FormEvent, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import api from "../api";
import Toast from "./Toast";
import UnsplashPicker from "./UnsplashPicker";

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
  { label: "1. List", title: "Numbered List", prefix: "1. ", suffix: "", block: true, placeholder: "List item" },
  "|",
  { label: "</>", title: "Inline Code", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "``` Block", title: "Code Block", prefix: "```\n", suffix: "\n```", block: true, placeholder: "code here" },
  "|",
  { label: "Link", title: "Insert Link", prefix: "[", suffix: "](url)", placeholder: "link text" },
  { label: "HR", title: "Horizontal Rule", prefix: "\n---\n", suffix: "", block: true, placeholder: "" },
];

const WritePage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [coverImageAlt, setCoverImageAlt] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/signin");
  }, []);

  // Auto-resize with no scrollbar
  useEffect(() => {
    const el = titleRef.current;
    if (el) { el.style.height = "0"; el.style.height = `${el.scrollHeight}px`; }
  }, [title]);

  useEffect(() => {
    const el = contentRef.current;
    if (el) { el.style.height = "0"; el.style.height = `${Math.max(el.scrollHeight, 400)}px`; }
  }, [content]);

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

  const handlePublish = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setError("");
    setSubmitting("publish");
    try {
      const response = await api.post("/api/v1/blog", {
        title,
        content,
        status: "PUBLISHED",
        ...(coverImage ? { coverImage } : {}),
      });
      
      const createdBlog = response.data.blog;
      
      if (createdBlog?.status === "UNDER_REVIEW") {
        setToast("Flagged! Story saved as draft and placed under review.");
      } else {
        setToast("Story published! Redirecting...");
      }
      
      setTimeout(() => navigate("/my-posts"), 1500);
    } catch (err: any) {
      if (err?.response?.status === 401) { localStorage.removeItem("token"); navigate("/signin"); }
      else setError(err?.response?.data?.message || "Failed to publish.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting("draft");
    try {
      await api.post("/api/v1/blog", {
        title,
        content,
        status: "DRAFT",
        ...(coverImage ? { coverImage } : {}),
      });
      setToast("Saved as draft!");
      setTimeout(() => navigate("/my-posts"), 1500);
    } catch (err: any) {
      if (err?.response?.status === 401) { localStorage.removeItem("token"); navigate("/signin"); }
      else setError(err?.response?.data?.message || "Failed to save draft.");
    } finally {
      setSubmitting(null);
    }
  };

  const handleImageSelect = (url: string, alt: string) => {
    setCoverImage(url);
    setCoverImageAlt(alt);
  };

  return (
    <>
      {/* ── Top Bar ─── */}
      <div className="write-topbar">
        <button className="write-topbar-back" onClick={() => navigate("/blogs")}>
          ← Discard
        </button>
        <span className="write-topbar-brand">Ink<span>&</span>Fold</span>
        <div className="write-topbar-right">
          <span className="write-wordcount">{wordCount} words · {readTime} min</span>
          <button
            id="save-draft-btn"
            onClick={handleSaveDraft}
            disabled={submitting !== null}
            className="write-draft-btn"
          >
            {submitting === "draft" ? "Saving..." : "Save Draft"}
          </button>
          <button
            id="publish-btn"
            onClick={handlePublish}
            disabled={submitting !== null}
            className="write-publish-btn"
          >
            {submitting === "publish" ? "Publishing..." : "Publish →"}
          </button>
        </div>
      </div>

      <div className="write-page">
        {error && <div className="form-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

        <div className="write-category-label">
          <span className="write-category-dash" />
          New Story
        </div>

        {/* Cover Image Section */}
        <div className="cover-image-section">
          {coverImage ? (
            <div className="cover-image-preview">
              <img src={coverImage} alt={coverImageAlt} className="cover-image-img" />
              <div className="cover-image-actions">
                <button className="cover-image-change-btn" onClick={() => setShowPicker(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Change Photo
                </button>
                <button className="cover-image-remove-btn" onClick={() => { setCoverImage(""); setCoverImageAlt(""); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button className="cover-image-placeholder" onClick={() => setShowPicker(true)}>
              <div className="cover-image-placeholder-inner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="cover-image-placeholder-text">Add a cover photo</span>
                <span className="cover-image-placeholder-sub">Search millions of images from Unsplash</span>
              </div>
            </button>
          )}
        </div>

        {/* Title */}
        <textarea
          ref={titleRef}
          id="story-title"
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
              id="story-content"
              className="write-content-input"
              placeholder={`Tell your story using **Markdown**...\n\n# Heading\n**Bold**, _italic_, \`code\`, > blockquotes, - lists, and more.`}
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
                <p className="md-preview-empty">Nothing to preview yet — switch to Write and start typing.</p>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="write-tips">
          <p className="write-tips-heading">◆ Markdown Quick Reference</p>
          <div className="write-tips-grid">
            {[
              ["**bold**", "Bold text"], ["_italic_", "Italic text"],
              ["# Heading", "H1 heading"], ["`code`", "Inline code"],
              ["> quote", "Blockquote"], ["- item", "Bullet list"],
            ].map(([syntax, desc]) => (
              <div key={syntax} className="write-tip-item">
                <code className="write-tip-code">{syntax}</code>
                <span className="write-tip-desc">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unsplash Picker Modal */}
      {showPicker && (
        <UnsplashPicker
          onSelect={handleImageSelect}
          onClose={() => setShowPicker(false)}
          currentImage={coverImage}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
};

export default WritePage;
