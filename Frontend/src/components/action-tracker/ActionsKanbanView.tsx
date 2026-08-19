import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit2, Trash2, CheckCircle2, Circle, Clock, AlertOctagon } from "lucide-react";
import { GlobalActionItem } from "./types";

interface ActionsKanbanViewProps {
  actions: GlobalActionItem[];
  onEdit: (item: GlobalActionItem) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (
    item: GlobalActionItem,
    newStatus: "Open" | "In Progress" | "Blocked" | "Completed"
  ) => void;
}

const statuses: ("Open" | "In Progress" | "Blocked" | "Completed")[] = [
  "Open",
  "In Progress",
  "Blocked",
  "Completed",
];

export default function ActionsKanbanView({
  actions,
  onEdit,
  onDelete,
  onUpdateStatus,
}: ActionsKanbanViewProps) {
  const router = useRouter();
  const [kanbanMobileTab, setKanbanMobileTab] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
      case "Blocked":
        return <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "border-t-2 border-t-emerald-500";
      case "In Progress":
        return "border-t-2 border-t-amber-500";
      case "Blocked":
        return "border-t-2 border-t-destructive";
      default:
        return "border-t-2 border-t-muted-foreground/30";
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-4 lg:gap-4 lg:h-full w-full space-y-2 lg:space-y-0">
      {/* Kanban Mobile/Tablet Switcher */}
      <div className="flex lg:hidden border border-border bg-muted/40 p-1.5 rounded-lg space-x-1 w-full mb-2 shrink-0">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setKanbanMobileTab(s)}
            className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all cursor-pointer ${
              kanbanMobileTab === s
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {statuses.map((status) => {
        const columnActions = actions.filter((a) => a.status === status);
        const isVisibleOnMobile = kanbanMobileTab === status;
        return (
          <div
            key={status}
            className={`${
              isVisibleOnMobile ? "flex" : "hidden lg:flex"
            } bg-muted/30 rounded-xl border border-border p-3 space-y-3 flex flex-col h-[480px] lg:h-full min-h-0`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="font-semibold text-[13px] text-foreground">{status}</span>
              </div>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                {columnActions.length}
              </Badge>
            </div>

            <Separator />

            {/* Cards Container */}
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
              {columnActions.length > 0 ? (
                columnActions.map((item) => (
                  <Card
                    key={item.id}
                    className={`bg-card shadow-sm hover:shadow transition-shadow ${getStatusColorClass(
                      status
                    )}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Feedback Title Link */}
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => router.push(`/chat/${item.feedbackId}`)}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-primary hover:underline text-left truncate flex-1 cursor-pointer"
                        >
                          📋 {item.feedbackTitle}
                        </button>
                        <Badge
                          variant={item.priority === "High" ? "destructive" : "secondary"}
                          className="text-[9px] px-1 py-0"
                        >
                          {item.priority}
                        </Badge>
                      </div>

                      {/* Description */}
                      <div
                        className="text-[13px] font-medium text-foreground leading-normal"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />

                      {/* Owner & Date */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          Assignee: <strong className="text-foreground">{item.owner}</strong>
                        </span>
                        <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>

                      <Separator />

                      {/* Card Controls */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {/* Fast Status Change Select */}
                        <select
                          value={item.status}
                          onChange={(e) => onUpdateStatus(item, e.target.value as any)}
                          className="bg-muted text-muted-foreground text-[10px] font-medium py-1 px-1.5 rounded border border-border/80 outline-none focus:border-primary shrink-0"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 cursor-pointer"
                            onClick={() => onEdit(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-lg text-center h-24">
                  <span className="text-[11px] text-muted-foreground/60 italic">No tasks</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
