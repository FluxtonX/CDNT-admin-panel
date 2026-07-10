"use client";

import { useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { TextField, ContentCard } from "../shared/FieldComponents";

export function DashboardPanel() {
  // Top Header Area
  const [portfolioLabel, setPortfolioLabel] = useState("Total Portfolio Value");
  const [timeframeLabel, setTimeframeLabel] = useState("this month");
  const [cadBalanceLabel, setCadBalanceLabel] = useState("CAD Balance");
  const [depositBtn, setDepositBtn] = useState("Deposit");
  const [withdrawBtn, setWithdrawBtn] = useState("Withdraw");

  // Performance Chart
  const [perfTitle, setPerfTitle] = useState("Portfolio Performance");
  const [dateFrom, setDateFrom] = useState("From date");
  const [dateTo, setDateTo] = useState("To date");
  const [tooltipCad, setTooltipCad] = useState("CAD Value");

  // Asset Allocation
  const [allocTitle, setAllocTitle] = useState("Asset Allocation");
  const [emptyAssetsTitle, setEmptyAssetsTitle] = useState("No assets yet");
  const [emptyAssetsSub, setEmptyAssetsSub] = useState("Deposit to see your allocation");

  // Wallets Grid
  const [emptyWalletsTitle, setEmptyWalletsTitle] = useState("No wallets yet");
  const [emptyWalletsSub, setEmptyWalletsSub] = useState("Make a deposit to get started");

  // Recent Transactions
  const [txTitle, setTxTitle] = useState("Recent Transactions");
  const [txViewAll, setTxViewAll] = useState("View All");
  const [txLoading, setTxLoading] = useState("Loading transactions...");
  const [emptyTx, setEmptyTx] = useState("No recent transactions");
  const [txDetailsBtn, setTxDetailsBtn] = useState("View Details");

  // Transaction Details Modal
  const [modalTitle, setModalTitle] = useState("Transaction Details");
  const [modalAmount, setModalAmount] = useState("Amount");
  const [modalBalBefore, setModalBalBefore] = useState("Total Balance Before");
  const [modalNewBal, setModalNewBal] = useState("Available Balance");
  const [modalStatus, setModalStatus] = useState("Status");
  const [modalReason, setModalReason] = useState("Rejection Reason");

  return (
    <div className="space-y-6">
      <ContentCard title="Top Header Area" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Portfolio Label" value={portfolioLabel} onChange={setPortfolioLabel} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Timeframe Label" value={timeframeLabel} onChange={setTimeframeLabel} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="CAD Balance Label" value={cadBalanceLabel} onChange={setCadBalanceLabel} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Deposit Button" value={depositBtn} onChange={setDepositBtn} updatedAt="Jul 9, 2026 at 10:30 AM" />
          <TextField label="Withdraw Button" value={withdrawBtn} onChange={setWithdrawBtn} updatedAt="Jul 9, 2026 at 10:30 AM" />
        </div>
      </ContentCard>

      <ContentCard title="Performance Chart" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Section Title" value={perfTitle} onChange={setPerfTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="'From date' Placeholder" value={dateFrom} onChange={setDateFrom} updatedAt="Jul 9, 2026 at 10:30 AM" />
          <TextField label="'To date' Placeholder" value={dateTo} onChange={setDateTo} updatedAt="Jul 9, 2026 at 10:30 AM" />
        </div>
        <TextField label="Tooltip Value Label" value={tooltipCad} onChange={setTooltipCad} updatedAt="Jul 9, 2026 at 10:30 AM" />
      </ContentCard>

      <ContentCard title="Asset Allocation" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Section Title" value={allocTitle} onChange={setAllocTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Empty State Title" value={emptyAssetsTitle} onChange={setEmptyAssetsTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Empty State Sub-text" value={emptyAssetsSub} onChange={setEmptyAssetsSub} updatedAt="Jul 9, 2026 at 10:30 AM" />
      </ContentCard>

      <ContentCard title="Wallets Grid" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Empty State Title" value={emptyWalletsTitle} onChange={setEmptyWalletsTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Empty State Sub-text" value={emptyWalletsSub} onChange={setEmptyWalletsSub} updatedAt="Jul 9, 2026 at 10:30 AM" />
      </ContentCard>

      <ContentCard title="Recent Transactions" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Section Title" value={txTitle} onChange={setTxTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="'View All' Link" value={txViewAll} onChange={setTxViewAll} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Loading State" value={txLoading} onChange={setTxLoading} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Empty State Text" value={emptyTx} onChange={setEmptyTx} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="'View Details' Button" value={txDetailsBtn} onChange={setTxDetailsBtn} updatedAt="Jul 9, 2026 at 10:30 AM" />
      </ContentCard>

      <ContentCard title="Transaction Details Modal" icon={<LayoutDashboard className="h-4 w-4" />}>
        <TextField label="Modal Title" value={modalTitle} onChange={setModalTitle} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Amount Label" value={modalAmount} onChange={setModalAmount} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Balance Before Label (Prefix)" value={modalBalBefore} onChange={setModalBalBefore} helper="e.g. 'Total Balance Before [type]'" updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="New Balance Label" value={modalNewBal} onChange={setModalNewBal} helper="e.g. '[Remaining/New] Available Balance'" updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Status Label" value={modalStatus} onChange={setModalStatus} updatedAt="Jul 9, 2026 at 10:30 AM" />
        <TextField label="Rejection Reason Label" value={modalReason} onChange={setModalReason} updatedAt="Jul 9, 2026 at 10:30 AM" />
      </ContentCard>
    </div>
  );
}
