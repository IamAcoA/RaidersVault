"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import type { ChampionshipExhibit } from "@/lib/exhibit-db";
import styles from "./SuperBowlXIExhibit.module.css";

const artifacts = [
  { label: "Final score", value: "32–14", detail: "Raiders over Vikings", cls: "artifactScore" },
  { label: "MVP", value: "Fred Biletnikoff", detail: "4 catches · 79 yards", cls: "artifactMvp" },
  { label: "Stage", value: "Rose Bowl", detail: "Pasadena, California", cls: "artifactRose" },
  { label: "Season", value: "13–1", detail: "AFC champions", cls: "artifactSeason" },
  { label: "Signature play", value: "75 yards", detail: "Willie Brown pick-six", cls: "artifactBrown" }
] as const;

export function SuperBowlXIExhibit({ exhibit }: { exhibit: ChampionshipExhibit }) {
  const sceneRef = useRef<HTMLDivElement>(null);

  function moveScene(event: PointerEvent<HTMLDivElement>) {
    const el = sceneRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--ry", `${(x - 0.5) * 2.2}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 1.4}deg`);
  }

  function resetScene() {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "48%");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  return (
    <div className={styles.exhibit}>
      <div className={styles.intro} data-reveal>
        <span>Championship Room · Museum wing 01</span>
        <h1>Walk into Super Bowl XI.</h1>
        <p>The connections are no longer around the championship. They are rooms inside it.</p>
      </div>

      <section
        ref={sceneRef}
        className={styles.sceneViewport}
        aria-label="Immersive Super Bowl XI museum hallway"
        onPointerMove={moveScene}
        onPointerLeave={resetScene}
        data-reveal
      >
        <div className={styles.sceneLayer}>
          <div className={styles.movingLight} aria-hidden="true" />
          <div className={styles.depthVignette} aria-hidden="true" />

          <Link
            className={`${styles.portal} ${styles.matchupDoor}`}
            href="/games/1977-01-09-minnesota-vikings"
            aria-label="Enter Raiders versus Vikings game exhibit"
            data-preview-title="Raiders vs. Vikings"
            data-preview-meta="Super Bowl XI · Raiders 32–14 · Rose Bowl"
            data-preview-kicker="Door 01 · The matchup"
          >
            <span className={styles.portalGlow} />
            <span className={styles.portalTag}>Enter matchup →</span>
          </Link>

          <Link
            className={`${styles.portal} ${styles.seasonDoor}`}
            href="/seasons/1976"
            aria-label="Enter 1976 Oakland Raiders season exhibit"
            data-preview-title="1976 Oakland Raiders"
            data-preview-meta="13–1 · AFC champions · First Super Bowl title"
            data-preview-kicker="Door 02 · The season"
          >
            <span className={styles.portalGlow} />
            <span className={styles.portalTag}>Enter season →</span>
          </Link>

          <Link
            className={`${styles.portal} ${styles.mvpDoor}`}
            href="/legends/fred-biletnikoff"
            aria-label="Enter Fred Biletnikoff exhibit"
            data-preview-title="Fred Biletnikoff"
            data-preview-meta="Super Bowl XI MVP · 4 receptions · 79 yards"
            data-preview-kicker="Door 03 · The MVP"
          >
            <span className={styles.portalGlow} />
            <span className={styles.portalTag}>Enter Biletnikoff →</span>
          </Link>

          <Link
            className={`${styles.portal} ${styles.coachDoor}`}
            href="/legends/john-madden"
            aria-label="Enter John Madden exhibit"
            data-preview-title="John Madden"
            data-preview-meta="Head coach · 1976 champions · First Super Bowl title"
            data-preview-kicker="Door 04 · The coach"
          >
            <span className={styles.portalGlow} />
            <span className={styles.portalTag}>Enter Madden →</span>
          </Link>

          <Link
            className={styles.endWall}
            href="/games/1977-01-09-minnesota-vikings"
            aria-label="Enter the Super Bowl XI game record"
          >
            <span>Step into the game</span>
          </Link>

          {artifacts.map(item => (
            <div className={`${styles.artifactHotspot} ${styles[item.cls]}`} key={item.label} tabIndex={0}>
              <span className={styles.artifactPopup}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <b>{item.detail}</b>
              </span>
            </div>
          ))}
        </div>

        <div className={styles.sceneInstruction}>
          <span>Move your cursor through the hall</span>
          <b>Choose a door. Go deeper.</b>
        </div>
      </section>

      <section className={styles.storyBridge} data-reveal>
        <div>
          <span className="eyebrow">The room behind the room</span>
          <h2>Super Bowl XI was the doorway.</h2>
        </div>
        <p>Oakland entered Pasadena 13–1, controlled Minnesota from the opening half, and left with the first Super Bowl championship in franchise history. The museum hall above lets you follow the people, game and season that made that day possible.</p>
      </section>

      <section className={styles.memoryTunnel} aria-label="Super Bowl XI story sequence">
        <article className={styles.memoryRoom} data-reveal>
          <div className={styles.memoryArt} style={{ backgroundImage: "url('/art/sbxi/season-1976.svg')" }} />
          <div className={styles.memoryCopy}><small>01 · Road to Pasadena</small><h3>13–1</h3><p>Oakland arrived with a 12-game winning streak and a team identity already forged.</p></div>
        </article>
        <article className={styles.memoryRoom} data-reveal>
          <div className={styles.memoryArt} style={{ backgroundImage: "url('/art/sbxi/matchup.svg')" }} />
          <div className={styles.memoryCopy}><small>02 · The first half</small><h3>288–86</h3><p>The Raiders outgained Minnesota 288 yards to 86 before halftime and led 16–0.</p></div>
        </article>
        <article className={styles.memoryRoom} data-reveal>
          <div className={styles.memoryArt} style={{ backgroundImage: "url('/art/sbxi/biletnikoff.svg')" }} />
          <div className={styles.memoryCopy}><small>03 · The MVP</small><h3>4 · 79</h3><p>Biletnikoff's four catches repeatedly put Oakland in scoring position and earned MVP honors.</p></div>
        </article>
        <article className={styles.memoryRoom} data-reveal>
          <div className={styles.memoryArt} style={{ backgroundImage: "url('/art/sbxi/centerpiece.svg')" }} />
          <div className={styles.memoryCopy}><small>04 · The seal</small><h3>75</h3><p>Willie Brown's 75-yard interception return closed the game and became one of the defining images of the title.</p></div>
        </article>
      </section>

      <section className={styles.nextHall} data-reveal>
        <div className={styles.nextHallLead}>
          <span className="eyebrow">The corridor continues</span>
          <h2>Open the next door.</h2>
        </div>
        <div className={styles.nextDoors}>
          <Link href="/legends/fred-biletnikoff"><span>MVP</span><strong>Fred Biletnikoff</strong><b>Enter room →</b></Link>
          <Link href="/seasons/1976"><span>Season</span><strong>1976 Oakland Raiders</strong><b>Enter room →</b></Link>
          <Link href="/legends/john-madden"><span>Coach</span><strong>John Madden</strong><b>Enter room →</b></Link>
          <Link href="/championships/super-bowl-xv"><span>Next title</span><strong>Super Bowl XV</strong><b>Continue →</b></Link>
        </div>
      </section>

      <p className={styles.sourceNote}>Historical facts are sourced to the official Raiders Super Bowl XI history and championship archive. The hallway artwork is original RaidersVault visual material created for this exhibit and does not reuse game photography. <a href="https://www.raiders.com/history/super-bowl-xi" target="_blank" rel="noopener noreferrer">Raiders Super Bowl XI history ↗</a> · Storage: {exhibit.database ? "connected Postgres record" : "versioned fallback record"}.</p>
    </div>
  );
}
