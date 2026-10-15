// The theme is "light" or "dark". Until the reader picks one it follows
// their device. index.html applies it before the first paint so the page
// never flashes the wrong colours; keep the two in step.
const KEY = "theme";
const systemDark = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const stored = () => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

export const getTheme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

const apply = (theme) => {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("themechange"));
};

export const setTheme = (theme) => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode. It still applies for this visit.
  }
  apply(theme);
};

// Called once at startup. If the reader never chose, track the device
// setting as it changes (for example a phone switching at sunset).
export const followSystemTheme = () => {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return;
  media.addEventListener?.("change", () => {
    if (!stored()) apply(systemDark() ? "dark" : "light");
  });
};
