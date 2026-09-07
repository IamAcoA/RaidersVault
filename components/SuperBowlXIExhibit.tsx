import Link from "next/link";
import type { ChampionshipExhibit } from "@/lib/exhibit-db";
import styles from "./SuperBowlXIExhibit.module.css";

const artifacts = [
  { label: "Final", value: "32–14", detail: "Oakland over Minnesota" },
  { label: "MVP", value: "Biletnikoff", detail: "4 receptions · 79 yards" },
  { label: "Raiders offense", value: "429", detail: "total yards" },
  { label: "Regular season", value: "13–1", detail: "AFC champions" },
  { label: "Signature return", value: "75", detail: "Willie Brown pick-six yards" },
  { label: "Stage", value: "Rose Bowl", detail: "Pasadena · Jan. 9, 1977" }
] as const;

export function SuperBowlXIExhibit({ exhibit }: { exhibit: ChampionshipExhibit }) {
  return (
    <div className={styles.exhibit}>
      <div className={styles.heroIntro} data-reveal>
        <span className={styles.kicker}>Championship Room · First Super Bowl title</span>
        <h1>SUPER BOWL XI</h1>
        <p>The day Oakland stopped chasing the championship and owned it.</p>
      </div>

      <section className={styles.room} aria-label="Super Bowl XI connected exhibit" data-reveal>
        <svg className={styles.lines} viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.lineMatchup} d="M500 400 C390 350 300 250 175 190" />
          <path className={styles.lineMvp} d="M500 400 C620 340 720 235 825 170" />
          <path className={styles.lineSeason} d="M500 400 C390 470 290 585 175 655" />
          <path className={styles.lineCoach} d="M500 400 C610 475 720 585 825 655" />
        </svg>

        <div className={styles.center} data-preview-title="Super Bowl XI" data-preview-meta="Oakland Raiders 32 · Minnesota Vikings 14 · First Super Bowl championship" data-preview-kicker="January 9, 1977" data-preview-art="XI">
          <img src="/art/sbxi/centerpiece.svg" alt="Original Raiders Vault Super Bowl XI championship artwork" />
          <div className={styles.centerGlow} />
          <div className={styles.centerCaption}><span>Oakland Raiders</span><span>World Champions</span></div>
        </div>

        <Link className={`${styles.satellite} ${styles.matchup}`} href="/games/1977-01-09-minnesota-vikings" data-preview-title="Raiders vs. Vikings" data-preview-meta="Super Bowl XI · Raiders 32–14 · Rose Bowl" data-preview-kicker="Championship game" data-preview-art="32">
          <img src="/art/sbxi/matchup.svg" alt="Original Raiders Vault Raiders versus Vikings matchup poster" />
          <div className={styles.satelliteCopy}><small>Championship game</small><strong>Raiders vs. Vikings</strong><span>Open the full game record →</span></div>
        </Link>

        <Link className={`${styles.satellite} ${styles.mvp}`} href="/legends/fred-biletnikoff" data-preview-title="Fred Biletnikoff" data-preview-meta="Super Bowl XI MVP · 4 receptions · 79 yards" data-preview-kicker="MVP exhibit" data-preview-art="25">
          <img src="/art/sbxi/biletnikoff.svg" alt="Original Raiders Vault number 25 receiver silhouette artwork for Fred Biletnikoff" />
          <div className={styles.satelliteCopy}><small>Super Bowl XI MVP</small><strong>Fred Biletnikoff</strong><span>Open his Hall of Fame exhibit →</span></div>
        </Link>

        <Link className={`${styles.satellite} ${styles.season}`} href="/seasons/1976" data-preview-title="1976 Oakland Raiders" data-preview-meta="13–1 regular season · AFC champions · 12 straight wins entering Super Bowl XI" data-preview-kicker="Championship season" data-preview-art="76">
          <img src="/art/sbxi/season-1976.svg" alt="Original Raiders Vault 1976 Oakland Raiders season poster" />
          <div className={styles.satelliteCopy}><small>Championship season</small><strong>1976 Oakland Raiders</strong><span>Open the season exhibit →</span></div>
        </Link>

        <Link className={`${styles.satellite} ${styles.coach}`} href="/legends/john-madden" data-preview-title="John Madden" data-preview-meta="Head coach · 1976 champions · First Super Bowl title" data-preview-kicker="Head coach" data-preview-art="JM">
          <img src="/art/sbxi/madden.svg" alt="Original Raiders Vault John Madden coaching silhouette artwork" />
          <div className={styles.satelliteCopy}><small>Head coach</small><strong>John Madden</strong><span>Open his Hall of Fame exhibit →</span></div>
        </Link>
      </section>

      <section className={styles.artifactSection} data-reveal>
        <div className={styles.artifactHeading}>
          <span>Artifact drawer</span>
          <p>Hover the plaques. Each is a fact pulled forward from the championship record.</p>
        </div>
        <div className={styles.artifacts}>
          {artifacts.map(item => <div className={styles.artifact} key={item.label}><small>{item.label}</small><strong>{item.value}</strong><span>{item.detail}</span></div>)}
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.storyHeader} data-reveal>
          <span>The story</span>
          <h2>Walk through the day.</h2>
          <p>The exhibit unfolds from the road to Pasadena through the performance that delivered the franchise's first Super Bowl championship.</p>
        </div>

        <article className={styles.chapter} data-reveal>
          <div className={styles.chapterVisual}><img src="/art/sbxi/season-1976.svg" alt="1976 season typography artwork" /></div>
          <div className={styles.chapterText}><span className={styles.num}><b>01</b></span><span>Road to Pasadena</span><h3>A team arriving at full force.</h3><p>Oakland finished the 1976 regular season 13–1, won both AFC playoff games and entered Super Bowl XI on a 12-game winning streak. This was not a team hoping to discover its identity on championship Sunday. It arrived with one already forged.</p><div className={styles.chapterStat}><strong>13–1</strong><small>regular season record</small></div></div>
        </article>

        <article className={styles.chapter} data-reveal>
          <div className={styles.chapterVisual}><img src="/art/sbxi/matchup.svg" alt="Raiders versus Vikings matchup artwork" /></div>
          <div className={styles.chapterText}><span className={styles.num}><b>02</b></span><span>The matchup</span><h3>Oakland controlled the room.</h3><p>Minnesota entered as the NFC champion. Oakland answered by controlling possession, field position and the line of scrimmage. By halftime the Raiders led 16–0 and had outgained the Vikings 288 yards to 86.</p><div className={styles.chapterStat}><strong>288–86</strong><small>first-half yardage edge</small></div></div>
        </article>

        <article className={styles.chapter} data-reveal>
          <div className={styles.chapterVisual}><img src="/art/sbxi/biletnikoff.svg" alt="Fred Biletnikoff number 25 silhouette artwork" /></div>
          <div className={styles.chapterText}><span className={styles.num}><b>03</b></span><span>The MVP</span><h3>Biletnikoff kept putting Oakland at the doorstep.</h3><p>Fred Biletnikoff caught four passes for 79 yards. The volume was modest; the leverage was enormous. His catches repeatedly moved the Raiders into scoring position, and the precision of those moments made him Super Bowl XI MVP.</p><div className={styles.chapterStat}><strong>4 · 79</strong><small>receptions · receiving yards</small></div></div>
        </article>

        <article className={styles.chapter} data-reveal>
          <div className={styles.chapterVisual}><img src="/art/sbxi/centerpiece.svg" alt="Super Bowl XI championship artwork" /></div>
          <div className={styles.chapterText}><span className={styles.num}><b>04</b></span><span>The signature blow</span><h3>Willie Brown closed the door.</h3><p>With Minnesota trying to climb back into the game, Willie Brown jumped a Fran Tarkenton pass and returned the interception 75 yards for a touchdown. Oakland had 32 points. The championship was no longer in doubt.</p><div className={styles.chapterStat}><strong>75</strong><small>yards on the interception return</small></div></div>
        </article>

        <article className={styles.chapter} data-reveal>
          <div className={styles.chapterVisual}><img src="/art/sbxi/madden.svg" alt="John Madden coaching silhouette artwork" /></div>
          <div className={styles.chapterText}><span className={styles.num}><b>05</b></span><span>The breakthrough</span><h3>Madden's Raiders finally owned the ring.</h3><p>The Raiders had spent years reaching the edge of the championship. Super Bowl XI changed the franchise's emotional geography. When the game ended, John Madden was carried from the field and Oakland had its first Super Bowl title.</p><div className={styles.chapterStat}><strong>1st</strong><small>Raiders Super Bowl championship</small></div></div>
        </article>
      </section>

      <section className={styles.continue} data-reveal>
        <span className="eyebrow">Continue the story</span>
        <h2>The next rooms are already connected.</h2>
        <div className={styles.continueGrid}>
          <Link className={styles.continueCard} href="/legends/fred-biletnikoff"><small>MVP</small><strong>Fred Biletnikoff</strong><b>Enter exhibit →</b></Link>
          <Link className={styles.continueCard} href="/seasons/1976"><small>Season</small><strong>1976 Oakland Raiders</strong><b>Enter exhibit →</b></Link>
          <Link className={styles.continueCard} href="/legends/john-madden"><small>Coach</small><strong>John Madden</strong><b>Enter exhibit →</b></Link>
          <Link className={styles.continueCard} href="/championships/super-bowl-xv"><small>Next title</small><strong>Super Bowl XV</strong><b>Continue history →</b></Link>
        </div>
      </section>

      <p className={styles.sourceNote}>Historical facts are sourced to the official Raiders Super Bowl XI history and championship archive. Original exhibit artwork on this page was created for RaidersVault and does not reuse game photography. <a href="https://www.raiders.com/history/super-bowl-xi" target="_blank" rel="noopener noreferrer">Read the Raiders' Super Bowl XI history ↗</a> · Storage: {exhibit.database ? "connected Postgres record" : "versioned fallback record"}.</p>
    </div>
  );
}
