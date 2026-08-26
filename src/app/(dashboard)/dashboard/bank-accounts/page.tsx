"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Landmark, 
  CheckCircle2, 
  Clock, 
  Search, 
  Edit3, 
  Loader2,
  RefreshCw
} from "lucide-react";

export type AdminBankAccount = {
  id: string;
  user_id: string;
  account_category: string;
  account_type: string;
  account_name: string;
  account_number: string | null;
  currency: string;
  balance: number;
  status: "pending" | "active" | "rejected" | "closed";
  admin_notes?: string | null;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
};

export default function AdminBankAccountsPage() {
  const [accounts, setAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AdminBankAccount | null>(null);
  
  // Modal states
  const [modalAction, setModalAction] = useState<"approve" | "edit" | "reject" | null>(null);
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [balanceInput, setBalanceInput] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBankAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bank-accounts", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error("Error loading bank accounts:", err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const generateAccountNumber = () => {
    const prefix = "05496";
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
    return `${prefix}-${randomSuffix}`;
  };

  const handleOpenApproveModal = (acc: AdminBankAccount) => {
    setSelectedAccount(acc);
    setAccountNumberInput(acc.account_number || generateAccountNumber());
    setBalanceInput(String(acc.balance || 0));
    setAdminNoteInput("");
    setModalAction("approve");
  };

  const handleOpenEditModal = (acc: AdminBankAccount) => {
    setSelectedAccount(acc);
    setAccountNumberInput(acc.account_number || "");
    setBalanceInput(String(acc.balance || 0));
    setAdminNoteInput(acc.admin_notes || "");
    setModalAction("edit");
  };

  const handleOpenRejectModal = (acc: AdminBankAccount) => {
    setSelectedAccount(acc);
    setAdminNoteInput("");
    setModalAction("reject");
  };

  const handleConfirmAction = async () => {
    if (!selectedAccount || !modalAction) return;
    setSubmitting(true);
    try {
      const payload: any = {
        accountId: selectedAccount.id,
      };

      if (modalAction === "approve") {
        payload.status = "active";
        payload.accountNumber = accountNumberInput || generateAccountNumber();
        payload.balance = Number(balanceInput) || 0;
        payload.adminNotes = adminNoteInput;
      } else if (modalAction === "edit") {
        payload.accountNumber = accountNumberInput;
        payload.balance = Number(balanceInput) || 0;
        payload.adminNotes = adminNoteInput;
      } else if (modalAction === "reject") {
        payload.status = "rejected";
        payload.adminNotes = adminNoteInput;
      }

      const res = await fetch("/api/bank-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update account");
      }

      setModalAction(null);
      setSelectedAccount(null);
      await fetchBankAccounts();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      let matchesTab = true;
      if (activeTab === "pending") matchesTab = acc.status === "pending";
      if (activeTab === "active") matchesTab = acc.status === "active";

      const query = searchQuery.toLowerCase();
      const haystack = `${acc.account_name} ${acc.account_number || ''} ${acc.user_email || ''} ${acc.user_full_name || ''} ${acc.account_type}`.toLowerCase();
      const matchesSearch = haystack.includes(query);

      return matchesTab && matchesSearch;
    });
  }, [accounts, activeTab, searchQuery]);

  const pendingCount = accounts.filter((a) => a.status === "pending").length;
  const activeCount = accounts.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-[#003366]" /> Bank Account Verification & Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">Review client account opening applications, assign official account numbers, and manage balances</p>
        </div>

        <button
          onClick={() => fetchBankAccounts()}
          className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Applications</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{pendingCount}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Active Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{activeCount}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">{accounts.length}</p>
        </div>
      </div>

      {/* Table Workspace */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: "pending", label: `Pending Review (${pendingCount})` },
              { id: "active", label: `Active Accounts (${activeCount})` },
              { id: "all", label: `All Accounts (${accounts.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#003366] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search user, account, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#003366] mb-2" />
              Loading bank accounts...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No bank account applications found matching your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Client</th>
                  <th className="py-3.5 px-6">Account Name & Type</th>
                  <th className="py-3.5 px-6">Account Number</th>
                  <th className="py-3.5 px-6">Balance</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Applied Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{acc.user_full_name}</p>
                      <p className="text-[11px] text-gray-500">{acc.user_email}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{acc.account_name}</p>
                      <span className="text-[10px] text-gray-500 uppercase px-2 py-0.5 bg-gray-100 rounded-md">
                        {acc.account_category} • {acc.account_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-800">
                      {acc.account_number ? acc.account_number : <span className="text-gray-400 italic">Pending Assignment</span>}
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900">
                      ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {acc.currency}
                    </td>
                    <td className="py-4 px-6">
                      {acc.status === "pending" && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full border border-amber-200 text-[10px]">
                          Pending Review
                        </span>
                      )}
                      {acc.status === "active" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200 text-[10px]">
                          Active
                        </span>
                      )}
                      {acc.status === "rejected" && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 font-semibold rounded-full border border-red-200 text-[10px]">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {new Date(acc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {acc.status === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenApproveModal(acc)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(acc)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {acc.status === "active" && (
                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Balance
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {modalAction && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-900 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 capitalize">
              {modalAction === "approve" ? "Approve Bank Account Application" : modalAction === "edit" ? "Edit Bank Account Balance" : "Reject Application"}
            </h3>
            
            <p className="text-xs text-gray-600">
              User: <span className="font-semibold text-gray-900">{selectedAccount.user_email}</span> <br />
              Account: <span className="font-semibold text-gray-900">{selectedAccount.account_name} ({selectedAccount.currency})</span>
            </p>

            {modalAction !== "reject" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Account Number (RBC Format)</label>
                  <input
                    type="text"
                    value={accountNumberInput}
                    onChange={(e) => setAccountNumberInput(e.target.value)}
                    placeholder="05496-1007517"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Assigned Balance ({selectedAccount.currency})</label>
                  <input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">Admin Notes / Remarks</label>
              <textarea
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting}
                className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow transition-colors ${
                  modalAction === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-[#003366] hover:bg-blue-900"
                }`}
              >
                {submitting ? "Processing..." : modalAction === "approve" ? "Approve & Activate" : modalAction === "edit" ? "Save Changes" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
