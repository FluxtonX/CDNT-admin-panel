"use client";

import { useState } from "react";
import { FileCheck, Info, Clock } from "lucide-react";
import { ListItem, makeList, TextField, ListEditor, ContentCard } from "../shared/FieldComponents";

export function KycPanel() {
  const [heading, setHeading] = useState("Identity Verification");
  const [subheading, setSubheading] = useState("Complete KYC to unlock your account");
  const [processingTime, setProcessingTime] = useState("1-2 business days");
  const [thankYou, setThankYou] = useState("Thank you for submitting your documents.\nOur team is reviewing your information.\nThis typically takes 1-2 business days.");
  const [selfieGuides, setSelfieGuides] = useState<ListItem[]>(makeList([
    "Face clearly visible",
    "Good lighting",
    "No sunglasses or hats",
    "Neutral expression",
  ]));
  const [whatNext, setWhatNext] = useState<ListItem[]>(makeList([
    "We'll verify your identity documents",
    "You'll receive an email when approved",
    "You can then access your full account",
  ]));

  return (
    <div className="space-y-6">
      <ContentCard title="Page Header" icon={<FileCheck className="h-4 w-4" />}>
        <TextField label="Page Heading" value={heading} onChange={setHeading} updatedAt="Jul 1, 2026 at 9:00 AM" />
        <TextField label="Page Subheading" value={subheading} onChange={setSubheading} updatedAt="Jul 1, 2026 at 9:00 AM" />
      </ContentCard>

      <ContentCard title="Selfie Guidelines" icon={<Info className="h-4 w-4" />}>
        <ListEditor label="Guidelines shown in Selfie Upload step" items={selfieGuides} onChange={setSelfieGuides} updatedAt="Jul 3, 2026 at 2:00 PM" />
      </ContentCard>

      <ContentCard title="Post-Submission Messages" icon={<Clock className="h-4 w-4" />}>
        <TextField
          label="Processing time"
          value={processingTime}
          onChange={setProcessingTime}
          placeholder="1-2 business days"
          helper="Shown as 'This typically takes X' on the pending screen."
          updatedAt="Jul 6, 2026 at 10:00 AM"
        />
        <TextField label="Thank-you body text" value={thankYou} onChange={setThankYou} multiline rows={4} updatedAt="Jul 6, 2026 at 10:00 AM" />
        <ListEditor label="'What happens next?' bullet points" items={whatNext} onChange={setWhatNext} updatedAt="Jul 6, 2026 at 10:00 AM" />
      </ContentCard>
    </div>
  );
}
