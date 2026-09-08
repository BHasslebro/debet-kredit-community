"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Genvägen till sökningen, monterad i hela appen.
 *
 * "Sök" är en åtgärd, inte en plats, och togs bort som menyrad. Men menyraden
 * var sidans enda ingång: någon ⌘K-lyssnare fanns inte i det här repot alls,
 * varken på /sok eller någon annanstans. Utan den här filen hade /sok blivit
 * en sida utan en enda väg in.
 *
 * Därför den här: ⌘K (Ctrl+K på Windows och Linux) tar dig till sökningen
 * varifrån som helst. Ingenting ritas — menyn ska inte ha något sökfält, och
 * en genväg behöver ingen yta för att finnas. Väl på /sok står lyssnaren
 * tillbaka: fältet är redan fokuserat och att navigera till sidan man står på
 * är ingen hjälp.
 */
export function SearchHotkey() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/sok")) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        router.push("/sok");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);

  return null;
}
