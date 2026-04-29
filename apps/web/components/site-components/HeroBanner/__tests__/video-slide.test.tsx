import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoSlide } from "../slides/VideoSlide";

describe("<VideoSlide>", () => {
  it("renders a <video> with autoplay/muted/loop/playsinline + poster + ordered <source>s (webm before mp4)", () => {
    const { container } = render(
      <VideoSlide
        slide={{
          kind: "video",
          videoSrc: "https://x/clip.mp4",
          videoSrcWebm: "https://x/clip.webm",
          videoPoster: "https://x/poster.png",
        }}
        index={0}
        prefersReducedMotion={false}
      />,
    );
    const video = container.querySelector("video[data-hero-slide]") as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.getAttribute("poster")).toBe("https://x/poster.png");
    const sources = video.querySelectorAll("source");
    expect(sources.length).toBe(2);
    expect(sources[0]?.getAttribute("src")).toBe("https://x/clip.webm");
    expect(sources[0]?.getAttribute("type")).toBe("video/webm");
    expect(sources[1]?.getAttribute("src")).toBe("https://x/clip.mp4");
    expect(sources[1]?.getAttribute("type")).toBe("video/mp4");
  });

  it("omits the webm <source> when videoSrcWebm is not provided", () => {
    const { container } = render(
      <VideoSlide
        slide={{
          kind: "video",
          videoSrc: "https://x/only.mp4",
        }}
        index={0}
        prefersReducedMotion={false}
      />,
    );
    const sources = container.querySelectorAll("video > source");
    expect(sources.length).toBe(1);
    expect(sources[0]?.getAttribute("type")).toBe("video/mp4");
  });

  it("under prefers-reduced-motion: renders the poster as an <img> (no video, no autoplay)", () => {
    const { container } = render(
      <VideoSlide
        slide={{
          kind: "video",
          videoSrc: "https://x/clip.mp4",
          videoPoster: "https://x/poster.png",
          alt: "fallback alt",
        }}
        index={0}
        prefersReducedMotion={true}
      />,
    );
    expect(container.querySelector("video")).toBeNull();
    const img = container.querySelector("img[data-hero-slide]") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://x/poster.png");
    expect(img.getAttribute("data-hero-slide-kind")).toBe("video-poster");
  });

  it("under prefers-reduced-motion with no poster: renders a black placeholder div", () => {
    const { container } = render(
      <VideoSlide
        slide={{
          kind: "video",
          videoSrc: "https://x/clip.mp4",
        }}
        index={1}
        prefersReducedMotion={true}
      />,
    );
    const div = container.querySelector(
      "[data-hero-slide-kind='video-poster-empty']",
    ) as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.style.background).toBe("rgb(0, 0, 0)");
  });

  it("fires onDurationKnown(ms) when the loadedmetadata event fires", () => {
    const onDurationKnown = vi.fn();
    const { container } = render(
      <VideoSlide
        slide={{
          kind: "video",
          videoSrc: "https://x/clip.mp4",
        }}
        index={0}
        prefersReducedMotion={false}
        onDurationKnown={onDurationKnown}
      />,
    );
    const video = container.querySelector("video") as HTMLVideoElement;
    // jsdom doesn't load the video — fake the duration property + dispatch the event.
    Object.defineProperty(video, "duration", { value: 12.5, configurable: true });
    fireEvent(video, new Event("loadedmetadata"));
    expect(onDurationKnown).toHaveBeenCalledWith(12500);
  });
});

describe("<VideoSlide> + useSlideshow dwell gating", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Verifies that when a video reports a duration longer than intervalMs,
  // the slideshow's next tick uses Math.max(intervalMs, durationMs).
  // Drives this via the HeroBanner end-to-end since the gating lives
  // inside useHeroSlideshow.
  it("a 10-second video keeps the slide active for at least 10s even when intervalMs is 1s", async () => {
    const { HeroBanner } = await import("../index");
    const node = {
      id: "cmp_v",
      type: "HeroBanner" as const,
      style: {},
      props: {
        heading: "X",
        autoplay: true,
        intervalMs: 1000,
        loop: true,
        images: [
          {
            kind: "video",
            videoSrc: "https://x/long.mp4",
          },
          { kind: "image", src: "https://x/2.png", alt: "2" },
        ],
      },
    };
    const { container } = render(<HeroBanner node={node} cssStyle={{}} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 10, configurable: true });
    fireEvent(video, new Event("loadedmetadata"));

    // Advance 5 seconds — way past intervalMs (1s), but well short of the
    // 10s video. The slide should NOT advance.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const root = container.querySelector("[data-component-type='HeroBanner']") as HTMLElement;
    expect(root.getAttribute("data-slideshow-index")).toBe("0");

    // Advance to t=10500 — past the 10s mark (advance fires at the t=10000
    // tick) but before the next intervalMs cycle on the new slide. Index
    // should be 1.
    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(root.getAttribute("data-slideshow-index")).toBe("1");
  });
});
