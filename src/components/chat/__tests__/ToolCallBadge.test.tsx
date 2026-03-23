import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function pending(toolName: string, args: Record<string, unknown>): ToolInvocation {
  return { toolCallId: "test-id", state: "call", toolName, args };
}

function done(toolName: string, args: Record<string, unknown>): ToolInvocation {
  return { toolCallId: "test-id", state: "result", toolName, args, result: "Success" };
}

// str_replace_editor labels
test("shows 'Creating' for str_replace_editor create command", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "str_replace", path: "/src/Card.tsx" })} />);
  expect(screen.getByText("Editing Card.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "insert", path: "/index.ts" })} />);
  expect(screen.getByText("Editing index.ts")).toBeDefined();
});

test("shows 'Viewing' for str_replace_editor view command", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "view", path: "/utils.ts" })} />);
  expect(screen.getByText("Viewing utils.ts")).toBeDefined();
});

test("shows 'Undoing edit' for str_replace_editor undo_edit command", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "undo_edit", path: "/helpers.ts" })} />);
  expect(screen.getByText("Undoing edit in helpers.ts")).toBeDefined();
});

// file_manager labels
test("shows 'Renaming' for file_manager rename command", () => {
  render(<ToolCallBadge toolInvocation={pending("file_manager", { command: "rename", path: "/Button.tsx", new_path: "/PrimaryButton.tsx" })} />);
  expect(screen.getByText("Renaming Button.tsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(<ToolCallBadge toolInvocation={pending("file_manager", { command: "delete", path: "/OldComponent.tsx" })} />);
  expect(screen.getByText("Deleting OldComponent.tsx")).toBeDefined();
});

// State indicators
test("shows spinner when state is pending", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={pending("str_replace_editor", { command: "create", path: "/App.jsx" })} />
  );
  expect(container.querySelector("svg")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={done("str_replace_editor", { command: "create", path: "/App.jsx" })} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector("svg")).toBeNull();
});

// Fallback
test("falls back to raw tool name when no path is provided", () => {
  render(<ToolCallBadge toolInvocation={pending("str_replace_editor", {})} />);
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("falls back to raw tool name for unknown tools", () => {
  render(<ToolCallBadge toolInvocation={pending("unknown_tool", { path: "/file.ts" })} />);
  expect(screen.getByText("unknown_tool")).toBeDefined();
});
