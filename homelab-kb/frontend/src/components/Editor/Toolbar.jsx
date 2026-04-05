import React, { useRef } from "react";

const COLORS = [
  "#e2e2e8", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
];

function ToolbarButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`
        px-2 py-1 rounded text-sm transition-colors select-none
        ${active
          ? "bg-accent text-white"
          : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1 self-center" />;
}

export default function Toolbar({ editor }) {
  const colorInputRef = useRef(null);

  if (!editor) return null;

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editor.chain().focus().setImage({ src: ev.target.result }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL:", prev);
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-surface-2 border-b border-border rounded-t-lg">
      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >↩</ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >↪</ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >H1</ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >H2</ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >H3</ToolbarButton>

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      ><strong>B</strong></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      ><em>I</em></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      ><span className="underline">U</span></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      ><span className="line-through">S</span></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline code (Ctrl+`)"
      ><code className="font-mono text-xs">`c`</code></ToolbarButton>

      <Divider />

      {/* Color */}
      <div className="relative flex items-center">
        <input
          ref={colorInputRef}
          type="color"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          defaultValue="#e2e2e8"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          title="Text color"
        />
        <span className="px-2 py-1 rounded text-sm hover:bg-surface-3 cursor-pointer select-none text-text-secondary">
          A<span
            className="inline-block w-3 h-0.5 ml-0.5 rounded"
            style={{ backgroundColor: editor.getAttributes("textStyle").color || "#e2e2e8" }}
          />
        </span>
      </div>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#7c3aed33" }).run()}
        active={editor.isActive("highlight")}
        title="Highlight"
      >
        <span className="bg-purple-900/50 px-1 rounded text-xs">HL</span>
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list (Ctrl+Shift+8)"
      >• —</ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered list (Ctrl+Shift+9)"
      >1. —</ToolbarButton>

      <Divider />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
      >❝</ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code block"
      ><code className="font-mono text-xs">{"{}"}</code></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >—</ToolbarButton>

      <Divider />

      {/* Link, image, table */}
      <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Insert link (Ctrl+K)">
        🔗
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Insert image">
        🖼
      </ToolbarButton>
      <ToolbarButton onClick={insertTable} title="Insert table">
        ⊞
      </ToolbarButton>
    </div>
  );
}
