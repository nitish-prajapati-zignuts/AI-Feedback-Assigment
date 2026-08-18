"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  LogOut,
  Sun,
  Moon,
  MessageSquareText,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/chat", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat/actions", label: "Actions Tracker", icon: ClipboardList },
  { href: "/chat/create", label: "Submit Feedback", icon: Plus },
];

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href: string) => {
    if (href === "/chat") {
      return pathname === "/chat" || (pathname.startsWith("/chat/") && !pathname.startsWith("/chat/actions") && !pathname.startsWith("/chat/create"));
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-sidebar flex flex-col h-full shrink-0 transition-transform duration-300 md:relative md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo & Close Button (Close button only on mobile) */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-sidebar-border gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">Feedback Hub</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden text-sidebar-foreground/60 hover:text-foreground"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-semibold text-xs shrink-0">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-[13px] font-medium text-sidebar-foreground truncate">
                {user?.username || "User"}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-sidebar-foreground/60 hover:text-destructive hover:bg-muted transition-colors"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="right">Log Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-4 md:px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for mobile */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              {pathname === "/chat" && "Dashboard"}
              {pathname === "/chat/create" && "Submit Feedback"}
              {pathname === "/chat/actions" && "Actions Tracker"}
              {pathname.match(/^\/chat\/[^/]+$/) && !pathname.includes("create") && !pathname.includes("actions") && "Feedback Details"}
              {pathname.match(/\/edit$/) && "Edit Feedback"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </TooltipTrigger>
                <TooltipContent>Toggle Theme</TooltipContent>
              </Tooltip>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
