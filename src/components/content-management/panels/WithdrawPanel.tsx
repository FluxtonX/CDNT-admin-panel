"use client";

import { useState } from "react";
import { ArrowUpFromLine, AlertTriangle, Info } from "lucide-react";
import { TextField, ContentCard } from "../shared/FieldComponents";

export function WithdrawPanel() {
  const [pageSubheading, setPageSubheading] = useState("Transfer to your bank via Interac e-Transfer");
  const [feeAmount, setFeeAmount] = useState("2.50");
  const [partialErrMsg, setPartialErrMsg] = useState("For partial withdrawals, please contact support.");
  const [supportLink, setSupportLink] = useState("/support");
  const [importantBox, setImportantBox] = useState("Make sure the recipient email is correct. The recipient will need the security answer to claim the funds.");
  const [otpText, setOtpText] = useState("We have sent a 6-digit code to your registered email address.");

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<ArrowUpFromLine className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={pageSubheading} onChange={setPageSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Transaction Fee" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This updates the display only. Ensure backend fee logic is updated separately.
        </p>
        <TextField
          label="Withdrawal fee amount (CAD)"
          value={feeAmount}
          onChange={setFeeAmount}
          placeholder="2.50"
          helper="Displayed as '$X.XX CAD' in the transaction summary. Numeric value only."
          updatedAt="Jul 5, 2026 at 3:00 PM"
        />
      </ContentCard>

      <ContentCard title="Partial Withdrawal Error Message" icon={<Info className="h-4 w-4" />}>
        <TextField label="Error message text" value={partialErrMsg} onChange={setPartialErrMsg} updatedAt="Jul 8, 2026 at 5:30 PM" />
        <TextField
          label="Support link URL"
          value={supportLink}
          onChange={setSupportLink}
          placeholder="/support"
          helper="The URL that 'support' links to in the error message."
          updatedAt="Jul 8, 2026 at 5:30 PM"
        />
      </ContentCard>

      <ContentCard title="Step 2 — Recipient Details Important Box" icon={<AlertTriangle className="h-4 w-4" />}>
        <TextField label="Important box body text" value={importantBox} onChange={setImportantBox} multiline rows={3} updatedAt="Jul 2, 2026 at 11:00 AM" />
      </ContentCard>

      <ContentCard title="Step 3 — 2FA Instruction Text" icon={<Info className="h-4 w-4" />}>
        <TextField label="OTP instruction text" value={otpText} onChange={setOtpText} updatedAt="Jul 1, 2026 at 9:00 AM" />
      </ContentCard>
    </div>
  );
}
