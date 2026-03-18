import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

test("shows 'Creating' for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/components/Button.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Editing /components/Button.jsx")).toBeDefined();
});

test("shows 'Reading' for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/App.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/OldName.jsx", new_path: "/NewName.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Renaming /OldName.jsx to /NewName.jsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/App.jsx" }}
      done={false}
    />
  );
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("falls back to toolName for unknown tools", () => {
  render(
    <ToolCallBadge
      toolName="unknown_tool"
      args={{}}
      done={false}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("shows spinner when not done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      done={false}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      done={true}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
