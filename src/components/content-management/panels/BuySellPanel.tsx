"use client";

import { useState } from "react";
import { BarChart3, AlertTriangle, Info } from "lucide-react";
import { TextField, ContentCard } from "../shared/FieldComponents";

export function BuySellPanel() {
  const [subheading, setSubheading] = useState("Live Binance market data for crypto charting and market stats");
  const [disclaimer, setDisclaimer] = useState("Orders are reviewed before confirmation. Live Binance market price may change.");
  const [buyFee, setBuyFee] = useState("0.50");
  const [sellFee, setSellFee] = useState("0.40");

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<BarChart3 className="h-4 w-4" />}>
        <TextField label="Page Subheading" value={subheading} onChange={setSubheading} updatedAt="Jul 3, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Trade Fees" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-1 mb-2">
          Warning: This updates the display only. Ensure Supabase RPC fee calculations are updated separately.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Buy fee (%)" value={buyFee} onChange={setBuyFee} placeholder="0.50" helper="Displayed as 'Fee (0.XX%)' in the order panel." updatedAt="Jul 5, 2026 at 3:00 PM" />
          <TextField label="Sell fee (%)" value={sellFee} onChange={setSellFee} placeholder="0.40" helper="Displayed as 'Fee (0.XX%)' in the order panel." updatedAt="Jul 5, 2026 at 3:00 PM" />
        </div>
      </ContentCard>

      <ContentCard title="Order Panel Disclaimer" icon={<Info className="h-4 w-4" />}>
        <TextField label="Disclaimer text (shown below execute button)" value={disclaimer} onChange={setDisclaimer} multiline rows={2} updatedAt="Jul 2, 2026 at 11:00 AM" />
      </ContentCard>
    </div>
  );
}
