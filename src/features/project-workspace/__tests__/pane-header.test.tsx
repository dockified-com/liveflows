import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaneHeader } from "../pane-header";

describe("PaneHeader", () => {
  it("renders file name and status for connected state", () => {
    render(
      <PaneHeader
        fileName="Architecture Diagram"
        fileType="canvas"
        connectionStatus="connected"
      />,
    );
    expect(screen.getByText("Architecture Diagram")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders reconnecting badge for reconnecting state", () => {
    render(
      <PaneHeader
        fileName="Design Spec"
        fileType="document"
        connectionStatus="reconnecting"
      />,
    );
    expect(screen.getByText("Design Spec")).toBeInTheDocument();
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
  });

  it("renders offline badge for offline state", () => {
    render(
      <PaneHeader
        fileName="System Flow"
        fileType="canvas"
        connectionStatus="offline"
      />,
    );
    expect(screen.getByText("Offline — read only")).toBeInTheDocument();
  });

  it("renders connecting badge for loading state", () => {
    render(<PaneHeader connectionStatus="loading" />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });
});
