"use client";

import { useState } from "react";
import { ArrowDownToLine, AlertTriangle, Info } from "lucide-react";
import {
  ListItem,
  makeList,
  TextField,
  ListEditor,
  ContentCard,
} from "../shared/FieldComponents";

export function DepositPanel() {
  const [pageSubheading, setPageSubheading] = useState("Select an asset, review the network, then scan the company deposit QR.");
  const [infoBox, setInfoBox] = useState("The QR contains the fixed company deposit address for this asset and network. The address is intentionally not displayed as plain text on this screen.");
  const [warningBox, setWarningBox] = useState("Sending the wrong asset or network can permanently lose funds.");
  const [cadBlocked, setCadBlocked] = useState("Canadian regulations absolutely forbid CAD deposits on fraud-refund accounts. The deposit function is permanently disabled.");
  const [successTitle, setSuccessTitle] = useState("Deposit QR ready");
  const [successBody, setSuccessBody] = useState("Scan the QR from your external wallet and send only on the selected network.");
  const [instructions, setInstructions] = useState<ListItem[]>(makeList([
    "Send only the selected asset on the correct network.",
    "The QR uses a fixed company deposit address configured by admin.",
    "Minimum deposit applies — check the amount field.",
    "Requires the specified number of network confirmations.",
    "Funds are reviewed manually before balance credit.",
  ]));

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<ArrowDownToLine className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={pageSubheading} onChange={setPageSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Important Instructions Block" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-gray-500 -mt-1 mb-2">Shown in the amber sidebar box (Steps 1 &amp; 3).</p>
        <ListEditor label="Instruction Bullet Points" items={instructions} onChange={setInstructions} updatedAt="Jul 9, 2026 at 8:45 AM" />
      </ContentCard>

      <ContentCard title="Info &amp; Warning Boxes" icon={<Info className="h-4 w-4" />}>
        <TextField label="Blue info box text (Step 1)" value={infoBox} onChange={setInfoBox} multiline rows={3} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Amber warning box text (Step 2)" value={warningBox} onChange={setWarningBox} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Green success box title (Step 3)" value={successTitle} onChange={setSuccessTitle} updatedAt="Jul 2, 2026 at 4:00 PM" />
        <TextField label="Green success box body (Step 3)" value={successBody} onChange={setSuccessBody} updatedAt="Jul 2, 2026 at 4:00 PM" />
      </ContentCard>

      <ContentCard title="CAD Deposit Blocked Message" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This is a legal/regulatory message. Update with caution.
        </p>
        <TextField label="CAD fiat deposit blocked notice" value={cadBlocked} onChange={setCadBlocked} multiline rows={3} updatedAt="Jun 20, 2026 at 10:00 AM" />
      </ContentCard>
    </div>
  );
}
