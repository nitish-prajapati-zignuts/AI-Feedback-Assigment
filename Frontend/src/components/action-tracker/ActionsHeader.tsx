import React from "react";
import { Button } from "@/components/ui/button";

interface ActionsHeaderProps {
  viewMode: "table" | "kanban";
  setViewMode: (mode: "table" | "kanban") => void;
}

export default function ActionsHeader({ viewMode, setViewMode }: ActionsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Action Items</h2>
        <p className="text-xs text-muted-foreground">Manage and track follow-up tasks from customer feedback</p>
      </div>
      <div className="flex gap-1 border border-border p-0.5 rounded-lg bg-muted/40 self-start sm:self-auto shrink-0">
        <Button
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold px-3 rounded-md"
          onClick={() => setViewMode("table")}
        >
          Table View
        </Button>
        <Button
          variant={viewMode === "kanban" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 text-xs font-semibold px-3 rounded-md"
          onClick={() => setViewMode("kanban")}
        >
          Kanban Board
        </Button>
      </div>
    </div>
  );
}
