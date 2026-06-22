const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', 'utf-8');

const target = `/* ─── Page ───────────────────────────────────────────────────────── */
export default function UserDetailPage() {
  return (
    <RequirePermission permission="view-users">
      <UserDetailPageContent />
    </RequirePermission>
  );
}


                    setSelectedDoc(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  Approve Document
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

const replacement = `/* ─── Page ───────────────────────────────────────────────────────── */
export default function UserDetailPage() {
  return (
    <RequirePermission permission="view-users">
      <UserDetailPageContent />
    </RequirePermission>
  );
}

function UserDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
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
  };

  useEffect(() => {
    fetchUsers();
  }, [userId]);

  const user = userData;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', content);
    console.log("Fixed part 2!");
} else {
    console.log("Target not found!");
}
