"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ChevronRight,
  Shield,
  Bot,
  BarChart3,
  CreditCard,
  MessageSquare,
  Lock,
  ArrowRight,
  Send,
  Sparkles,
  RefreshCw,
  Trash2,
  Edit,
  Settings,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function TeamMembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Store Workspace");
  const [businessType, setBusinessType] = useState<"ecommerce" | "services">("ecommerce");

  const [teamList, setTeamList] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [inviteTeamId, setInviteTeamId] = useState<string | undefined>(undefined);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    token: string;
    inviteLink?: string;
    teamName?: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamType, setTeamType] = useState("custom");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editRole, setEditRole] = useState("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeam = async () => {
    setIsLoading(true);
    setIsLoadingInvitations(true);
    try {
      const [teamRes, settingsRes, teamsRes, invitationsRes] =
        await Promise.all([
          fetch("/api/v1/dashboard/team"),
          fetch("/api/v1/dashboard/settings"),
          fetch("/api/v1/dashboard/teams"),
          fetch("/api/v1/dashboard/invitations"),
        ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        if (data.members) {
          setTeamList(
            data.members.map((m: any) => ({
              id: m.id,
              name: m.user?.name || "Unknown User",
              email: m.user?.email || "",
              role: m.role,
              status: "Active",
              isCurrentUser: false,
              avatar: m.user?.name?.substring(0, 2).toUpperCase() || "U",
              title: `${m.role.charAt(0).toUpperCase() + m.role.slice(1)} Member`,
              lastActive: "Recently",
              image: undefined,
            }))
          );
        }
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.business?.name) {
          setWorkspaceName(`${sData.business.name} Workspace`);
        }
        if (sData.business?.businessType === "services") {
          setBusinessType("services");
        } else if (sData.business?.businessType) {
          setBusinessType("ecommerce");
        }
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        if (tData.teams) {
          setTeams(tData.teams);
        }
      }

      if (invitationsRes.ok) {
        const iData = await invitationsRes.json();
        if (iData.invitations) {
          setInvitations(iData.invitations);
        }
      }
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    const invitedEmail = inviteEmail;
    setIsSubmitting(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/v1/dashboard/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
          teamId: inviteTeamId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const inviteLink = `/invite/accept?token=${data.token || ""}`;
        setInviteResult({
          email: invitedEmail,
          token: data.token || "",
          inviteLink,
          teamName: teams.find((t) => t.id === inviteTeamId)?.name,
        });
        setInviteEmail("");
        setInviteName("");
        setInviteTeamId(undefined);
        await loadTeam();
        toast.success(data.message || `Invitation created for ${invitedEmail}`);
      } else {
        const message =
          data?.error?.message || "Failed to send invitation";
        setInviteError(message);
        toast.error(message);
      }
    } catch (err: any) {
      const message = err?.message || "Error inviting team member";
      setInviteError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateTeamModal = () => {
    setTeamType(businessType);
    setShowCreateTeamModal(true);
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsCreatingTeam(true);
    try {
      const res = await fetch("/api/v1/dashboard/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          type: teamType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateTeamModal(false);
        setTeamName("");
        setTeamDescription("");
        setTeamType(businessType);
        await loadTeam();
        toast.success(`Team "${data.team?.name || "team"}" created.`);
      } else {
        toast.error(data?.error?.message || "Failed to create team");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create team");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const copyInviteToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Invitation token copied.");
    } catch {
      toast.error("Could not copy token. Copy it manually.");
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!window.confirm("Remove this member from the business?")) return;
    try {
      const res = await fetch(`/api/v1/dashboard/team?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTeamList((prev) => prev.filter((m) => m.id !== id));
        toast.success("Team member access revoked");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message || "Failed to remove member");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/dashboard/team/${editingMember.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: editRole }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTeamList((prev) =>
          prev.map((m) =>
            m.id === editingMember.id
              ? {
                  ...m,
                  role: data.member.role,
                  title: `${data.member.role.charAt(0).toUpperCase() + data.member.role.slice(1)} Member`,
                }
              : m
          )
        );
        setShowEditModal(false);
        setEditingMember(null);
        toast.success("Member role updated.");
      } else {
        const err = await res.json();
        toast.error(err.error?.message || "Failed to update member role.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update member role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/dashboard/invitations/${invitationId}`,
        { method: "GET" }
      );
      if (res.ok) {
        const data = await res.json();
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId
              ? { ...inv, status: "pending", expiresAt: data.invitation?.expiresAt ?? data.expiresAt }
              : inv
          )
        );
        if (data.token) {
          setInviteResult({
            email: data.invitation?.email || "invitee",
            token: data.token,
          });
          setInviteError(null);
          setShowInviteModal(true);
        }
        toast.success("Invitation resent. New token generated.");
      } else {
        const err = await res.json();
        toast.error(err.error?.message || "Failed to resend invitation.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!window.confirm("Revoke this invitation?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/dashboard/invitations/${invitationId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitationId)
        );
        toast.success("Invitation revoked.");
      } else {
        const err = await res.json();
        toast.error(err.error?.message || "Failed to revoke invitation.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = (email: string) => {
    setResendSuccess(email);
    toast.info(`Invitation re-sent to ${email}`);
    setTimeout(() => setResendSuccess(null), 2500);
  };

  const handleExportCSV = () => {
    if (filteredTeam.length === 0) {
      toast.info("No team members to export.");
      return;
    }
    const headers = ["Name", "Email", "Role", "Last Active", "Status"];
    const rows = filteredTeam.map((m) => [
      `"${m.name || "Member"}"`,
      `"${m.email}"`,
      `"${m.role}"`,
      `"${m.lastActive || "Recently"}"`,
      `"${m.status || "Active"}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `team_members_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Team roster exported as CSV!");
  };

  const filteredTeam = teamList.filter((member) => {
    const matchesSearch =
      (member.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      (member.role || "").toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (member.status || "").toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeStaffCount = teamList.filter((m) => m.status === "Active" || !m.status).length;
  const pendingCount = invitations.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6 pb-16 max-w-[1400px] mx-auto animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">Team</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Team Members &amp; Permissions
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              {workspaceName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage who can access your NESale workspace and configure granular permissions.
          </p>
        </div>

        {/* Workspace Seats progress + Invite button */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl px-3.5 py-2 shadow-2xs text-xs space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Workspace Seats <strong className="text-slate-900 dark:text-white">{teamList.length} / 10 used</strong>
              </span>
              <Link
                href="/dashboard/billing"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold"
              >
                Upgrade
              </Link>
            </div>
            <div className="w-36 h-1.5 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (teamList.length / 10) * 100)}%` }}
              ></div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateTeamModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>+ New team</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInviteResult(null);
              setInviteError(null);
              setShowInviteModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite member</span>
          </button>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <span>Join team</span>
          </button>
        </div>
      </div>

      {/* Top 4 Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              ACTIVE STAFF
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
              {activeStaffCount}
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
              <span>📈 100% security 2FA active</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              PENDING INVITES
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
              {pendingCount}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {pendingCount > 0 ? "Pending email confirmation" : "Zero pending invitations"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              AI INTERVENTIONS
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">342</div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              ⚡ Past 7 days
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              AUDIT STATE
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white mt-1">SOC-2 Type II</div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Shopify Plus Certified</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Teams
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Group members and scope their access per team.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
            <button
              type="button"
              onClick={openCreateTeamModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition cursor-pointer min-h-[36px]"
            >
              <UserPlus className="w-3 h-3" />
              <span>New team</span>
            </button>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/[0.1] rounded-2xl">
            No teams yet. Create your first team to group members and scope access.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-100 dark:border-white/[0.08] bg-slate-50/40 dark:bg-[#171b26] p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {t.name}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shrink-0">
                    {String(t.type || "custom").toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[16px]">
                  {t.description || "No description"}
                </p>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                  <span>{t.memberCount ?? 0} members</span>
                  <span>{t.permissionCount ?? 0} permissions</span>
                  <span>{t.websiteCount ?? 0} websites</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search, Filters & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members by name or email..."
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] text-slate-700 dark:text-slate-300 focus:outline-none min-h-[44px]"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] text-slate-700 dark:text-slate-300 focus:outline-none min-h-[44px]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold text-[11px] bg-slate-50/40 dark:bg-[#171b26]">
                <th className="py-3.5 px-5 font-semibold">MEMBER</th>
                <th className="py-3.5 px-5 font-semibold">EMAIL</th>
                <th className="py-3.5 px-5 font-semibold">ROLE</th>
                <th className="py-3.5 px-5 font-semibold">LAST ACTIVE</th>
                <th className="py-3.5 px-5 font-semibold">STATUS</th>
                <th className="py-3.5 px-5 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading team members...</span>
                  </td>
                </tr>
              ) : filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching team members found.
                  </td>
                </tr>
              ) : (
                filteredTeam.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                    {/* Member */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        {m.image ? (
                          <img
                            src={m.image}
                            alt={m.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/[0.1] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {m.avatar || (m.name ? m.name.substring(0, 2).toUpperCase() : "TM")}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{m.name || "Colleague"}</span>
                            {m.isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {m.title || `${m.role} Member`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-5 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {m.email}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40">
                        {m.role}
                      </span>
                    </td>

                    {/* Last active */}
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">
                      {m.lastActive || "Active recently"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        ● {m.status || "Active"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === "Pending" && (
                          <>
                            {/* Find matching invitation for resend */}
                            {invitations.some(
                              (inv) => inv.email === m.email && inv.status === "pending"
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const inv = invitations.find(
                                    (i) => i.email === m.email && i.status === "pending"
                                  );
                                  if (inv) handleResendInvitation(inv.id);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold hover:bg-amber-100 transition"
                              >
                                <Send className="w-3 h-3" />
                                <span>Resend</span>
                              </button>
                            )}
                            {invitations.some(
                              (inv) => inv.email === m.email && inv.status === "pending"
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const inv = invitations.find(
                                    (i) => i.email === m.email && i.status === "pending"
                                  );
                                  if (inv) handleRevokeInvitation(inv.id);
                                }}
                                className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Revoke invitation"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                        {!m.isCurrentUser && m.role.toLowerCase() !== "owner" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMember(m);
                                setEditRole(m.role);
                                setShowEditModal(true);
                              }}
                              title="Edit member role"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            {!m.status || m.status === "Active" ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                title="Remove member"
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filteredTeam.length} team members</span>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pending Invitations
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Invitations awaiting acceptance.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
              {invitations.filter((i) => i.status === "pending").length} pending
            </span>
          </div>

          <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold text-[11px] bg-slate-50/40 dark:bg-[#171b26]">
                  <th className="py-3.5 px-5 font-semibold">Email</th>
                  <th className="py-3.5 px-5 font-semibold">Role</th>
                  <th className="py-3.5 px-5 font-semibold">Team</th>
                  <th className="py-3.5 px-5 font-semibold">Expires</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                    <td className="py-3.5 px-5 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {inv.email}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        inv.role === "team_admin"
                          ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40"
                          : inv.role === "team_manager"
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40"
                          : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40"
                      }`}>
                        {inv.role.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 text-[11px]">
                      {inv.team?.name || "Business-wide"}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 text-[11px]">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.id)}
                          className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Resend invitation"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Revoke invitation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles & Permissions Matrix */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Roles &amp; permissions matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clear operational boundaries designed for commerce operators, merchandisers, and customer support leads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Manage AI */}
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Manage AI</span>
                </div>
                <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800/40">
                  Critical
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Configure model behavior, prompt tuning, semantic grounding, and knowledge catalog embeddings.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 uppercase">
                AUTHORIZED ROLES
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                  Owner
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  Admin
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: View analytics */}
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>View analytics</span>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  Reporting
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Access revenue intelligence, conversion attribution, AI-assisted GMV, and customer intent telemetry.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 uppercase">
                AUTHORIZED ROLES
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                  Owner
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  Admin
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                  Analyst
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Manage billing */}
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Manage billing</span>
                </div>
                <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800/40">
                  Restricted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Upgrade subscription tiers, configure Shopify billing sync, view invoices, and manage payment methods.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5 uppercase">
                AUTHORIZED ROLES
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                  Owner
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Security Callout Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">
                Enterprise Security &amp; Custom Governance
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Need enterprise custom role definitions or SSO/SAML integration? Contact your NESale account lead.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.info("Enterprise sales engineering team notified. We will reach out shortly.")}
            className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition cursor-pointer shrink-0 min-h-[44px]"
          >
            <span>Contact Sales lead</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteSubmit}
            className="bg-white dark:bg-[#11141d] rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Invite Team Member
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteResult(null);
                  setInviteError(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {inviteError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="font-semibold">{inviteError}</span>
                </div>
              )}

              {inviteResult && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="font-semibold">
                      Invitation created for {inviteResult.email}
                      {inviteResult.teamName ? ` → ${inviteResult.teamName}` : ""}
                    </span>
                  </div>
<p className="text-[10px] text-emerald-800/80 dark:text-emerald-200/80">
                      Email delivery is not configured. Share this token with the invitee:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-[#0c0e15] border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-mono text-slate-700 dark:text-slate-200 truncate">
                        {inviteResult.token || "—"}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyInviteToken(inviteResult.token)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer min-h-[32px] shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 mt-2">
                      Invitation link: <a href={inviteResult.inviteLink} target="_blank" rel="noopener" className="underline text-emerald-600 dark:text-emerald-400">
                        /invite/accept?token={inviteResult.token}
                      </a>
(opens in a new tab)
                  </p>
                  </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Lee"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@yourstore.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Team Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
                >
                  <option value="team_member">Team Member — View access</option>
                  <option value="team_manager">Team Manager — Create & edit</option>
                  <option value="team_admin">Team Admin — Full team control</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Team (Optional)
                </label>
                <select
                  value={inviteTeamId || ""}
                  onChange={(e) =>
                    setInviteTeamId(e.target.value || undefined)
                  }
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
                >
                  <option value="">Business-wide (no team)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
                {teams.length === 0 && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    No teams yet.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteModal(false);
                        openCreateTeamModal();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-bold cursor-pointer"
                    >
                      Create a team
                    </button>{" "}
                    first to scope this invite.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-75 cursor-pointer shadow-sm active:scale-[0.99] flex items-center gap-1.5 min-h-[44px]"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? "Inviting..." : "Send Invite"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white dark:bg-[#11141d] rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Member Role
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Member
                </label>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-[#0c0e15]">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {editingMember.name?.substring(0, 2).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {editingMember.name || "Unknown User"}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {editingMember.email}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
                >
                  <option value="member">Member — View access</option>
                  <option value="admin">Admin — Full business control</option>
                  <option value="owner">Owner — Business owner</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Changing role affects business-level access.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-75 cursor-pointer shadow-sm active:scale-[0.99] flex items-center gap-1.5 min-h-[44px]"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTeamSubmit}
            className="bg-white dark:bg-[#11141d] rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Create New Team
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What does this team handle?"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Team Type
                </label>
                <select
                  value={teamType}
                  onChange={(e) => setTeamType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-none min-h-[44px]"
                >
                  <option value="ecommerce">E-commerce</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingTeam || !teamName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-75 cursor-pointer shadow-sm active:scale-[0.99] flex items-center gap-1.5 min-h-[44px]"
              >
                {isCreatingTeam && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{isCreatingTeam ? "Creating..." : "Create Team"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
