"use client";

import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, useEffect, useState } from "react";
import { z } from "zod";

const slideshowImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
});

const heroBannerPropsSchema = z.object({
  heading: z.string().default("Welcome"),
  subheading: z.string().default(""),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("#"),
  backgroundImage: z.string().optional(),
  overlay: z.boolean().default(true),
  height: z.string().default("480px"),
  images: z.array(slideshowImageSchema).default([]),
  autoplay: z.boolean().default(true),
  intervalMs: z.number().int().min(500).default(5000),
  loop: z.boolean().default(true),
  pauseOnHover: z.boolean().default(true),
  showDots: z.boolean().default(true),
  showArrows: z.boolean().default(false),
});

type HeroBannerData = z.infer<typeof heroBannerPropsSchema>;

const FALLBACK_DATA: HeroBannerData = {
  heading: "Welcome",
  subheading: "",
  ctaLabel: "",
  ctaHref: "#",
  backgroundImage: undefined,
  overlay: true,
  height: "480px",
  images: [],
  autoplay: true,
  intervalMs: 5000,
  loop: true,
  pauseOnHover: true,
  showDots: true,
  showArrows: false,
};

type HeroBannerProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type UseSlideshowArgs = {
  count: number;
  autoplay: boolean;
  intervalMs: number;
  loop: boolean;
  paused: boolean;
  prefersReducedMotion: boolean;
};

function useSlideshow({
  count,
  autoplay,
  intervalMs,
  loop,
  paused,
  prefersReducedMotion,
}: UseSlideshowArgs) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1 || !autoplay || paused || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (loop ? (i + 1) % count : Math.min(i + 1, count - 1)));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, autoplay, intervalMs, loop, paused, prefersReducedMotion]);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(i, Math.max(0, count - 1))));
  const next = () =>
    setIndex((i) => (loop ? (i + 1) % count : Math.min(i + 1, count - 1)));
  const prev = () =>
    setIndex((i) => (loop ? (i - 1 + count) % count : Math.max(i - 1, 0)));

  return { index, goTo, next, prev };
}

export function HeroBanner({ node, cssStyle }: HeroBannerProps) {
  const parsed = heroBannerPropsSchema.safeParse(node.props);
  const data: HeroBannerData = parsed.success ? parsed.data : FALLBACK_DATA;

  const containerStyle: CSSProperties = {
    position: "relative",
    height: data.height,
    width: "100%",
    overflow: "hidden",
    backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#ffffff",
    ...cssStyle,
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    zIndex: 1,
  };

  const contentStyle: CSSProperties = {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    height: "100%",
    width: "100%",
    padding: "32px",
    textAlign: "center",
  };

  const ctaStyle: CSSProperties = {
    display: "inline-block",
    padding: "12px 24px",
    background: "#ffffff",
    color: "#0f3a5f",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  };

  // Backwards-compat path: no slideshow images → render today's static hero
  // tree exactly as before. The three pre-existing tests all route here.
  if (data.images.length === 0) {
    return (
      <section data-component-id={node.id} data-component-type="HeroBanner" style={containerStyle}>
        {data.backgroundImage && data.overlay ? (
          <div data-hero-overlay="true" style={overlayStyle} />
        ) : null}
        <div style={contentStyle}>
          <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{data.heading}</h1>
          {data.subheading ? (
            <p style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}>{data.subheading}</p>
          ) : null}
          {data.ctaLabel ? (
            <a href={data.ctaHref} style={ctaStyle}>
              {data.ctaLabel}
            </a>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <SlideshowHero key={data.images.length} data={data} node={node} containerStyle={containerStyle}
      overlayStyle={overlayStyle} contentStyle={contentStyle} ctaStyle={ctaStyle} />
  );
}

type SlideshowHeroProps = {
  data: HeroBannerData;
  node: ComponentNode;
  containerStyle: CSSProperties;
  overlayStyle: CSSProperties;
  contentStyle: CSSProperties;
  ctaStyle: CSSProperties;
};

function SlideshowHero({
  data,
  node,
  containerStyle,
  overlayStyle,
  contentStyle,
  ctaStyle,
}: SlideshowHeroProps) {
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { index, goTo, next, prev } = useSlideshow({
    count: data.images.length,
    autoplay: data.autoplay,
    intervalMs: data.intervalMs,
    loop: data.loop,
    paused: data.pauseOnHover ? paused : false,
    prefersReducedMotion,
  });

  const transition = prefersReducedMotion ? "none" : "opacity 600ms ease-in-out";
  const atFirst = index === 0;
  const atLast = index === data.images.length - 1;
  const arrowDisabledPrev = !data.loop && atFirst;
  const arrowDisabledNext = !data.loop && atLast;

  return (
    <section
      data-component-id={node.id}
      data-component-type="HeroBanner"
      data-slideshow-index={index}
      style={containerStyle}
      onMouseEnter={data.pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={data.pauseOnHover ? () => setPaused(false) : undefined}
    >
      {data.images.map((image, i) => (
        <img
          // biome-ignore lint/suspicious/noArrayIndexKey: slideshow order is the identifier
          key={i}
          data-hero-slide={i}
          src={image.src}
          alt={image.alt ?? ""}
          loading={i === 0 ? "eager" : "lazy"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: i === index ? 1 : 0,
            transition,
            zIndex: 0,
          }}
        />
      ))}
      {data.overlay ? <div data-hero-overlay="true" style={overlayStyle} /> : null}
      <div style={contentStyle}>
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{data.heading}</h1>
        {data.subheading ? (
          <p style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}>{data.subheading}</p>
        ) : null}
        {data.ctaLabel ? (
          <a href={data.ctaHref} style={ctaStyle}>
            {data.ctaLabel}
          </a>
        ) : null}
      </div>
      {data.showArrows && data.images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            data-hero-arrow="prev"
            disabled={arrowDisabledPrev}
            aria-disabled={arrowDisabledPrev || undefined}
            onClick={prev}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              width: 36,
              height: 36,
              borderRadius: "999px",
              border: "none",
              background: "rgba(0, 0, 0, 0.45)",
              color: "#ffffff",
              fontSize: 20,
              cursor: arrowDisabledPrev ? "default" : "pointer",
              opacity: arrowDisabledPrev ? 0.4 : 1,
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            data-hero-arrow="next"
            disabled={arrowDisabledNext}
            aria-disabled={arrowDisabledNext || undefined}
            onClick={next}
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
              width: 36,
              height: 36,
              borderRadius: "999px",
              border: "none",
              background: "rgba(0, 0, 0, 0.45)",
              color: "#ffffff",
              fontSize: 20,
              cursor: arrowDisabledNext ? "default" : "pointer",
              opacity: arrowDisabledNext ? 0.4 : 1,
            }}
          >
            ›
          </button>
        </>
      ) : null}
      {data.showDots && data.images.length > 1 ? (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            zIndex: 3,
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {data.images.map((_image, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: slideshow order is the identifier
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              data-hero-dot={i}
              onClick={() => goTo(i)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "999px",
                border: "none",
                padding: 0,
                background: i === index ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
