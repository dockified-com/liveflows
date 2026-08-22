import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorPaneRouter } from "./editor-pane-router";

// Mock CanvasRoom
vi.mock("@/features/canvas/canvas-room", () => ({
  CanvasRoom: ({ roomId }: { roomId: string }) => (
    <div data-testid="canvas-room">Canvas Room: {roomId}</div>
  ),
}));

// Mock DocumentEditor
vi.mock("@/features/document/document-editor", () => ({
  DocumentEditor: ({ roomId }: { roomId: string }) => (
    <div data-testid="document-editor">Document Editor: {roomId}</div>
  ),
}));

describe("EditorPaneRouter", () => {
  beforeEach(() => {
    cleanup();
  });

  it("renders CanvasRoom for canvas fileType", () => {
    render(<EditorPaneRouter fileId="f1" fileType="canvas" roomId="room-1" />);

    expect(screen.getByTestId("canvas-room")).toBeInTheDocument();
    expect(screen.getByText("Canvas Room: room-1")).toBeInTheDocument();
  });

  it("renders DocumentEditor for document fileType", async () => {
    render(
      <EditorPaneRouter fileId="f2" fileType="document" roomId="room-2" />,
    );

    const docEditor = await screen.findByTestId("document-editor");
    expect(docEditor).toBeInTheDocument();
    expect(screen.getByText("Document Editor: room-2")).toBeInTheDocument();
  });

  it("renders unsupported file state for unknown fileType", () => {
    render(<EditorPaneRouter fileId="f3" fileType="unknown_type" />);

    expect(screen.getByText("Unsupported File Type")).toBeInTheDocument();
    expect(
      screen.getByText(/The file type "unknown_type" cannot be opened/i),
    ).toBeInTheDocument();
  });
});
