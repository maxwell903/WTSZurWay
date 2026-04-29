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
};

export function ImageSlide({ slide, index, isFirst, style }: ImageSlideProps) {
  return (
    <img
      data-hero-slide={index}
      src={slide.src}
      alt={slide.alt ?? ""}
      loading={isFirst ? "eager" : "lazy"}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
}
