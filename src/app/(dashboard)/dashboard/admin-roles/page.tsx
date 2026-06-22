"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RequirePermission } from "@/components/layout/RequirePermission";
import {
  Shield,
  Users,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type PermissionCategory = "Users" | "KYC" | "Finance" | "System" | "Reports" | "Support";

type Permission = {
  id: string;
  name: string;
  category: PermissionCategory;
};

type Role = {
  id: string;
  code: string;
  name: string;
  description: string;
  adminCount: number;
  isActive: boolean;
  permissions: string[]; // Permission IDs
};

// Static Permissions List (14 items matching mock)
const ALL_PERMISSIONS: Permission[] = [
  // Users
  { id: "view-users", name: "View Users", category: "Users" },
  { id: "edit-users", name: "Edit Users", category: "Users" },
  { id: "delete-users", name: "Delete Users", category: "Users" },
  // KYC
  { id: "review-kyc", name: "Review KYC", category: "KYC" },
  { id: "view-docs", name: "View Documents", category: "KYC" },
  // Finance
  { id: "approve-withdrawals", name: "Approve Withdrawals", category: "Finance" },
  { id: "view-transactions", name: "View Transactions", category: "Finance" },
  { id: "manage-wallets", name: "Manage Wallets", category: "Finance" },
  { id: "view-wallets", name: "View Wallets", category: "Finance" },
  // System
  { id: "edit-settings", name: "Edit Settings", category: "System" },
  { id: "manage-roles", name: "Manage Roles", category: "System" },
  // Reports
  { id: "view-reports", name: "View Reports", category: "Reports" },
  // Support
  { id: "respond-chat", name: "Respond to Chat", category: "Support" },
  { id: "manage-tickets", name: "Manage Tickets", category: "Support" },
];

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

export default function AdminRolesPermissionsPage() {
  return (
    <RequirePermission permission="manage-roles">
      <AdminRolesPermissionsPageContent />
    </RequirePermission>
  );
}

function AdminRolesPermissionsPageContent() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isDeleteAdminModalOpen, setIsDeleteAdminModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<any | null>(null);

  // Form states
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  // Add Admin form states
  const [adminFormName, setAdminFormName] = useState("");
  const [adminFormEmail, setAdminFormEmail] = useState("");
  const [adminFormRoleId, setAdminFormRoleId] = useState("");

  // Loading indicator for resending email invites
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Guard against double-submission of Add Admin form
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch data on mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, adminsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/admin-users"),
      ]);
      if (rolesRes.ok && adminsRes.ok) {
        const rolesData = await rolesRes.json();
        const adminsData = await adminsRes.json();
        setRoles(rolesData.roles || []);
        setAdmins(adminsData.admins || []);
      } else {
        showToast("Failed to fetch data from Supabase", "error");
      }
    } catch (err) {
      console.error("Fetch data error:", err);
      showToast("Error loading roles/admins", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Show Toast Helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Find active selected role object
  const activeRole = roles.find((r) => r.id === selectedRoleId) || null;

  // Stats calculation
  const totalRoles = roles.length;
  const totalAdmins = admins.length;
  const activeRolesCount = roles.filter((r) => r.isActive).length;
  const totalPermissionsCount = ALL_PERMISSIONS.length;

  // Modal Open Handlers
  const openCreateModal = () => {
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setFormPermissions([]);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the card
    setTargetRole(role);
    setFormName(role.name);
    setFormDescription(role.description);
    setFormIsActive(role.isActive);
    setFormPermissions([...role.permissions]);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the card
    setTargetRole(role);
    setIsDeleteModalOpen(true);
  };

  // Create Role Submit
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Role name is required", "error");
      return;
    }

    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          isActive: formIsActive,
          permissions: formPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create role");
      }

      setRoles((prev) => [...prev, data.role]);
      setIsCreateModalOpen(false);
      showToast(`Role "${data.role.name}" created successfully`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Edit Role Submit
  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) return;
    if (!formName.trim()) {
      showToast("Role name is required", "error");
      return;
    }

    try {
      const res = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetRole.id,
          name: formName.trim(),
          description: formDescription.trim(),
          isActive: formIsActive,
          permissions: formPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setRoles((current) =>
        current.map((r) => (r.id === targetRole.id ? { ...r, ...data.role } : r))
      );
      setIsEditModalOpen(false);
      showToast(`Role "${formName}" updated successfully`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Delete Role Confirm
  const handleDeleteConfirm = async () => {
    if (!targetRole) return;

    try {
      const res = await fetch(`/api/roles?id=${targetRole.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete role");
      }

      setRoles((current) => current.filter((r) => r.id !== targetRole.id));
      if (selectedRoleId === targetRole.id) {
        setSelectedRoleId(null);
      }
      setIsDeleteModalOpen(false);
      showToast(`Role "${targetRole.name}" deleted successfully`);
      setTargetRole(null);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Toggle permission in form checklist selection
  const togglePermissionCheckbox = (id: string) => {
    setFormPermissions((current) =>
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id]
    );
  };

  // Add Admin Submit
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-click
    if (!adminFormName.trim() || !adminFormEmail.trim() || !adminFormRoleId) {
      showToast("All fields are required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: adminFormName.trim(),
          email: adminFormEmail.trim(),
          roleId: adminFormRoleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      setAdmins((prev) => [data.admin, ...prev]);

      // Update the admin count in roles dynamically
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (role.id === adminFormRoleId) {
            return { ...role, adminCount: role.adminCount + 1 };
          }
          return role;
        })
      );

      setIsAddAdminModalOpen(false);

      if (data.warning) {
        showToast(data.warning, "error");
      } else {
        showToast(`Admin "${data.admin.fullName}" created successfully. Setup email sent.`);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Admin Active Status
  const handleToggleAdminStatus = async (admin: any) => {
    const nextStatus = !admin.isActive;
    try {
      const res = await fetch("/api/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          isActive: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, isActive: data.admin.isActive } : a))
      );
      showToast(`Status updated for "${admin.fullName}"`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Resend Invite Email Link
  const handleResendInvite = async (admin: any) => {
    setResendingId(admin.id);
    try {
      const res = await fetch("/api/admin-users/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: admin.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend invite");
      }

      showToast(`Setup verification email resent to ${admin.email}`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setResendingId(null);
    }
  };

  // Delete Admin Confirm
  const handleDeleteAdminConfirm = async () => {
    if (!adminToDelete) return;

    try {
      const res = await fetch(`/api/admin-users?id=${adminToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete admin");
      }

      setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));

      // Update the admin count in roles dynamically
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (role.id === adminToDelete.roleId) {
            return { ...role, adminCount: Math.max(0, role.adminCount - 1) };
          }
          return role;
        })
      );

      setIsDeleteAdminModalOpen(false);
      showToast(`Admin "${adminToDelete.fullName}" deleted successfully`);
      setAdminToDelete(null);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold bg-white border-gray-200 text-gray-800"
          >
            <span className={cn("h-2 w-2 rounded-full", toast.type === "success" ? "bg-green-500" : "bg-red-500")} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Admin Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-600">Manage administrator roles and access permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAdminFormName("");
              setAdminFormEmail("");
              const activeRoles = roles.filter((r) => r.isActive);
              setAdminFormRoleId(activeRoles[0]?.id || "");
              setIsAddAdminModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Users className="h-4 w-4 text-gray-600" />
            Add Admin
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:opacity-90 cursor-pointer"
            style={{ background: BRAND_GRADIENT }}
          >
            <Plus className="h-4 w-4" />
            Create Role
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse h-24" />
          ))
        ) : (
          <>
            {/* Total Roles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Roles</p>
                <p className="text-3xl font-black text-gray-900 mt-1.5">{totalRoles}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 border border-blue-100">
                <Shield className="h-6 w-6 stroke-[1.8]" />
              </div>
            </div>

            {/* Total Admins */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Admins</p>
                <p className="text-3xl font-black text-gray-900 mt-1.5">{totalAdmins}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-50/50 flex items-center justify-center text-green-600 border border-green-100">
                <Users className="h-6 w-6 stroke-[1.8]" />
              </div>
            </div>

            {/* Active Roles */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Active Roles</p>
                <p className="text-3xl font-black text-gray-900 mt-1.5">{activeRolesCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-50/50 flex items-center justify-center text-purple-600 border border-purple-100">
                <CheckCircle2 className="h-6 w-6 stroke-[1.8]" />
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Permissions</p>
                <p className="text-3xl font-black text-gray-900 mt-1.5">{totalPermissionsCount}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-orange-50/50 flex items-center justify-center text-orange-600 border border-orange-100">
                <Shield className="h-6 w-6 stroke-[1.8]" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main split-pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left pane: Roles cards */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider pl-1">Roles</h3>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 h-36 animate-pulse" />
            ))
          ) : roles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-600 text-xs font-semibold">
              No roles configured in database.
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "p-5 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col gap-4 relative",
                      isSelected
                        ? "border-blue-500 shadow-md ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 text-sm leading-none">{role.name}</span>
                            <span
                              className={cn(
                                "text-[9px] border font-bold uppercase px-1.5 py-0.5 rounded",
                                role.isActive
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              )}
                            >
                              {role.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-600 font-mono mt-1 block font-bold">{role.code}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                      {role.description}
                    </p>

                    {/* Meta info */}
                    <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-50">
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-600" />
                          {role.adminCount} admins
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-gray-600" />
                          {role.permissions.length} permissions
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => openEditModal(role, e)}
                          className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                          title="Edit Role"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(role, e)}
                          className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                          title="Delete Role"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Permissions matrix list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
              {activeRole ? `${activeRole.name} Permissions` : "Permissions Details"}
            </h3>
            {activeRole && (
              <span
                className={cn(
                  "text-[10px] border font-bold uppercase px-2 py-0.5 rounded-full font-mono",
                  activeRole.isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                )}
              >
                {activeRole.isActive ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-10 bg-gray-50 rounded" />
                      <div className="h-10 bg-gray-50 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activeRole ? (
              // Empty selection placeholder matching Screenshot 3
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 mb-4 animate-bounce">
                  <Shield className="h-7 w-7 stroke-[1.5]" />
                </div>
                <h4 className="font-extrabold text-gray-800 text-sm">Select a role to view its permissions</h4>
                <p className="text-xs text-gray-600 max-w-[280px] mt-1.5 leading-relaxed font-semibold">
                  Choose a user access role from the left pane list to inspect or adjust its system privileges.
                </p>
              </div>
            ) : (
              // Permissions grid listing matching Screenshot 1
              <div className="space-y-6">
                {(["Users", "KYC", "Finance", "System", "Reports", "Support"] as PermissionCategory[]).map((cat) => {
                  const catPermissions = ALL_PERMISSIONS.filter((p) => p.category === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1 font-mono">
                        {cat}
                      </h4>
                      <div className="space-y-2">
                        {catPermissions.map((permission) => {
                          const isAllowed = activeRole.permissions.includes(permission.id);
                          return (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl"
                            >
                              <span className="text-xs font-bold text-gray-700">{permission.name}</span>
                              {isAllowed ? (
                                <div className="h-5 w-5 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-200">
                                  <Check className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-300">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Users list section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">Administrator Users</h3>
            <p className="text-xs text-gray-600 mt-0.5">List of authorized administrators and their roles</p>
          </div>
          <span className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full font-mono">
            {admins.length} Admins
          </span>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-50 rounded" />
            <div className="h-10 bg-gray-50 rounded" />
            <div className="h-10 bg-gray-50 rounded" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-xs font-semibold">
            No administrator users found. Click "Add Admin" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Admin Name</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Email Address</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Joined Date</th>
                  <th className="pb-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                          {admin.fullName
                            ? admin.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
                            : admin.email.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{admin.fullName || "Unnamed Admin"}</p>
                          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{admin.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-xs font-semibold text-gray-700">{admin.email}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {admin.roleName}
                      </span>
                    </td>
                    <td className="py-4">
                      {admin.inviteStatus === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleAdminStatus(admin)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors border cursor-pointer",
                            admin.isActive
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          )}
                        >
                          {admin.isActive ? "Active" : "Inactive"}
                        </button>
                      )}
                    </td>
                    <td className="py-4 text-xs text-gray-600 font-medium">
                      {new Date(admin.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {admin.inviteStatus === "pending" && (
                          <button
                            onClick={() => handleResendInvite(admin)}
                            disabled={resendingId === admin.id}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-gray-600 hover:text-amber-600 transition-all cursor-pointer shadow-sm inline-flex items-center justify-center disabled:opacity-40"
                            title="Resend Setup Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAdminToDelete(admin);
                            setIsDeleteAdminModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-650 transition-all cursor-pointer shadow-sm inline-flex items-center justify-center"
                          title="Delete Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-900 text-base">Create New Admin Role</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-gray-600 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Scroll Container */}
              <form onSubmit={handleCreateRoleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
                {/* Role Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Role Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Risk Auditor"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Description</label>
                  <textarea
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Review transactions and auditing security parameters..."
                    className="h-20 w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-extrabold text-gray-800">Role Status Active</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Enable or disable this role group access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Permissions Toggles Checklist */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Assign Permissions</label>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-gray-50/20">
                    {ALL_PERMISSIONS.map((perm) => {
                      const checked = formPermissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermissionCheckbox(perm.id)}
                          className="flex items-center justify-between p-3 text-xs font-semibold hover:bg-gray-50 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-gray-700">{perm.name}</span>
                            <span className="text-[9px] text-gray-600 font-mono mt-0.5 font-bold uppercase">{perm.category}</span>
                          </div>
                          {checked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-gray-300 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 h-10 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    Save Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-900 text-base">Edit Admin Role ({targetRole?.code})</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-gray-600 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Scroll Container */}
              <form onSubmit={handleEditRoleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
                {/* Role Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Role Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Role Name"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Description</label>
                  <textarea
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Description"
                    className="h-20 w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-850 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-extrabold text-gray-800">Role Status Active</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">Enable or disable this role group access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Permissions Checklist */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Assign Permissions</label>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden bg-gray-50/20">
                    {ALL_PERMISSIONS.map((perm) => {
                      const checked = formPermissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermissionCheckbox(perm.id)}
                          className="flex items-center justify-between p-3 text-xs font-semibold hover:bg-gray-50 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-gray-700">{perm.name}</span>
                            <span className="text-[9px] text-gray-600 font-mono mt-0.5 font-bold uppercase">{perm.category}</span>
                          </div>
                          {checked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-gray-300 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 h-10 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    Update Role
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Role Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Delete Role Group?</h3>
                  <p className="text-[11px] text-gray-600 font-bold font-mono mt-0.5">{targetRole?.code}</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                Are you sure you want to delete the <span className="font-black text-gray-800">"{targetRole?.name}"</span> role group? 
                This action is permanent and administrators assigned to this group will lose their dashboard permissions.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4.5 h-10 bg-red-600 rounded-xl text-white text-xs font-bold shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete Role
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {isAddAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="font-extrabold text-gray-900 text-base">Add New Administrator</h3>
                <button
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="p-1 text-gray-600 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddAdminSubmit} className="pt-4 space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminFormName}
                    onChange={(e) => setAdminFormName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={adminFormEmail}
                    onChange={(e) => setAdminFormEmail(e.target.value)}
                    placeholder="e.g. john@cdntb.ca"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                </div>

                {/* Role selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Role</label>
                  <select
                    required
                    value={adminFormRoleId}
                    onChange={(e) => setAdminFormRoleId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                  >
                    <option value="" disabled>Select a role</option>
                    {roles.filter((r) => r.isActive).map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminModalOpen(false)}
                    className="px-4 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "px-4.5 h-10 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2",
                      isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"
                    )}
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Adding...
                      </>
                    ) : (
                      "Add Admin"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Admin Modal */}
      <AnimatePresence>
        {isDeleteAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-950 text-sm">Delete Administrator?</h3>
                  <p className="text-[11px] text-gray-600 font-bold font-mono mt-0.5">{adminToDelete?.id?.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                Are you sure you want to delete administrator <span className="font-black text-gray-800">"{adminToDelete?.fullName || adminToDelete?.email}"</span>? 
                This action will permanently delete their authentication account and database records.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setIsDeleteAdminModalOpen(false);
                    setAdminToDelete(null);
                  }}
                  className="px-4 h-10 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAdminConfirm}
                  className="px-4.5 h-10 bg-red-600 rounded-xl text-white text-xs font-bold shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete Admin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
