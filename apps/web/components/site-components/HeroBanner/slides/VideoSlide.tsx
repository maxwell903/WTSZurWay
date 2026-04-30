"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import type { VideoSlide as VideoSlideData } from "../schema";

export type VideoSlideProps = {
  slide: VideoSlideData;
  index: number;
  prefersReducedMotion: boolean;
  // Called once the video's loadedmetadata event fires. The layout uses
  // this to extend the slideshow's dwell to max(intervalMs, durationMs).
  onDurationKnown?: (durationMs: number) => void;
  style?: CSSProperties;
  // "contain" preserves the video's aspect ratio so the parent panel's
  // background paints any slack. Default "cover" matches v1 behaviour.
  mediaFit?: "cover" | "contain";
};

// Per spec: implicit `muted`, `playsinline`, `loop`. Codec preference:
// webm if `videoSrcWebm` is provided, otherwise mp4. Reduced motion: do
// NOT autoplay; the poster acts as the visual fallback.
export function VideoSlide({
  slide,
  index,
  prefersReducedMotion,
  onDurationKnown,
  style,
  mediaFit = "cover",
}: VideoSlideProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !onDurationKnown) return;
    const onMeta = () => {
      const seconds = el.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        onDurationKnown(seconds * 1000);
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    // If metadata is already loaded (cached video), fire immediately.
    if (el.readyState >= 1) onMeta();
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [onDurationKnown]);

  const fitStyle: CSSProperties = { objectFit: mediaFit, objectPosition: "center" };

  if (prefersReducedMotion) {
    // Reduced motion: render only the poster as a static image.
    return slide.videoPoster ? (
      <img
        data-hero-slide={index}
        data-hero-slide-kind="video-poster"
        src={slide.videoPoster}
        alt={slide.alt ?? ""}
        style={{ ...fitStyle, ...style }}
      />
    ) : (
      <div
        data-hero-slide={index}
        data-hero-slide-kind="video-poster-empty"
        style={{ ...style, background: "#000000" }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      data-hero-slide={index}
      data-hero-slide-kind="video"
      muted
      playsInline
      loop
      autoPlay
      poster={slide.videoPoster}
      style={{ ...fitStyle, ...style }}
    >
      {slide.videoSrcWebm ? <source src={slide.videoSrcWebm} type="video/webm" /> : null}
      <source src={slide.videoSrc} type="video/mp4" />
      {slide.alt ?? ""}
    </video>
  );
}
