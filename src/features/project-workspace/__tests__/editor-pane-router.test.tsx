import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorPaneRouter } from "../editor-pane-router";

// Mock CanvasRoom and DocumentEditor to keep the router test pure
vi.mock("@/features/canvas/canvas-room", () => ({
  CanvasRoom: ({ roomId }: { roomId: string }) => (
    <div data-testid="mock-canvas-room">CanvasRoom: {roomId}</div>
  ),
}));

vi.mock("@/features/document/document-editor", () => ({
  DocumentEditor: ({ roomId }: { roomId: string }) => (
    <div data-testid="mock-document-editor">DocumentEditor: {roomId}</div>
  ),
}));

describe("EditorPaneRouter", () => {
  it("renders CanvasRoom for fileType 'canvas'", () => {
    render(
      <EditorPaneRouter
        fileId="file-1"
        fileType="canvas"
        liveblocksRoomId="room-canvas-1"
      />,
    );
    expect(screen.getByTestId("mock-canvas-room")).toBeInTheDocument();
    expect(screen.getByText("CanvasRoom: room-canvas-1")).toBeInTheDocument();
  });

  it("renders DocumentEditor for fileType 'document'", async () => {
    render(
      <EditorPaneRouter
        fileId="file-2"
        fileType="document"
        liveblocksRoomId="room-doc-2"
      />,
    );
    expect(
      await screen.findByTestId("mock-document-editor"),
    ).toBeInTheDocument();
    expect(screen.getByText("DocumentEditor: room-doc-2")).toBeInTheDocument();
  });

  it("renders fallback message for unknown fileType", () => {
    render(<EditorPaneRouter fileId="file-3" fileType="unknown_type" />);
    expect(screen.getByText("Unsupported File Type")).toBeInTheDocument();
    expect(
      screen.getByText(/The file type "unknown_type" cannot be opened/),
    ).toBeInTheDocument();
  });

  it("uses default fallback roomId if liveblocksRoomId is omitted", () => {
    render(<EditorPaneRouter fileId="file-99" fileType="canvas" />);
    expect(screen.getByText("CanvasRoom: file_file-99")).toBeInTheDocument();
  });
});
