import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./About.css";

// The story behind Familiar, adapted from the post "So I built my own".
// All the words live here as plain text: edit them directly.
const STORY_ARTICLE_ID = "6a995aefaadc277608347411";
const AUTHOR_PROFILE_ID = "6a54efca05ec0838e45294f6";

const CHAPTERS = [
  { id: "start", label: "The start" },
  { id: "medium", label: "Medium said no" },
  { id: "user", label: "The user" },
  { id: "unseen", label: "The unseen work" },
  { id: "now", label: "Now" },
];

const UNSEEN_WORK = [
  {
    title: "One person, one account",
    text: "Sign in with Google on an email that already has a password, and Familiar recognises you instead of making a second account.",
  },
  {
    title: "Links that look right",
    text: "Share a post on WhatsApp and the title, author and cover image are already there when the preview loads.",
  },
  {
    title: "Links that expire",
    text: "Verification links run out. Password resets work exactly once.",
  },
  {
    title: "Built for a phone",
    text: "Every page rebuilt for a phone, because that is where people read.",
  },
];

// Fades a block in the first time it scrolls into view. Without
// IntersectionObserver, or with reduced motion, it is simply shown.
const Reveal = ({ as: Tag = "div", className = "", delay = 0, children }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-shown" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
};

const About = () => {
  // No chapter is active on the opening screen, so the rail stays hidden.
  const [active, setActive] = useState(null);

  // Light up the chapter currently in the middle of the screen.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // The opening screen is watched too: back on it, no chapter.
          setActive(entry.target.id === "about-top" ? null : entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    ["about-top", ...CHAPTERS.map((c) => c.id)].forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="about">
      {/* Opening screen */}
      <section id="about-top" className="about-hero">
        <Reveal as="p" className="about-eyebrow">
          About Familiar
        </Reveal>
        <Reveal as="h1" className="about-hero-title" delay={100}>
          A blog I built{" "}
          <br />
          because I <em>needed</em> one.
        </Reveal>
        <Reveal as="p" className="about-hero-sub" delay={250}>
          I&apos;m Aditi, a final-year student. I build things and ship them.
          This is the story of the one I write on.
        </Reveal>
        <button
          type="button"
          className="about-scroll-cue"
          onClick={() => jumpTo(CHAPTERS[0].id)}
        >
          Start the walk
          <span aria-hidden="true">↓</span>
        </button>
      </section>

      {/* Chapter rail, desktop only */}
      <nav
        className={`about-rail ${active ? "is-visible" : ""} ${
          active === "user" ? "on-accent" : ""
        }`}
        aria-label="Chapters"
      >
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`about-rail-item ${active === c.id ? "active" : ""}`}
            onClick={() => jumpTo(c.id)}
            aria-current={active === c.id ? "step" : undefined}
          >
            <span className="about-rail-num">0{i + 1}</span>
            <span className="about-rail-label">{c.label}</span>
          </button>
        ))}
      </nav>

      <section id="start" className="about-chapter">
        <Reveal className="about-chapter-head">
          <span className="about-num">01</span>
          <h2>It started as a side project.</h2>
        </Reveal>
        <Reveal className="about-chapter-body" delay={120}>
          <p>
            A blogging site, the usual kind: a login, a database, a text
            editor, a feed. It worked, and for a while that was enough.
          </p>
        </Reveal>
      </section>

      <section id="medium" className="about-chapter">
        <Reveal className="about-chapter-head">
          <span className="about-num">02</span>
          <h2>Then Medium said no.</h2>
        </Reveal>
        <Reveal className="about-chapter-body" delay={120}>
          <p>
            I tried to make a Medium account and couldn&apos;t. It kept
            refusing, I don&apos;t know why, and after a few tries I gave up.
          </p>
          <p>
            Which was lucky, because I already had a blogging site. So I
            stopped looking for somewhere to post.
          </p>
        </Reveal>
      </section>

      {/* The turning point gets the whole width */}
      <section id="user" className="about-turn">
        <Reveal className="about-turn-inner">
          <span className="about-num about-num-light">03</span>
          <p className="about-turn-lead">That changed the project completely.</p>
          <blockquote className="about-turn-quote">
            I was the user now, and the standard went up overnight.
          </blockquote>
        </Reveal>
      </section>

      <section id="unseen" className="about-chapter about-chapter-wide">
        <Reveal className="about-chapter-head">
          <span className="about-num">04</span>
          <h2>The work nobody sees.</h2>
          <p className="about-chapter-note">
            You do not find these in a demo. You find them when someone real
            hits them.
          </p>
        </Reveal>
        <div className="about-cards">
          {UNSEEN_WORK.map((item, i) => (
            <Reveal key={item.title} className="about-card" delay={i * 90}>
              <span className="about-card-index">
                {String.fromCharCode(97 + i)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="about-chapter-body about-after-cards">
          <p>
            None of it shows when it works, and that is what makes it good
            work. It is the whole distance between a demo and something a
            person can actually use, and I only learned it because the person
            using it was me.
          </p>
        </Reveal>
      </section>

      <section id="now" className="about-end">
        <Reveal className="about-end-inner">
          <span className="about-num">05</span>
          <h2 className="about-end-title">
            So Familiar is a site I built,{" "}
            <br />
            and it is where I <em>write</em>.
          </h2>
          <div className="about-actions">
            <Link to="/write" className="about-btn about-btn-primary">
              Start writing
            </Link>
            <Link to={`/article/${STORY_ARTICLE_ID}`} className="about-btn">
              Read the full story
            </Link>
            <Link to={`/profile/${AUTHOR_PROFILE_ID}`} className="about-btn">
              See what I&apos;ve written
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
