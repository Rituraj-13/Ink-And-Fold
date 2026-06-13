import { Link } from "react-router-dom";

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

const LandingPage = () => {
  const tickerContent = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center" }}>
        <div className="hero-inner" style={{ width: "100%" }}>
          <div className="hero-label">Ink & Fold — The Writer's Platform</div>
          <h1 className="hero-title">
            Where words
            <br />
            find their <em>home.</em>
          </h1>
          <p className="hero-subtitle">
            An editorial platform built for writers who have something real to
            say. No algorithms. No distractions. Just you and your story.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn-primary">
              Start Writing Free
            </Link>
            <Link to="/signin" className="btn-secondary">
              Sign In
            </Link>
          </div>

          {/* Floating stats */}
          <div
            style={{
              marginTop: "4rem",
              display: "flex",
              gap: "3rem",
              flexWrap: "wrap",
            }}
          >
            {[
              { num: "12K+", label: "Writers" },
              { num: "84K+", label: "Stories" },
              { num: "2.1M", label: "Readers" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "2.2rem",
                    fontWeight: 900,
                    color: "var(--amber)",
                    lineHeight: 1,
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontFamily: '"DM Mono", monospace',
                    fontSize: "0.7rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#9b8e7a",
                    marginTop: "0.3rem",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker-bar">
        <div className="ticker-inner">
          {tickerContent.map((item, i) => (
            <span key={i} className="ticker-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section
        style={{
          background: "var(--cream)",
          padding: "5rem 2rem",
        }}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Ink & Fold?</h2>
            <span className="section-label">Built for writers</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0",
            }}
          >
            {[
              {
                num: "01",
                title: "Pure Writing Experience",
                desc: "A distraction-free editor that gets out of your way. Focus on the words that matter.",
              },
              {
                num: "02",
                title: "No Algorithm Tax",
                desc: "Your stories reach readers on merit alone — not because you paid to boost them.",
              },
              {
                num: "03",
                title: "Editorial First",
                desc: "We believe in the long form. In slow reads. In stories that take time to unfold.",
              },
              {
                num: "04",
                title: "Owned by Writers",
                desc: "Your words are yours. Forever. No lock-in, no hidden terms.",
              },
            ].map((f) => (
              <div
                key={f.num}
                style={{
                  padding: "2.5rem",
                  border: "1px solid var(--border-light)",
                  background: "var(--paper)",
                  position: "relative",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--cream-warm)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--paper)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border-light)";
                }}
              >
                <div
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "3.5rem",
                    fontWeight: 900,
                    color: "rgba(200, 120, 42, 0.1)",
                    lineHeight: 1,
                    marginBottom: "1rem",
                  }}
                >
                  {f.num}
                </div>
                <h3
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: "0.6rem",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--ink-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section
        style={{
          background: "var(--ink)",
          padding: "5rem 2rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: '"Playfair Display", serif',
            fontSize: "16rem",
            fontWeight: 900,
            color: "rgba(200, 120, 42, 0.04)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          WRITE
        </div>
        <div style={{ position: "relative" }}>
          <p
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--amber)",
              marginBottom: "1.5rem",
            }}
          >
            ◆ Ready to begin?
          </p>
          <h2
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: "var(--cream)",
              marginBottom: "1rem",
              lineHeight: 1.15,
            }}
          >
            Your story is waiting
            <br />
            to be told.
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "#9b8e7a",
              marginBottom: "2.5rem",
              maxWidth: "400px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.75,
            }}
          >
            Join thousands of writers who have made Ink & Fold their writing
            home.
          </p>
          <Link to="/signup" className="btn-primary">
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "var(--ink)",
          borderTop: "1px solid rgba(200, 120, 42, 0.15)",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "var(--cream)",
          }}
        >
          Ink<span style={{ color: "var(--amber)" }}>&</span>Fold
        </div>
        <p
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            color: "#9b8e7a",
          }}
        >
          © 2024 Ink & Fold. All stories reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
