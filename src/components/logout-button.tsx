"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      // nav-foot: 7,26:1 mot sidomenyn. Var text-sidebar-foreground/60 och
      // mätte 3,11:1 — under WCAG AA för en knapp man faktiskt ska hitta.
      className="nav-foot flex w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] rounded-[0.7rem] transition-colors"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      Logga ut
    </button>
  );
}
