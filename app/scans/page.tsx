import { Suspense } from "react";
import ScanHistoryClient from "@/components/ScanHistoryClient";

export const metadata = { title: "Scan History" };
export const revalidate = 60;

export default function ScansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Scan History</h1>
        <p className="text-sm text-neutral-500 mt-1">All channel scans, 10 per page</p>
      </div>

      <Suspense fallback={<div className="text-neutral-500">Loading...</div>}>
        <ScanHistoryClient />
      </Suspense>
    </div>
  );
}
