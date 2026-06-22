const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', 'utf-8');

const target = `  const [activeTab, setActiveTab]         = useState("overview");
  const [isFrozen, setIsFrozen]           = useState(false);
        <h2 className="text-lg font-bold text-gray-700">User not found</h2>`;

const replacement = `  const [activeTab, setActiveTab]         = useState("overview");
  const [isFrozen, setIsFrozen]           = useState(false);
  useEffect(() => { if (user) setIsFrozen(user.account === "Frozen"); }, [user]);
  const [showFreezeModal, setShowFreeze]  = useState(false);
  const [showNoteModal, setShowNote]      = useState(false);
  const [noteSaved, setNoteSaved]         = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></span>
        <p className="text-sm text-gray-600">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <User className="h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-bold text-gray-700">User not found</h2>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', content);
    console.log("Fixed!");
} else {
    console.log("Target not found!");
}
