import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import type { Extension } from "@tiptap/react";

/**
 * The formatting marks StarterKit does not ship.
 *
 * bold / italic / strike / inline code come from StarterKit already.
 */
export const formattingExtensions: Extension[] = [
  Underline,
  // multicolor is required for toggleHighlight({ color }) to accept an argument.
  Highlight.configure({ multicolor: true }),
  // TextStyle is a required peer of Color — Color alone silently does nothing.
  TextStyle,
  Color,
  // Superscript and subscript are mutually exclusive marks.
  Superscript.extend({ excludes: "subscript" }),
  Subscript.extend({ excludes: "superscript" }),
  // Without an explicit types list, TextAlign registers but has no effect.
  TextAlign.configure({ types: ["heading", "paragraph"] }),
] as Extension[];
