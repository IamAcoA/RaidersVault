"use client";

import { useEffect, useRef, useState } from "react";

const SURFACE_SELECTOR = [
  ".door-card",
  ".person-card",
  ".moment-card",
  ".championship-card",
  ".related-card",
  ".coverage-card",
  ".history-today-card",
  ".hero-plaque",
  ".exhibit-plaque",
  ".game-row"
].join(",");

type PreviewState = {
  title: string;
  meta: string;
  kicker: string;
  art: string;
  image?: string;
  x: number;
  y: number;
} | null;

function previewFromElement(element: HTMLElement, x: number, y: number): PreviewState {
  const title = element.dataset.previewTitle;
  if (!title) return null;
  return {
    title,
    meta: element.dataset.previewMeta ?? "Open archive record",
    kicker: element.dataset.previewKicker ?? "Raiders Vault",
    art: element.dataset.previewArt ?? "RV",
    image: element.dataset.previewImage,
    x,
    y
  };
}

export function ImmersiveExperience() {
  const auraRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeSurface: HTMLElement | null = null;
    let frame = 0;

    const resetSurface = (surface: HTMLElement | null) => {
      if (!surface) return;
      surface.style.setProperty("--tilt-x", "0deg");
      surface.style.setProperty("--tilt-y", "0deg");
      surface.style.setProperty("--pointer-x", "50%");
      surface.style.setProperty("--pointer-y", "50%");
    };

    const positionPreview = (x: number, y: number) => {
      const width = 318;
      const height = 190;
      const gutter = 18;
      return {
        x: Math.min(window.innerWidth - width - gutter, Math.max(gutter, x + 24)),
        y: Math.min(window.innerHeight - height - gutter, Math.max(gutter, y + 24))
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (auraRef.current) {
          auraRef.current.style.transform = `translate3d(${event.clientX - 260}px, ${event.clientY - 260}px, 0)`;
        }

        const target = event.target instanceof Element ? event.target : null;
        const surface = target?.closest(SURFACE_SELECTOR) as HTMLElement | null;
        if (activeSurface && activeSurface !== surface) resetSurface(activeSurface);
        activeSurface = surface;

        if (surface && !reducedMotion.matches) {
          const rect = surface.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
          surface.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
          surface.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
          surface.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
          surface.style.setProperty("--tilt-x", `${((0.5 - y) * 5).toFixed(2)}deg`);
        }

        const previewElement = target?.closest("[data-preview-title]") as HTMLElement | null;
        if (previewElement) {
          const point = positionPreview(event.clientX, event.clientY);
          setPreview(previewFromElement(previewElement, point.x, point.y));
        } else {
          setPreview(null);
        }

        const hero = target?.closest(".hero") as HTMLElement | null;
        if (hero && !reducedMotion.matches) {
          const rect = hero.getBoundingClientRect();
          hero.style.setProperty("--hero-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
          hero.style.setProperty("--hero-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        }
      });
    };

    const handlePointerLeave = () => {
      resetSurface(activeSurface);
      activeSurface = null;
      setPreview(null);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const previewElement = target?.closest("[data-preview-title]") as HTMLElement | null;
      if (!previewElement) return;
      const rect = previewElement.getBoundingClientRect();
      const point = positionPreview(rect.right, rect.top + rect.height * 0.25);
      setPreview(previewFromElement(previewElement, point.x, point.y));
    };

    const handleFocusOut = () => setPreview(null);

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(
      "[data-reveal], .section-title, .door-card, .person-card, .moment-card, .championship-card, .related-card, .game-row"
    ));
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    revealTargets.forEach((element, index) => {
      element.classList.add("reveal-ready");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 45}ms`);
      observer.observe(element);
    });

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return (
    <>
      <div ref={auraRef} className="vault-pointer-aura" aria-hidden="true" />
      <div
        className={`vault-hover-preview${preview ? " is-visible" : ""}`}
        style={preview ? { left: preview.x, top: preview.y } : undefined}
        aria-hidden="true"
      >
        <div className="vault-hover-preview-art">
          {preview?.image ? <div className="vault-hover-preview-image" style={{ backgroundImage: `url(${preview.image})` }} /> : null}
          <span>{preview?.art ?? "RV"}</span>
        </div>
        <div className="vault-hover-preview-copy">
          <small>{preview?.kicker ?? "Raiders Vault"}</small>
          <strong>{preview?.title ?? ""}</strong>
          <p>{preview?.meta ?? ""}</p>
          <b>Explore →</b>
        </div>
      </div>
    </>
  );
}
