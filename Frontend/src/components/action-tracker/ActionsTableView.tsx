import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";
import { GlobalActionItem } from "./types";

interface ActionsTableViewProps {
  actions: GlobalActionItem[];
  onEdit: (item: GlobalActionItem) => void;
  onDelete: (id: string) => void;
}

export default function ActionsTableView({ actions, onEdit, onDelete }: ActionsTableViewProps) {
  const router = useRouter();

  return (
    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden bg-card">
      <CardContent className="flex-1 min-h-0 overflow-auto p-0 no-scrollbar">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feedback</TableHead>
                <TableHead>Action Item</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <button
                      onClick={() => router.push(`/chat/${item.feedbackId}`)}
                      className="font-semibold text-[13px] hover:underline text-left max-w-[150px] truncate block text-primary cursor-pointer"
                    >
                      📋 {item.feedbackTitle}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium text-[13px]">
                    <div dangerouslySetInnerHTML={{ __html: item.description }} />
                  </TableCell>
                  <TableCell className="text-[13px]">{item.owner}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.priority === "High" ? "destructive" : "secondary"}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Completed" ? "default" : item.status === "Blocked" ? "destructive" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => onEdit(item)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards List */}
        <div className="block lg:hidden divide-y divide-border overflow-y-auto h-full">
          {actions.map((item) => (
            <div key={item.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => router.push(`/chat/${item.feedbackId}`)}
                  className="font-semibold text-xs text-primary hover:underline text-left leading-normal block cursor-pointer"
                >
                  📋 {item.feedbackTitle}
                </button>
                <Badge
                  variant={item.priority === "High" ? "destructive" : "secondary"}
                  className="text-[9px] px-1.5 py-0 shrink-0"
                >
                  {item.priority}
                </Badge>
              </div>

              <div
                className="text-xs font-medium text-foreground leading-normal"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>Assignee: <strong className="text-foreground">{item.owner}</strong></span>
                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge
                  variant={item.status === "Completed" ? "default" : item.status === "Blocked" ? "destructive" : "secondary"}
                  className="text-[9px]"
                >
                  {item.status}
                </Badge>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted cursor-pointer"
                    onClick={() => onEdit(item)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
