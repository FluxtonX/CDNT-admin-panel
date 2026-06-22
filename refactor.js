const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', 'utf-8');

// 1. Remove Static Imports and constants
content = content.replace(/import { USERS_DATA,[^}]* } from "@\/lib\/data\/users";/, `import { type KycStatus, type AccountStatus, type RiskLevel } from "@/lib/data/users";`);
content = content.replace(/\/\* ─── Static tab data ───[\s\S]*?\/\* ─── Freeze Account Modal ───/g, '/* ─── Freeze Account Modal ───');

// 2. OverviewTab
content = content.replace(/function OverviewTab\(\{ user \}: \{ user: NonNullable<ReturnType<typeof USERS_DATA\.find>> \}\) \{/, 'function OverviewTab({ user }: { user: any }) {');
content = content.replace(/<InfoField icon={User}     label="Full Name"     value={user.name} \/>/, '<InfoField icon={User}     label="Full Name"     value={user.name || "N/A"} />');
content = content.replace(/<InfoField icon={Calendar} label="Date of Birth" value={user.dateOfBirth} \/>/, '<InfoField icon={Calendar} label="Date of Birth" value={user.dateOfBirth || "N/A"} />');
content = content.replace(/<InfoField icon={Mail}     label="Email Address" value={user.email} \/>/, '<InfoField icon={Mail}     label="Email Address" value={user.email || "N/A"} />');
content = content.replace(/<InfoField icon={Phone}    label="Phone Number"  value={user.phone} \/>/, '<InfoField icon={Phone}    label="Phone Number"  value={user.phone || "N/A"} />');
content = content.replace(/<InfoField icon={MapPin} label="Street Address" value={user.street} \/>/, '<InfoField icon={MapPin} label="Street Address" value={user.street || "N/A"} />');
content = content.replace(/<InfoField icon={MapPin} label="City"           value={user.city} \/>/, '<InfoField icon={MapPin} label="City"           value={user.city || "N/A"} />');
content = content.replace(/<InfoField icon={MapPin} label="Postal Code"    value={user.postalCode} \/>/, '<InfoField icon={MapPin} label="Postal Code"    value={user.postalCode || "N/A"} />');
content = content.replace(/<InfoField icon={Globe}  label="Country"        value={user.country} \/>/, '<InfoField icon={Globe}  label="Country"        value={user.country || "N/A"} />');
content = content.replace(/<InfoField icon={Calendar}   label="Member Since"               value={user.joinedDate} \/>/, '<InfoField icon={Calendar}   label="Member Since"               value={user.joinedDate || "N/A"} />');
content = content.replace(/<InfoField icon={Activity}   label="Last Login"                 value={user.lastLogin} \/>/, '<InfoField icon={Activity}   label="Last Login"                 value={user.lastLogin || "N/A"} />');
content = content.replace(/<InfoField icon={Smartphone} label="Two-Factor Authentication"  value={user.twoFactor \? "Enabled" : "Disabled"} \/>/, '<InfoField icon={Smartphone} label="Two-Factor Authentication"  value={user.twoFactor ? "Enabled" : "Disabled"} />');
content = content.replace(/<InfoField icon={Globe}      label="Last IP Address"            value={user.lastIp} \/>/, '<InfoField icon={Globe}      label="Last IP Address"            value={user.lastIp || "N/A"} />');

// 3. SecurityTab
content = content.replace(/function SecurityTab\(\) \{/, 'function SecurityTab({ user }: { user: any }) {');
content = content.replace(/const \[sessions, setSessions\] = useState\(SESSIONS\);/, 'const [sessions, setSessions] = useState(user.sessions || []);\n  // TODO: connect to real sessions if table exists');
content = content.replace(/<h3 className="text-base font-bold text-gray-900 mb-4">Active Sessions<\/h3>/, `<h3 className="text-base font-bold text-gray-900 mb-4">Active Sessions</h3>\n        {(!user.sessions || user.sessions.length === 0) && (\n          <p className="text-sm text-gray-600 mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">Sessions will appear here once the user_sessions table tracks active logins.</p>\n        )}`);
content = content.replace(/const handleAction = async \(key: string\) => \{[\s\S]*?\};/, `const handleAction = async (key: string) => {
    setActionLoading(key);
    try {
      const actionMap: Record<string, string> = { "2fa": "reset-2fa", "password": "force-password-reset" };
      await fetch(\`/api/users/\${user.id}/security\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[key] })
      });
      setActionDone(key);
    } catch(e) {
      console.error(e);
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionDone(null), 3000);
    }
  };`);

// 4. TransactionsTab
content = content.replace(/function TransactionsTab\(\) \{/, 'function TransactionsTab({ user }: { user: any }) {');
content = content.replace(/\{TRANSACTIONS\.map\(\(tx, i\) => \(/, `{(!user.transactions || user.transactions.length === 0) ? (<p className="text-sm text-gray-500 py-4 text-center">No transactions found.</p>) : user.transactions.map((tx: any, i: number) => (`);
content = content.replace(/\{tx\.type\}/g, '{tx.type || "Transfer"}');
content = content.replace(/\{tx\.status\}/g, '{tx.status || "completed"}');
content = content.replace(/\{tx\.id\} • \{tx\.date\}/g, '{tx.id || tx.transaction_id || "TXN"} • {new Date(tx.created_at).toLocaleString()}');
content = content.replace(/\{tx\.meta\}/g, '{tx.metadata || ""}');
content = content.replace(/\{tx\.amount\}/g, '{tx.amount} {tx.currency}');
content = content.replace(/<p className="text-xs text-gray-600 mt-0\.5">\{tx\.usd\}<\/p>/, '<p className="text-xs text-gray-600 mt-0.5">{(Number(tx.amount || 0) * 1.36).toLocaleString("en-US", {style:"currency",currency:"CAD"})}</p>');


// 5. SupportTab
content = content.replace(/function SupportTab\(\) \{/, 'function SupportTab({ user }: { user: any }) {');
content = content.replace(/\{TICKETS\.map\(\(ticket, i\) => \(/, `{(!user.tickets || user.tickets.length === 0) ? (<p className="text-sm text-gray-500 py-4 text-center">No support tickets found.</p>) : user.tickets.map((ticket: any, i: number) => (`);
content = content.replace(/\{ticket\.subject\}/g, '{ticket.subject || "Support Request"}');
content = content.replace(/\{ticket\.status\}/g, '{ticket.status || "open"}');
content = content.replace(/\{ticket\.priority\}/g, '{ticket.priority || "medium priority"}');
content = content.replace(/\{ticket\.id\} • Created \{ticket\.created\}/g, '{ticket.id} • Created {new Date(ticket.created_at).toLocaleString()}');
content = content.replace(/Last updated \{ticket\.updated\}/g, 'Last updated {new Date(ticket.updated_at || ticket.created_at).toLocaleString()}');


// 6. DocumentsTab
content = content.replace(/function DocumentsTab\(\) \{/, 'function DocumentsTab({ user }: { user: any }) {');
content = content.replace(/const \[docs, setDocs\] = useState\(\[[\s\S]*?\]\);/, 'const [docs, setDocs] = useState(user.documents || []);');
content = content.replace(/doc\.type/g, 'doc.document_type || "Verification Document"');
content = content.replace(/doc\.name/g, 'doc.file_url ? doc.file_url.split("/").pop() : "document.pdf"');
content = content.replace(/doc\.date/g, 'new Date(doc.created_at).toLocaleDateString()');
content = content.replace(/doc\.status/g, '(doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : "Pending")');
content = content.replace(/setDocs\(\(prev\) => prev\.map\(\(d\) => d\.id === selectedDoc\.id \? \{ \.\.\.d, status: "Rejected" \} : d\)\);/g, `
                    fetch("/api/kyc", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, status: "rejected", rejectionReason: "Rejected by admin" }) });
                    setDocs((prev:any) => prev.map((d:any) => d.id === selectedDoc.id ? { ...d, status: "rejected" } : d));
`);
content = content.replace(/setDocs\(\(prev\) => prev\.map\(\(d\) => d\.id === selectedDoc\.id \? \{ \.\.\.d, status: "Approved" \} : d\)\);/g, `
                    fetch("/api/kyc", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, status: "approved" }) });
                    setDocs((prev:any) => prev.map((d:any) => d.id === selectedDoc.id ? { ...d, status: "approved" } : d));
`);

// 7. AuditLogsTab
content = content.replace(/const baseEvents = \[[\s\S]*?\];/, 'const baseEvents = (user.security_logs || []).map((l:any) => ({ date: new Date(l.created_at).toLocaleString(), title: l.action || "Activity", desc: l.details || "System action logged" }));');

// 8. UserDetailPageContent
content = content.replace(/const \[users, setUsers\] = useState<any\[\]>\(\[\]\);/, 'const [userData, setUserData] = useState<any>(null);');
content = content.replace(/const fetchUsers = async \(\) => \{[\s\S]*?\};/, `const fetchUsers = async () => {
      try {
        const res = await fetch(\`/api/users/\${userId}\`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          // Transform response to match UI format
          const formattedUser = {
            id: userId,
            name: data.profile?.full_name || data.auth?.user_metadata?.full_name || "Unknown User",
            email: data.auth?.email,
            phone: data.profile?.phone || data.auth?.phone || "N/A",
            dateOfBirth: data.kyc?.date_of_birth,
            street: data.kyc?.street_address,
            city: data.kyc?.city,
            postalCode: data.kyc?.postal_code,
            country: data.kyc?.country,
            joinedDate: new Date(data.auth?.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            lastLogin: data.auth?.last_sign_in_at ? new Date(data.auth.last_sign_in_at).toLocaleString() : "N/A",
            twoFactor: data.profile?.two_factor_enabled || false,
            lastIp: data.profile?.last_ip || "N/A",
            wallets: data.wallets || [],
            transactions: data.transactions || [],
            sessions: data.sessions || [],
            documents: data.kycDocuments || [],
            tickets: data.tickets || [],
            security_logs: data.securityLogs || [],
            notes: data.notes || [],
            account: data.profile?.account_status || "Active",
            risk: data.profile?.risk_level || "Low Risk",
            kyc: data.kyc?.status === "approved" ? "Verified" : data.kyc?.status === "rejected" ? "Rejected" : data.kyc?.status === "pending" ? "Pending" : "Not Started"
          };
          
          const rates: Record<string, number> = { BTC: 90000, ETH: 4500, USDT: 1.36, USDC: 1.36 };
          let totalBalance = 0;
          for (const w of formattedUser.wallets) {
             const r = rates[w.currency?.toUpperCase()] || 1.36;
             totalBalance += Number(w.balance || 0) * r;
          }
          formattedUser.balance = totalBalance;
          
          setUserData(formattedUser);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };`);

content = content.replace(/const user = users\.find\(\(u\) => u\.id === userId\);/, 'const user = userData;');
content = content.replace(/const \[isFrozen, setIsFrozen\]           = useState\(user\?\.account === "Frozen"\);/, `const [isFrozen, setIsFrozen]           = useState(false);
  useEffect(() => { if (user) setIsFrozen(user.account === "Frozen"); }, [user]);`);


// Handle Freeze
content = content.replace(/onConfirm=\{\(\) => \{ setIsFrozen\(true\); setShowFreeze\(false\); \}\}/, `onConfirm={async (reason) => { 
          await fetch(\`/api/users\`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, action: "freeze", reason }) });
          setIsFrozen(true); setShowFreeze(false); 
        }}`);
// Unfreeze
content = content.replace(/onClick=\{\(\) => isFrozen \? setIsFrozen\(false\) : setShowFreeze\(true\)\}/, `onClick={async () => {
                if (isFrozen) {
                   await fetch(\`/api/users\`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, action: "unfreeze" }) });
                   setIsFrozen(false);
                } else {
                   setShowFreeze(true);
                }
              }}`);

// Note Modal
content = content.replace(/onConfirm=\{\(\) => \{ setShowNote\(false\); setNoteSaved\(true\); setTimeout\(\(\) => setNoteSaved\(false\), 3000\); \}\}/, `onConfirm={async (note) => { 
          await fetch(\`/api/users/notes\`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ userId: user.id, note }) });
          setShowNote(false); setNoteSaved(true); setTimeout(() => setNoteSaved(false), 3000); 
          fetchUsers(); // Refresh notes
        }}`);

// Admin notes list in overview
content = content.replace(/\{activeTab === "overview"      && <OverviewTab user=\{user\} \/>\}/, `{activeTab === "overview"      && (
                  <>
                    <OverviewTab user={user} />
                    {user.notes && user.notes.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-base font-bold text-gray-900 mb-4">Admin Notes</h3>
                        <div className="space-y-3">
                          {user.notes.map((n:any) => (
                            <div key={n.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                              <p className="text-sm text-gray-800">{n.note}</p>
                              <p className="text-xs text-gray-500 mt-2">Added by {n.created_by} on {new Date(n.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}`);

// Fix Tabs
content = content.replace(/\{activeTab === "transactions"  && <TransactionsTab \/>\}/, '{activeTab === "transactions"  && <TransactionsTab user={user} />}');
content = content.replace(/\{activeTab === "security"      && <SecurityTab \/>\}/, '{activeTab === "security"      && <SecurityTab user={user} />}');
content = content.replace(/\{activeTab === "documents"     && <DocumentsTab \/>\}/, '{activeTab === "documents"     && <DocumentsTab user={user} />}');
content = content.replace(/\{activeTab === "support"       && <SupportTab \/>\}/, '{activeTab === "support"       && <SupportTab user={user} />}');

fs.writeFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', content);
