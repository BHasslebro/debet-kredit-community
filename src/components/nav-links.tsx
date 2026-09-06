"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Inbox, Landmark, BookOpen,
  FileText,
  Car, Boxes,
  Scale, Percent, Calculator,
  ClipboardCheck, BarChart3, LineChart,
  Users, Truck, Package, ListTree,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Vänstermenyn — "Arbetsrytmen".
 *
 * EN INDELNINGSPRINCIP, INTE FYRA. Menyn var tidigare indelad efter ämne
 * (Bokföring), objekt (Fakturering), myndighet (Skatt & moms) och format
 * (Rapporter) samtidigt. Därför fanns ingen plats där nästa funktion självklart
 * hörde hemma. Nu finns bara en fråga: gör du det, eller slår du upp det? Gör
 * du det — hur ofta? Grupperna följer arbetets kadens uppifrån och ned (varje
 * dag → pengarnas riktning → varje månad → bokslut), sedan det man slår upp
 * (Register) och sist plattformen i ett block utan rubrik. Lägg nya sidor efter
 * den regeln, inte efter ämne.
 *
 * REGISTREN LIGGER PÅ ETT STÄLLE. Kunder, Leverantörer, Artiklar och Kontoplan
 * låg tidigare utspridda i tre grupper. "Register – Kunder" är dessutom
 * ordagrant Fortnox eget språk, alltså den enda mening en Fortnox-flykting
 * redan kan utantill.
 *
 * SAMMA STRUKTUR SOM LICENSUTGÅVAN, MEN BARA SIDOR SOM FINNS HÄR. Community
 * är en mindre app: Lön, Offert & Order, Pipeline, Tidrapportering, Autogiro,
 * Kassa & e-handel, Periodisering, Månadsavslut, Kostnadsställen, Betalningar,
 * Personal, Rådgivaren, AI-bokföring, Att godkänna, Hjälp, Uppdateringar och
 * Min profil har ingen sida i det här repot. En menypost till en sida som inte
 * finns är värre än ingen menypost, så grupperna nedan är licensens grupper
 * tömda på det som saknas — inte en egen indelning. Gruppen Lön faller därför
 * bort helt, och Pengar in står kvar med en enda rad och viks in i Varje dag
 * av visibleSections(). Byggs någon av sidorna här senare hamnar den i sin
 * grupp av sig själv.
 *
 * VAD SOM MEDVETET INTE STÅR HÄR. "Ny faktura", "Ny verifikation" och "Sök" är
 * åtgärder, inte platser: knapparna står redan på listsidorna och ⌘K når
 * sökningen från hela appen (search-hotkey.tsx — den genvägen fanns inte alls
 * innan, så /sok hade blivit en sida utan en enda ingång). Alla tre sidorna
 * ligger kvar och nås som förut — det är bara menyraderna som är borta.
 */

/** Köer som ska tömmas får en siffra. Ingen annan rad får det. */
export type NavBadgeKey = "underlag";
export type NavBadges = Partial<Record<NavBadgeKey, number>>;

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: NavBadgeKey;
};
export type NavSection = { title: string; links: NavLink[] };

