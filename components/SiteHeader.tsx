import Link from "next/link";

const nav = [
  ["Timeline", "/timeline"],
  ["Eras", "/eras"],
  ["Seasons", "/seasons"],
  ["Venues", "/venues"],
  ["Games", "/games"],
  ["Rivalries", "/rivalries"],
  ["Legends", "/legends"],
  ["Al Davis", "/al-davis"],
  ["Numbers", "/numbers"],
  ["Records", "/records"],
  ["Championships", "/championships"],
  ["Players", "/players"],
  ["Moments", "/moments"],
  ["The Vault", "/vault"],
  ["Coverage", "/coverage"]
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Raiders Vault home">
          <span className="brand-mark">RV</span>
          <span>
            <strong>RAIDERS VAULT</strong>
            <small>Independent historical archive</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
