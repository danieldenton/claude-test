import { Loader2 } from "lucide-react";

interface StrReplaceArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "str_replace_editor") {
    const { command, path } = args as StrReplaceArgs;
    switch (command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Reading ${path}`;
      default:
        return `Updating ${path}`;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args as FileManagerArgs;
    switch (command) {
      case "rename":
        return `Renaming ${path} to ${new_path}`;
      case "delete":
        return `Deleting ${path}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  done: boolean;
}

export function ToolCallBadge({ toolName, args, done }: ToolCallBadgeProps) {
  const label = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
