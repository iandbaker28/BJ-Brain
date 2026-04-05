import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import sql from "highlight.js/lib/languages/sql";
import { Extension } from "@tiptap/core";

const lowlight = createLowlight();
lowlight.register("bash", bash);
lowlight.register("python", python);
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("yaml", yaml);
lowlight.register("json", json);
lowlight.register("xml", xml);
lowlight.register("css", css);
lowlight.register("dockerfile", dockerfile);
lowlight.register("nginx", nginx);
lowlight.register("sql", sql);

// Custom image extension that supports drag-drop and paste as base64
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },
});

// Custom link with Ctrl+K shortcut
const CustomLink = Link.extend({
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        const { selection } = this.editor.state;
        const hasSelection = !selection.empty;
        const url = window.prompt("Enter URL:", hasSelection ? "" : "");
        if (url === null) return true;
        if (url === "") {
          this.editor.chain().focus().unsetLink().run();
          return true;
        }
        this.editor.chain().focus().setLink({ href: url }).run();
        return true;
      },
    };
  },
});

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: {},
      codeBlock: false, // replaced by CodeBlockLowlight
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: "bash" }),
    CustomImage.configure({ allowBase64: true, inline: false }),
    CustomLink.configure({ openOnClick: false, autolink: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: "Start writing your article..." }),
  ];
}
