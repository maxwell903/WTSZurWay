// Back-compat re-export. The HeroBanner EditPanel is now composed in
// `edit-panel/index.tsx` from per-section files; existing imports of
// `HeroBannerEditPanel` from this path continue to work.
export { HeroBannerEditPanel, type HeroBannerEditPanelProps } from "./edit-panel";
