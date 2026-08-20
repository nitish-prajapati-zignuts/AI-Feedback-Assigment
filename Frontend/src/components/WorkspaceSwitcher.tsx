"use client";

import React, { useEffect, useState } from "react";
import { useWorkspaceStore, Workspace } from "@/store/useWorkspaceStore";
import { Building2, Check, Plus, Users, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, fetchWorkspaces, setActiveWorkspace, createWorkspace } =
    useWorkspaceStore();
  const [openCreate, setOpenCreate] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      setIsSubmitting(true);
      await createWorkspace(newWsName.trim());
      toast.success("Workspace created!");
      setNewWsName("");
      setOpenCreate(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-sidebar-foreground border border-sidebar-border/60 bg-sidebar-accent/20 hover:bg-sidebar-accent/50 rounded-lg"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="flex flex-col text-left truncate">
                <span className="truncate font-semibold text-[12px]">
                  {activeWorkspace?.name || "Loading..."}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {activeWorkspace?.role || "Member"} Role
                </span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws: Workspace) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => setActiveWorkspace(ws)}
              className="flex items-center justify-between text-xs cursor-pointer py-1.5"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{ws.name}</span>
              </div>
              {activeWorkspace?.id === ws.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setOpenCreate(true)}
            className="flex items-center gap-2 text-xs text-primary cursor-pointer font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Workspace
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="flex items-center gap-2 text-xs cursor-pointer">
            <Link href="/chat/settings">
              <Users className="h-3.5 w-3.5" />
              Workspace Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wsName" className="text-xs">
                Workspace Name
              </Label>
              <Input
                id="wsName"
                placeholder="e.g. Acme Corp Product Team"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || !newWsName.trim()}>
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
