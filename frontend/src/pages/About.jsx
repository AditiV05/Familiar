import { Link } from "react-router-dom";
import "./About.css";

// The story behind Familiar, adapted from the post "So I built my own".
// Plain text on purpose: edit the words here, no database involved.
const STORY_ARTICLE_ID = "6a995aefaadc277608347411";
const AUTHOR_PROFILE_ID = "6a54efca05ec0838e45294f6";

const About = () => (
  <div className="about-container">
    <header className="about-header">
      <p className="about-kicker">About</p>
      <h1 className="about-title">Why Familiar exists</h1>
      <p className="about-lede">
        I&apos;m Aditi, a final-year student. I build things and ship them.
        This is the one I write on.
      </p>
    </header>

    <div className="about-body">
      <p>
        Familiar started as a side project. A blogging site, the usual kind: a
        login, a database, a text editor, a feed. It worked, and for a while
        that was enough.
      </p>
      <p>
        Then I tried to make a Medium account and couldn&apos;t. It kept
        refusing, I don&apos;t know why, and after a few tries I gave up. Which
        was lucky, because I already had a blogging site. So I stopped looking
        for somewhere to post.
      </p>
      <p>That changed the project completely.</p>
      <blockquote className="pull-quote">
        I was the user now, and the standard went up overnight.
      </blockquote>
      <p>
        Someone signs in with Google using an email that already has a password
        account on it. The right answer is not a second account. It is to
        recognise the person and link the two together. You do not find that in
        a demo. You find it when someone real hits it.
      </p>
      <p>
        Or sharing. The button is a few lines. Making the link look like
        something when it lands in a WhatsApp chat is a different problem. Then
        there are verification links that expire, password resets that work
        once, and every page rebuilt for a phone.
      </p>
      <p>
        None of it shows when it works, and that is what makes it good work. It
        is the whole distance between a demo and something a person can
        actually use, and I only learned it because the person using it was
        me.
      </p>
      <p>
        <em>So Familiar is a site I built, and it is where I write.</em>
      </p>
    </div>

    <footer className="about-footer">
      <Link to={`/article/${STORY_ARTICLE_ID}`} className="about-link">
        Read the full story
      </Link>
      <Link to={`/profile/${AUTHOR_PROFILE_ID}`} className="about-link">
        See what I&apos;ve written
      </Link>
    </footer>
  </div>
);

export default About;
