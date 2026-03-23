"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getLabel(toolInvocation: ToolInvocation): string {
  const { toolName, args } = toolInvocation;
  const filename = args?.path ? (args.path as string).split("/").pop() : null;

  if (toolName === "str_replace_editor" && filename) {
    switch (args.command) {
      case "create":     return `Creating ${filename}`;
      case "str_replace": return `Editing ${filename}`;
      case "insert":     return `Editing ${filename}`;
      case "view":       return `Viewing ${filename}`;
      case "undo_edit":  return `Undoing edit in ${filename}`;
    }
  }

  if (toolName === "file_manager" && filename) {
    switch (args.command) {
      case "rename": return `Renaming ${filename}`;
      case "delete": return `Deleting ${filename}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getLabel(toolInvocation);
  const isDone = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
