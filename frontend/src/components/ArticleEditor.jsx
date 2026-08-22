import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./ArticleEditor.css";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_BYTES = 10 * 1024 * 1024;

// Cap the delivered width and let Cloudinary pick the quality. A 6MB phone
// photo becomes a few hundred KB without the author doing anything.
// Deliberately not using f_auto: link preview crawlers do not all understand
// WebP, and the first image in an article is also its preview image.
const optimise = (url) =>
  url.replace("/image/upload/", "/image/upload/q_auto,w_1400/");

const uploadToCloudinary = async (file) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image uploads are not configured yet.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) throw new Error("Upload failed. Try again.");

  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload failed. Try again.");

  return optimise(data.secure_url);
};

const ArticleEditor = ({ value, onChange, placeholder }) => {
  const quillRef = useRef(null);
  const containerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  // The image the author has clicked on, plus where to draw its outline.
  const [selected, setSelected] = useState(null);

  const insertImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    if (file.size > MAX_BYTES) {
      setUploadError("That image is over 10MB. Try a smaller one.");
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      // Drop it wherever the cursor is, or at the end if there is no cursor.
      const range = editor.getSelection(true) || { index: editor.getLength() };
      editor.insertEmbed(range.index, "image", url, "user");
      editor.setSelection(range.index + 1, 0, "user");
    } catch (err) {
      setUploadError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  // Replaces Quill's built-in handler, which embeds the file as base64
  // straight into the article HTML.
  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (file) insertImage(file);
    };
    input.click();
  }, [insertImage]);

  // Backspace already deletes an image, but nothing tells the author that.
  // Clicking one selects it and offers a button instead.
  const removeSelected = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor || !selected?.node) return;

    const blot = Quill.find(selected.node);
    if (blot) {
      const index = editor.getIndex(blot);
      editor.deleteText(index, 1, "user");
    }
    setSelected(null);
  }, [selected]);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const root = editor.root;

    const handleDrop = (e) => {
      const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      files.forEach(insertImage);
    };

    const handlePaste = (e) => {
      const files = Array.from(e.clipboardData?.items || [])
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean);
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      files.forEach(insertImage);
    };

    // Measured against the container, not the page, so the outline stays put.
    const handleClick = (e) => {
      if (e.target && e.target.tagName === "IMG" && containerRef.current) {
        const img = e.target.getBoundingClientRect();
        const box = containerRef.current.getBoundingClientRect();
        setSelected({
          node: e.target,
          top: img.top - box.top,
          left: img.left - box.left,
          width: img.width,
          height: img.height,
        });
      } else {
        setSelected(null);
      }
    };

    const clear = () => setSelected(null);

    root.addEventListener("drop", handleDrop, true);
    root.addEventListener("paste", handlePaste, true);
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", clear);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);

    return () => {
      root.removeEventListener("drop", handleDrop, true);
      root.removeEventListener("paste", handlePaste, true);
      root.removeEventListener("click", handleClick);
      root.removeEventListener("keydown", clear);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, [insertImage]);

  // Must be stable. A new object here remounts the editor on every keystroke.
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["bold", "italic", "underline", "strike", "blockquote"],
          [
            { list: "ordered" },
            { list: "bullet" },
            { indent: "-1" },
            { indent: "+1" },
          ],
          ["link", "image"],
          ["clean"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    [imageHandler],
  );

  return (
    <div className="article-editor" ref={containerRef}>
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        className="writer-editor"
      />

      {selected && (
        <>
          <div
            className="image-outline"
            style={{
              top: selected.top,
              left: selected.left,
              width: selected.width,
              height: selected.height,
            }}
          />
          <button
            type="button"
            className="image-remove-btn"
            style={{
              top: selected.top + 10,
              left: selected.left + selected.width - 10,
            }}
            onClick={removeSelected}
          >
            Remove image
          </button>
        </>
      )}

      {uploading && <p className="editor-upload-note">Uploading image...</p>}
      {uploadError && <p className="editor-upload-error">{uploadError}</p>}
      {!CLOUD_NAME && (
        <p className="editor-upload-error">
          Image uploads are not configured. Add your Cloudinary variables.
        </p>
      )}
    </div>
  );
};

export default ArticleEditor;
