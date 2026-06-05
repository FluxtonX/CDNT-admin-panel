"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USERS_DATA, type AdminUser, type RiskLevel } from "@/lib/data/users";

type ReviewStatus = "Pending" | "Under Review" | "Approved" | "Rejected";
type TabValue = "all" | ReviewStatus;

type KycRequest = {
  requestId: string;
  user: AdminUser;
  documentType: "Driver's License" | "Passport" | "National ID" | "Proof of Address";
  documents: Array<"verified" | "missing" | "flagged">;
  status: ReviewStatus;
  submitted: string;
};

const BRAND_GRADIENT = "linear-gradient(135deg, #0A3D91 0%, #1650AB 100%)";

const INITIAL_REQUESTS: KycRequest[] = USERS_DATA.filter((user) => user.kyc !== "Not Started")
  .slice(0, 14)
  .map((user, index) => {
    const status: ReviewStatus =
      user.kyc === "Verified" ? "Approved" :
      user.kyc === "Rejected" ? "Rejected" :
      index % 3 === 0 ? "Under Review" : "Pending";

    return {
      requestId: `KYC-2024-${543 - index}`,
      user,
      documentType: index % 4 === 0 ? "Driver's License" : index % 4 === 1 ? "Passport" : index % 4 === 2 ? "National ID" : "Proof of Address",
      documents: user.risk === "High Risk" ? ["verified", "verified", "flagged"] : ["verified", "verified", status === "Rejected" ? "flagged" : "verified"],
      status,
      submitted: index < 3 ? "Today" : index < 7 ? "Yesterday" : user.joinedDate,
    };
  });

const TABS: Array<{ label: string; value: TabValue }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Under Review", value: "Under Review" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

function StatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { cls: string; icon: React.ReactNode }> = {
    Pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
    "Under Review": { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Eye className="h-3.5 w-3.5" /> },
    Approved: { cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    Rejected: { cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const style = map[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", style.cls)}>
      {style.icon}
      {status}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    "Low Risk": "bg-green-50 text-green-700 border-green-200",
    "Medium Risk": "bg-amber-50 text-amber-700 border-amber-200",
    "High Risk": "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", map[level])}>
      {level === "High Risk" && <AlertTriangle className="h-3.5 w-3.5" />}
      {level}
    </span>
  );
}

