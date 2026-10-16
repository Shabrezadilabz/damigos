"use client";

import type { CrmOrder, DashboardAnalytics } from "@/lib/api";
import { DashboardAnalyticsFull } from "@/components/dashboard-analytics-full";
import { DashboardAnalyticsPeek } from "@/components/dashboard-analytics-peek";

type Props = {
  analytics: DashboardAnalytics | null;
  variant: "peek" | "full";
  onExportCsv?: () => void;
  exporting?: boolean;
  onOpenFull?: () => void;
  onBackOverview?: () => void;
  recentOrders?: CrmOrder[];
};

/** Routes to Stitch-matched peek or full analytics layouts. */
export function DashboardAnalyticsPanel(props: Props) {
  const { variant, onExportCsv, exporting, onOpenFull, onBackOverview, analytics } = props;
  if (variant === "peek") {
    return (
      <DashboardAnalyticsPeek
        analytics={analytics}
        onExportCsv={onExportCsv}
        exporting={exporting}
        onOpenFull={onOpenFull}
      />
    );
  }
  return (
    <DashboardAnalyticsFull
      analytics={analytics}
      onExportCsv={onExportCsv}
      exporting={exporting}
      onBackOverview={onBackOverview}
    />
  );
}