/** Exporterad för meny-testet: strukturen ska gå att granska utan att renderas. */
export const sections: NavSection[] = [
  {
    title: "Varje dag",
    links: [
      { href: "/", label: "Översikt", icon: LayoutDashboard },
      { href: "/underlag", label: "Underlagsinkorg", icon: Inbox, badge: "underlag" },
      { href: "/bank", label: "Bank", icon: Landmark },
      { href: "/verifikat", label: "Verifikat", icon: BookOpen },
    ],
  },
  {
    // Enda raden som finns här i community — viks in i Varje dag tills fler
    // säljsidor byggs. Gruppen står kvar så att de hamnar rätt när de gör det.
    title: "Pengar in",
    links: [
      { href: "/fakturor", label: "Fakturor", icon: FileText },
    ],
  },
  {
    title: "Pengar ut",
    links: [
      { href: "/korjournal", label: "Körjournal", icon: Car },
      { href: "/anlaggningar", label: "Anläggningar", icon: Boxes },
    ],
  },
  {
    title: "Varje månad",
    links: [
      { href: "/avstamning", label: "Avstämning", icon: Scale },
      { href: "/moms", label: "Moms", icon: Percent },
      { href: "/skatt", label: "Skatt & eget uttag", icon: Calculator },
    ],
  },
  {
    title: "Bokslut & rapporter",
    links: [
      // ClipboardCheck, inte CalendarCheck: Årsavslut är en avprickning, och
      // kalenderikonen gjorde den omöjlig att skilja från sina grannar.
      { href: "/arsavslut", label: "Årsavslut", icon: ClipboardCheck },
      { href: "/rapporter", label: "Rapporter & export", icon: BarChart3 },
      { href: "/analys", label: "Analys", icon: LineChart },
    ],
  },
  {
    title: "Register",
    links: [
      { href: "/kunder", label: "Kunder", icon: Users },
      { href: "/leverantorer", label: "Leverantörer", icon: Truck },
      { href: "/artiklar", label: "Artiklar", icon: Package },
      { href: "/kontoplan", label: "Kontoplan", icon: ListTree },
    ],
  },
  {
    title: "",
    links: [
      { href: "/installningar", label: "Inställningar", icon: Settings },
    ],
  },
];

/**
 * Utgåvan ska KORTA menyn, aldrig håla den. En grupp som blir tom försvinner i
 * sin helhet, och en rubricerad grupp som blir ensam kvar med en enda rad viks
 * in i föregående grupp — en rubrik som bär en post är ett hål med etikett.
 * Blocket utan rubrik längst ned räknas inte: det är en avdelare, inte en
 * etikett, och får bära en ensam rad.
 */
export function visibleSections(): NavSection[] {
  const out: NavSection[] = [];
  for (const section of sections) {
    const links = [...section.links];
    if (!links.length) continue;
    if (section.title && links.length < 2 && out.length) {
      out[out.length - 1].links.push(...links);
      continue;
    }
    out.push({ title: section.title, links });
  }
  return out;
}

/**
 * Vilken rad som är markerad. Tidigare `pathname === href`, vilket gav noll
 * markerade rader så fort man klev in i ett objekt: på /fakturor/1042 lyste
 * ingenting. Nu vinner den längsta träffande prefixen, så barnsidan markerar
 * sin gren. "/" är specialfall — annars hade Översikt matchat varje sida i
 * programmet.
 */
export function activeHref(pathname: string, links: NavLink[]): string | null {
  let best: string | null = null;
  for (const { href } of links) {
    if (href === "/") {
      if (pathname === "/") best = "/";
      continue;
    }
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

export function NavLinks({ badges }: { badges?: NavBadges }) {
  const pathname = usePathname();
  const visible = visibleSections();
  const active = activeHref(pathname, visible.flatMap((s) => s.links));

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2">
      {visible.map((section, i) => (
        <div
          key={section.title || `block-${i}`}
          className={cn(
            "nav-group relative",
            // Rubricerade grupper bärs av en rail, det rubriklösa blocket av en
            // linje. Rail:en har en enda ton för alla grupper: korallen betyder
            // "här är du" och ska förbli menyns enda färg med ett budskap.
            section.title ? "nav-group--rail" : i > 0 && "nav-group--rule",
          )}
        >
          {section.title && (
            <div className="nav-heading mb-1.5 px-2.5 text-[11px] font-semibold uppercase leading-[1.45] tracking-[0.09em]">
              {section.title}
            </div>
          )}
          <div className="space-y-px">
            {section.links.map((link) => {
              const isActive = active === link.href;
              const Icon = link.icon;
              const count = link.badge ? badges?.[link.badge] ?? 0 : 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className="nav-item relative flex items-center gap-2.5 whitespace-nowrap rounded-[0.7rem] px-2.5 py-1.5 text-[13px] transition-colors"
                >
                  <Icon className="nav-icon h-4 w-4 shrink-0" />
                  <span className="flex-1 overflow-hidden text-ellipsis">{link.label}</span>
                  {/* Ingen kö, inget element — en nolla i en badge är ett
                      påstående om att något väntar. */}
                  {count > 0 && (
                    <span className="nav-badge rounded-full px-1.5 py-[3px] text-[11px] font-semibold leading-none tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
