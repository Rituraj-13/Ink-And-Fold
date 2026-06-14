import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api";

interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  small: string;
  alt: string;
  author: string;
  authorProfile: string;
  color: string;
}

interface UnsplashPickerProps {
  onSelect: (url: string, alt: string) => void;
  onClose: () => void;
  currentImage?: string | null;
}

const SUGGESTIONS = [
  "nature", "technology", "writing", "books", "coffee",
  "abstract", "travel", "minimalism", "architecture", "forest",
];

const UnsplashPicker = ({ onSelect, onClose, currentImage }: UnsplashPickerProps) => {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selected, setSelected] = useState<UnsplashPhoto | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Load initial results with a default term
    doSearch("editorial", 1);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/v1/unsplash/search", {
        params: { query: q, page: p, per_page: 20 },
      });
      if (p === 1) {
        setPhotos(res.data.photos || []);
      } else {
        setPhotos((prev) => [...prev, ...(res.data.photos || [])]);
      }
      setTotalPages(res.data.totalPages || 0);
    } catch (err: any) {
      if (err?.response?.status === 503) {
        setNotConfigured(true);
        setError("Unsplash API is not configured yet. Add your UNSPLASH_ACCESS_KEY to backend .dev.vars");
      } else {
        setError("Failed to search images. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      doSearch(val || "editorial", 1);
    }, 400);
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    setPage(1);
    doSearch(s, 1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(query || "editorial", next);
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.url, selected.alt || selected.author);
    }
    onClose();
  };

  return (
    <div className="unsplash-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="unsplash-modal" role="dialog" aria-modal="true" aria-label="Choose cover image">

        {/* Header */}
        <div className="unsplash-header">
          <div>
            <h2 className="unsplash-title">Choose Cover Image</h2>
            <p className="unsplash-subtitle">Powered by Unsplash</p>
          </div>
          <button className="unsplash-close-btn" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="unsplash-search-row">
          <div className="unsplash-search-wrap">
            <svg className="unsplash-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="unsplash-search-input"
              placeholder="Search landscapes, portraits, abstract..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch(query || "editorial", 1)}
            />
            {query && (
              <button className="unsplash-clear-btn" onClick={() => handleQueryChange("")}>✕</button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="unsplash-suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className={`unsplash-suggestion ${query === s ? "active" : ""}`}
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Current selection preview */}
        {selected && (
          <div className="unsplash-selected-preview">
            <img src={selected.thumb} alt={selected.alt} className="unsplash-selected-thumb" />
            <div className="unsplash-selected-info">
              <span className="unsplash-selected-label">✓ Selected</span>
              <span className="unsplash-selected-author">
                Photo by{" "}
                <a href={selected.authorProfile} target="_blank" rel="noopener noreferrer">
                  {selected.author}
                </a>{" "}
                on Unsplash
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className={`unsplash-error ${notConfigured ? "unsplash-error--config" : ""}`}>
            <span>{notConfigured ? "⚙️" : "⚠️"}</span>
            <div>
              <p>{error}</p>
              {notConfigured && (
                <code className="unsplash-error-code">UNSPLASH_ACCESS_KEY="your_key"</code>
              )}
            </div>
          </div>
        )}

        {/* Photo grid */}
        {!notConfigured && (
          <div className="unsplash-grid-wrap">
            {loading && photos.length === 0 ? (
              <div className="unsplash-loading">
                <div className="unsplash-spinner" />
                <p>Searching beautiful images...</p>
              </div>
            ) : (
              <>
                <div className="unsplash-grid">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      className={`unsplash-photo-btn ${selected?.id === photo.id ? "selected" : ""}`}
                      onClick={() => setSelected(photo)}
                      style={{ backgroundColor: photo.color }}
                    >
                      <img
                        src={photo.small}
                        alt={photo.alt}
                        className="unsplash-photo-img"
                        loading="lazy"
                      />
                      {selected?.id === photo.id && (
                        <div className="unsplash-photo-check">✓</div>
                      )}
                      <div className="unsplash-photo-hover">
                        <span>{photo.author}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Load more */}
                {page < totalPages && (
                  <div className="unsplash-load-more-wrap">
                    <button
                      className="unsplash-load-more"
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Load More Images"}
                    </button>
                  </div>
                )}

                {photos.length === 0 && !loading && (
                  <div className="unsplash-empty">
                    <p>No images found for "<em>{query}</em>". Try a different search.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="unsplash-footer">
          <div className="unsplash-footer-left">
            {currentImage && !selected && (
              <button className="unsplash-remove-btn" onClick={() => { onSelect("", ""); onClose(); }}>
                Remove cover image
              </button>
            )}
          </div>
          <div className="unsplash-footer-right">
            <button className="unsplash-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className="unsplash-confirm-btn"
              onClick={handleConfirm}
              disabled={!selected}
            >
              Use This Photo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UnsplashPicker;
