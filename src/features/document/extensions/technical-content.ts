import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Emoji } from "@tiptap/extension-emoji";
import { Link } from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import type { Extension } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import bash from "highlight.js/lib/languages/bash";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { CodeBlockView } from "../ui/code-block-view";

/** Ten languages, registered individually. lowlight/all is ~190 grammars. */
export const CODE_LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash" },
  { id: "yaml", label: "YAML" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
] as const;

const lowlight = createLowlight();
lowlight.register("typescript", typescript);
lowlight.register("javascript", javascript);
lowlight.register("python", python);
lowlight.register("sql", sql);
lowlight.register("json", json);
lowlight.register("bash", bash);
lowlight.register("yaml", yaml);
lowlight.register("go", go);
lowlight.register("rust", rust);
lowlight.register("java", java);

export const technicalContentExtensions: Extension[] = [
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },
  }).configure({ lowlight, defaultLanguage: null }),

  // throwOnError: false is required — a formula typo must not blank the document.
  Mathematics.configure({ katexOptions: { throwOnError: false } }),

  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["http", "https", "mailto"],
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),

  Emoji.configure({ enableEmoticons: true }),
] as unknown as Extension[];