function DocumentDots({ docs }: { docs: KycRequest["documents"] }) {
  return (
    <div className="flex items-center gap-2">
      {docs.map((doc, index) => {
        const cls =
          doc === "verified" ? "text-green-600" :
          doc === "flagged" ? "text-red-600" : "text-gray-300";
        return doc === "flagged" ? (
          <XCircle key={index} className={cn("h-4 w-4", cls)} />
        ) : (
          <CheckCircle2 key={index} className={cn("h-4 w-4", cls)} />
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="flex min-h-[134px] items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-none text-gray-900">{value}</p>
        <p className={cn("mt-4 text-sm font-medium", tone)}>{note}</p>
      </div>
      {icon}
    </div>
  );
}

export default function KycVerificationPage() {
  const router = useRouter();
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      Pending: requests.filter((r) => r.status === "Pending").length,
      "Under Review": requests.filter((r) => r.status === "Under Review").length,
      Approved: requests.filter((r) => r.status === "Approved").length,
      Rejected: requests.filter((r) => r.status === "Rejected").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesTab = activeTab === "all" || request.status === activeTab;
      const matchesSearch =
        !query ||
        request.requestId.toLowerCase().includes(query) ||
        request.user.id.toLowerCase().includes(query) ||
        request.user.name.toLowerCase().includes(query) ||
        request.user.email.toLowerCase().includes(query) ||
        request.documentType.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, requests, search]);

  const setRequestStatus = (requestId: string, status: ReviewStatus) => {
    setRequests((current) => current.map((request) => request.requestId === requestId ? { ...request, status } : request));
    setOpenMenuId(null);
    setToast(`Request ${requestId} marked ${status}.`);
    window.setTimeout(() => setToast(null), 2600);
  };

  const stats = [
    {
      label: "Pending Review",
      value: counts.Pending,
      note: "Requires attention",
      tone: "text-amber-600",
      icon: <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Clock className="h-6 w-6" /></div>,
    },
    {
      label: "Under Review",
      value: counts["Under Review"],
      note: "In progress",
      tone: "text-gray-500",
      icon: <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Eye className="h-6 w-6" /></div>,
    },
    {
      label: "Approved Today",
      value: requests.filter((r) => r.status === "Approved" && r.submitted === "Today").length,
      note: "+8 from yesterday",
      tone: "text-green-600",
      icon: <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600"><CheckCircle2 className="h-6 w-6" /></div>,
    },
    {
      label: "High Risk",
      value: requests.filter((r) => r.user.risk === "High Risk").length,
      note: "Review carefully",
      tone: "text-red-600",
      icon: <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="h-6 w-6" /></div>,
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-gray-900 sm:text-[30px]">KYC Verification Center</h1>
            <p className="mt-1 text-sm text-gray-500 sm:text-base">Review and approve user identity verification documents</p>
          </div>
          <button
            onClick={() => setToast("KYC report export prepared.")}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, request ID, or document..."
                className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-11 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 sm:text-base"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto border-b border-gray-200 px-4">
            {TABS.map((tab) => {
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "relative flex h-14 shrink-0 items-center gap-2 px-2 text-sm font-semibold transition-colors sm:px-4",
                    active ? "text-blue-700" : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  {tab.label}
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500")}>
                    {counts[tab.value]}
                  </span>
                  {active && <motion.span layoutId="kyc-tab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-blue-700" />}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <div className="grid min-w-[1050px] grid-cols-[1.3fr_1.8fr_1.4fr_1fr_1.2fr_1fr_112px] gap-4 bg-gray-50 px-5 py-3">
              {["REQUEST", "USER", "DOCUMENT TYPE", "DOCUMENTS", "STATUS", "RISK", "ACTIONS"].map((heading) => (
                <span key={heading} className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{heading}</span>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {filteredRequests.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-w-[1050px] py-16 text-center text-sm font-medium text-gray-400"
                >
                  No KYC requests found.
                </motion.div>
              ) : (
                <motion.div key={`${activeTab}-${search}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {filteredRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="grid min-w-[1050px] grid-cols-[1.3fr_1.8fr_1.4fr_1fr_1.2fr_1fr_112px] items-center gap-4 border-t border-gray-100 px-5 py-4 transition-colors hover:bg-blue-50/30"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{request.requestId}</p>
                        <p className="text-sm text-gray-500">{request.user.id}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{request.user.name}</p>
                        <p className="truncate text-sm text-gray-500">{request.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {request.documentType}
                      </div>
                      <DocumentDots docs={request.documents} />
                      <StatusBadge status={request.status} />
                      <RiskBadge level={request.user.risk} />
                      <div className="relative flex justify-end gap-1.5">
                        <button
                          onClick={() => router.push(`/dashboard/users/${request.user.id}`)}
                          title="View overview"
                          aria-label={`View ${request.user.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setOpenMenuId((current) => current === request.requestId ? null : request.requestId)}
                          title="KYC actions"
                          aria-label={`Open KYC actions for ${request.user.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {openMenuId === request.requestId && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.97 }}
                              className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                            >
                              <button onClick={() => setRequestStatus(request.requestId, "Under Review")} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                Start Review
                              </button>
                              <button onClick={() => setRequestStatus(request.requestId, "Approved")} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-green-700 hover:bg-green-50">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button onClick={() => setRequestStatus(request.requestId, "Rejected")} className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50">
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <strong className="text-gray-700">{filteredRequests.length}</strong> of <strong className="text-gray-700">{requests.length}</strong> verification requests
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              CDNT secure review queue
            </div>
          </div>
        </section>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
          >
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
