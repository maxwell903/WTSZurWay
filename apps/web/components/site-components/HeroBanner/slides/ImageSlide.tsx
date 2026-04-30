"use client";

import type { CSSProperties } from "react";
import type { ImageSlide as ImageSlideData } from "../schema";

export type ImageSlideProps = {
  slide: ImageSlideData;
  index: number;
  isFirst: boolean;
  // Wave 2: ImageSlide renders only the <img>; the transition layer is
  // responsible for opacity / position. Style overrides come from the
  // transition's `baseStyle`.
  style?: CSSProperties;
  // "contain" preserves aspect ratio so the parent panel's background can
  // show through any slack. Used by SplitLayout when the user picks
  // splitMediaFit: "contain". Default keeps the v1 cover behaviour.
  mediaFit?: "cover" | "contain";
};

export function ImageSlide({ slide, index, isFirst, style, mediaFit = "cover" }: ImageSlideProps) {
  // Editor produces transient `src: ""` slides; mirror VideoSlide's empty-poster placeholder.
  if (!slide.src) {
    return (
      <div
        data-hero-slide={index}
        data-hero-slide-kind="image-empty"
        style={{ width: "100%", height: "100%", background: "#000000", ...style }}
      />
    );
  }
  return (
    <img
      data-hero-slide={index}
      src={slide.src}
      alt={slide.alt ?? ""}
      loading={isFirst ? "eager" : "lazy"}
      style={{
        width: "100%",
        height: "100%",
        objectFit: mediaFit,
        objectPosition: "center",
        ...style,
      }}
    />
  );
}
