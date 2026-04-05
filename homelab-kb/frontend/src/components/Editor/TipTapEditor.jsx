import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Toolbar from "./Toolbar";
import { buildExtensions } from "./extensions";

export default function TipTapEditor({ content, onChange, editable = true }) {
  const editor = useEditor({
    extensions: buildExtensions(),
    content: content || "",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      handleDrop(view, event, _slice, moved) {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (!file.type.startsWith("image/")) return false;
          const reader = new FileReader();
          reader.onload = (e) => {
            const { schema } = view.state;
            const coords = { left: event.clientX, top: event.clientY };
            const pos = view.posAtCoords(coords);
            if (!pos) return;
            const node = schema.nodes.image.create({ src: e.target.result });
            const transaction = view.state.tr.insert(pos.inside || pos.pos, node);
            view.dispatch(transaction);
          };
          reader.readAsDataURL(file);
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: e.target.result })
                )
              );
            };
            reader.readAsDataURL(file);
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync content when it changes externally (e.g., loading an article)
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface-1">
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="min-h-[400px] focus-within:ring-1 focus-within:ring-accent/30"
      />
    </div>
  );
}
