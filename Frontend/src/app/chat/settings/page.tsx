"use client";

import React, { useEffect, useState } from "react";
import { useWorkspaceStore, WorkspaceMember, WorkspaceInvite } from "@/store/useWorkspaceStore";
import { useAuth } from "@/context/AuthContext";
import { axiosInstance } from "@/lib/axios";
import { triggerPlanCheckout } from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Copy,
  Key,
  Code,
  Plus,
  ExternalLink,
  User,
  Lock,
  CreditCard,
  AlertTriangle,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export interface ApiKeyItem {
  id: string;
  label: string;
  keyHash: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const { user, refreshUser, logout } = useAuth();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "team" | "sdk" | "danger">("profile");

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Profile Form State
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Invite Dialog State
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);

  // API Key Dialog State
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [selectedKeyForSnippet, setSelectedKeyForSnippet] = useState<string | null>(null);

  // Account Delete Confirmation Dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const userRole = activeWorkspace?.role || "viewer";
  const canManageMembers = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const [membersRes, keysRes] = await Promise.all([
        axiosInstance.get(`/workspaces/${activeWorkspace.id}/members`),
        axiosInstance.get("/keys"),
      ]);
      setMembers(membersRes.data.members);
      setInvites(membersRes.data.invites);
      setApiKeys(keysRes.data || []);
      if (keysRes.data && keysRes.data.length > 0 && !selectedKeyForSnippet) {
        setSelectedKeyForSnippet(keysRes.data[0].keyHash);
      }
    } catch (err: any) {
      console.error("Failed to load settings data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (tokenFromUrl) {
      handleAcceptToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleAcceptToken = async (token: string) => {
    try {
      const res = await axiosInstance.post("/workspaces/invites/accept", { token });
      toast.success(res.data.message || "Joined workspace successfully!");
      await fetchWorkspaces();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept workspace invite");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      await axiosInstance.put("/auth/profile", {
        username: username.trim(),
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      toast.success("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDowngradeToFree = async () => {
    try {
      await axiosInstance.put("/auth/plan", { plan: "Free" });
      toast.success("Plan updated to Free");
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to update plan");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await axiosInstance.delete("/auth/account");
      toast.success("Account deleted");
      logout();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    try {
      const res = await axiosInstance.post(`/workspaces/${activeWorkspace.id}/invites`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(res.data.message || "Invite sent!");
      setGeneratedInviteUrl(res.data.inviteUrl);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyLabel.trim()) return;
    try {
      const res = await axiosInstance.post("/keys", { label: keyLabel.trim() });
      toast.success("API Key generated!");
      setNewlyCreatedKey(res.data.keyHash);
      setSelectedKeyForSnippet(res.data.keyHash);
      setKeyLabel("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate API Key");
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await axiosInstance.delete(`/keys/${id}`);
      toast.success("API Key revoked");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke API key");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeWorkspace) return;
    try {
      await axiosInstance.put(`/workspaces/${activeWorkspace.id}/members/${memberId}`, {
        role: newRole,
      });
      toast.success("Member role updated");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace) return;
    try {
      await axiosInstance.delete(`/workspaces/${activeWorkspace.id}/members/${memberId}`);
      toast.success("Member removed from workspace");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "editor":
        return "outline";
      default:
        return "ghost" as any;
    }
  };

  const embedScriptCode = `<script
  src="http://localhost:4000/widget.js"
  data-api-key="${selectedKeyForSnippet || "YOUR_API_KEY"}"
  data-api-host="http://localhost:4000"
  async>
</script>`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          Account & Workspace Settings
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage your personal profile, subscription plans, team workspace permissions, and widget SDK keys.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "profile", label: "User Profile", icon: User },
          { id: "billing", label: "Plan & Billing", icon: CreditCard },
          { id: "team", label: "Team & Permissions", icon: Users },
          { id: "sdk", label: "Widget SDK & API Keys", icon: Code },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all border cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-primary border-primary text-primary-foreground shadow-xs"
                  : "bg-transparent border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. USER PROFILE TAB */}
      {activeTab === "profile" && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Profile & Credentials
            </CardTitle>
            <CardDescription className="text-xs">
              Update your account details and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div className="text-xs font-semibold flex items-center gap-2 text-foreground">
                  <Lock className="h-3.5 w-3.5" /> Change Password (Optional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currPass" className="text-xs">
                      Current Password
                    </Label>
                    <Input
                      id="currPass"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPass" className="text-xs">
                      New Password
                    </Label>
                    <Input
                      id="newPass"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="sm" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? "Saving Changes..." : "Save Profile Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. PLAN & BILLING TAB */}
      {activeTab === "billing" && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" /> Active Subscription Plan
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage your subscription level and payment options powered by Razorpay.
                </CardDescription>
              </div>
              <Badge variant="default" className="capitalize text-xs font-bold px-3 py-1">
                {user?.plan || "Free"} Plan
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.usage && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Feedback Submissions Usage</span>
                    <span>
                      {user.usage.feedbackCount} /{" "}
                      {user.usage.feedbackLimit >= 9999 ? "Unlimited" : user.usage.feedbackLimit}
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        user.usage.feedbackCount / user.usage.feedbackLimit >= 0.9
                          ? "bg-rose-500"
                          : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (user.usage.feedbackCount / (user.usage.feedbackLimit || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Free Plan Box */}
                <div className={`p-4 rounded-xl border ${user?.plan === "Free" ? "border-primary bg-primary/5" : "border-border"} space-y-3`}>
                  <div className="font-bold text-sm">Free</div>
                  <div className="text-xl font-extrabold">₹0 <span className="text-xs font-normal text-muted-foreground">/ yr</span></div>
                  <div className="text-[11px] text-muted-foreground">5 Feedback limit, standard AI classification</div>
                  {user?.plan !== "Free" && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleDowngradeToFree}>
                      Downgrade to Free
                    </Button>
                  )}
                </div>

                {/* Standard Plan Box */}
                <div className={`p-4 rounded-xl border ${user?.plan === "Standard" ? "border-primary bg-primary/5" : "border-border"} space-y-3`}>
                  <div className="font-bold text-sm">Standard</div>
                  <div className="text-xl font-extrabold text-primary">₹999 <span className="text-xs font-normal text-muted-foreground">/ yr</span></div>
                  <div className="text-[11px] text-muted-foreground">25 Feedback limit, AI Insights, Team workspaces</div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold"
                    onClick={() => triggerPlanCheckout("Standard", () => window.location.reload())}
                  >
                    {user?.plan === "Standard" ? "Current Plan" : "Upgrade to Standard"}
                  </Button>
                </div>

                {/* Pro Plan Box */}
                <div className={`p-4 rounded-xl border ${user?.plan === "Pro" ? "border-primary bg-primary/5" : "border-border"} space-y-3`}>
                  <div className="font-bold text-sm">Pro</div>
                  <div className="text-xl font-extrabold text-indigo-400">₹4,999 <span className="text-xs font-normal text-muted-foreground">/ yr</span></div>
                  <div className="text-[11px] text-muted-foreground">Unlimited Feedback, Executive Digest, Widget SDK</div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => triggerPlanCheckout("Pro", () => window.location.reload())}
                  >
                    {user?.plan === "Pro" ? "Current Plan" : "Upgrade to Pro"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. TEAM & PERMISSIONS TAB */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
                <CardDescription className="text-xs">
                  Members of <span className="font-semibold text-foreground">{activeWorkspace?.name}</span> and their assigned permissions.
                </CardDescription>
              </div>
              {canManageMembers && (
                <Button size="sm" onClick={() => setOpenInviteDialog(true)} className="gap-2 text-xs">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase">
                        {m.username?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                          {m.username}
                          {m.userId === user?.id && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{m.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canManageMembers && m.role !== "owner" ? (
                        <Select
                          value={m.role}
                          onValueChange={(val) => {
                            if (val) handleRoleChange(m.id, val);
                          }}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(m.role)} className="capitalize text-xs">
                          {m.role}
                        </Badge>
                      )}

                      {canManageMembers && m.role !== "owner" && m.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveMember(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. WIDGET SDK & API KEYS TAB */}
      {activeTab === "sdk" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" /> Embeddable Feedback Widget SDK
              </CardTitle>
              <CardDescription className="text-xs">
                Generate API keys to embed a live floating feedback widget on external websites.
              </CardDescription>
            </div>
            {canManageMembers && (
              <Button size="sm" onClick={() => setOpenKeyDialog(true)} className="gap-2 text-xs">
                <Plus className="h-4 w-4" />
                Generate API Key
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-xs font-semibold mb-2">Active API Keys</div>
              {apiKeys.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                  No API keys generated yet. Click "Generate API Key" to get started.
                </div>
              ) : (
                <div className="divide-y divide-border border rounded-lg overflow-hidden">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="p-3 flex items-center justify-between text-xs bg-card">
                      <div>
                        <div className="font-semibold text-foreground">{k.label}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{k.keyHash}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={selectedKeyForSnippet === k.keyHash ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setSelectedKeyForSnippet(k.keyHash)}
                        >
                          Use in Snippet
                        </Button>
                        {canManageMembers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevokeKey(k.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">HTML Embed Snippet</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => window.open("http://localhost:4000/example.html", "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Live Demo Page
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(embedScriptCode);
                      toast.success("Widget script copied to clipboard!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy HTML Snippet
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste this snippet right before the closing <code className="text-primary font-mono">&lt;/body&gt;</code> tag on your website to render a floating feedback button.
              </p>
              <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                <code>{embedScriptCode}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. DANGER ZONE TAB */}
      {activeTab === "danger" && (
        <Card className="border-rose-500/30 bg-rose-500/5 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-xs">
              Irreversible account operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-rose-500/20 bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Delete User Account</div>
                <div className="text-[11px] text-muted-foreground">
                  Permanently remove your account and all associated workspace ownership.
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 text-xs font-bold"
                onClick={() => setOpenDeleteDialog(true)}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={openInviteDialog} onOpenChange={setOpenInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Invite Team Member</DialogTitle>
          </DialogHeader>
          {generatedInviteUrl ? (
            <div className="space-y-3 py-3">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Invite Token Generated!
              </div>
              <div className="p-2.5 rounded-lg bg-muted flex items-center justify-between text-xs font-mono break-all">
                <span>{generatedInviteUrl}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    if (generatedInviteUrl) {
                      navigator.clipboard.writeText(generatedInviteUrl);
                      toast.success("Invite link copied!");
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    setGeneratedInviteUrl(null);
                    setOpenInviteDialog(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail" className="text-xs">
                  User Email Address
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inviteRole" className="text-xs">
                  Role Permission
                </Label>
                <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                  <SelectTrigger id="inviteRole" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Manage team & all data)</SelectItem>
                    <SelectItem value="editor">Editor (Create/edit feedback & notes)</SelectItem>
                    <SelectItem value="viewer">Viewer (Read-only access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!inviteEmail.trim()}>
                  Generate Invite
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate API Key Dialog */}
      <Dialog open={openKeyDialog} onOpenChange={setOpenKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Generate API Key</DialogTitle>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-3 py-3">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> API Key Created!
              </div>
              <div className="p-2.5 rounded-lg bg-muted flex items-center justify-between text-xs font-mono break-all">
                <span>{newlyCreatedKey}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedKey);
                    toast.success("API Key copied!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    setOpenKeyDialog(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="keyLabel" className="text-xs">
                  Key Label / Description
                </Label>
                <Input
                  id="keyLabel"
                  placeholder="e.g. Marketing Website Widget"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenKeyDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!keyLabel.trim()}>
                  Generate Key
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-rose-500">
              Confirm Account Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              This action cannot be undone. Type <code className="font-bold text-foreground">DELETE</code> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
