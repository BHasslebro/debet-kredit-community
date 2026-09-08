"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { BugReportDialog } from "@/components/bug-report-dialog";

export type ReportBugProps = {
  companyName: string;
  appVersion: string;
  buildSha?: string;
};

/**
 * Knappen i sidomenyns fot, formad som "Logga ut" bredvid den.
 *
 * Delad i två delar av ett konkret skäl: på mobilen sitter knappen INUTI
 * hamburgermenyns panel, och den panelen måste hinna stängas innan dialogen
 * öppnas. Annars fotograferar skärmbilden menyn i stället för sidan som gick
 * sönder — och sidan som gick sönder är hela poängen. Därför äger den som
 * har en panel att stänga också dialogens läge (se mobile-nav.tsx), medan
 * skrivbordsmenyn använder den självförsörjande `ReportBug` nedan.
 */
export function ReportBugTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      // nav-foot: 7,26:1 mot sidomenyn. Var text-sidebar-foreground/60 och
      // mätte 3,11:1 — sidomenyns fot är samma strukturbärare som posterna.
      className="nav-foot flex w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-[0.7rem] transition-colors"
      onClick={onClick}
    >
      <Bug className="h-4 w-4" />
      Rapportera en bugg
    </button>
  );
}

/** Knapp plus dialog, för ytor som inte har någon panel att stänga först. */
export function ReportBug({ companyName, appVersion, buildSha }: ReportBugProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ReportBugTrigger onClick={() => setOpen(true)} />
      <BugReportDialog
        open={open}
        onOpenChange={setOpen}
        companyName={companyName}
        appVersion={appVersion}
        buildSha={buildSha}
      />
    </>
  );
}
