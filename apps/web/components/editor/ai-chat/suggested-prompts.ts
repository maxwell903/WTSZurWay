/**
 * Per-component-type suggested-prompt chips for the right-sidebar chat.
 * Each entry is a 3-4 item list rendered next to the composer; clicking a
 * chip prefills the input. The whole-page fallback is used when nothing is
 * selected.
 *
 * The Sprint Completion Report cites this file's full contents as the
 * mapping table shipped for Sprint 11; future sprints can extend it without
 * touching the chat composition.
 */

import type { ComponentNode, ComponentType } from "@/lib/site-config";

export const WHOLE_PAGE_SUGGESTIONS: readonly string[] = [
  "Add a section about us",
  "Change the color palette",
  "Add a contact form",
];

export const SUGGESTIONS_BY_TYPE: Record<ComponentType, readonly string[]> = {
  Section: ["Add a heading", "Increase the section padding", "Change the background color"],
  Row: ["Add a column", "Center the content", "Adjust the spacing"],
  Column: ["Set the width", "Add a heading", "Add a button"],
  Heading: ["Make the headline say something else", "Make this larger", "Change the heading level"],
  Paragraph: ["Rewrite this", "Make it shorter", "Bind to a data field"],
  Button: [
    "Change the label",
    "Change the link",
    "Switch to a detail-page link",
    "Use the secondary style",
  ],
  Image: ["Replace the image", "Make this taller", "Add a border radius"],
  Logo: ["Use the secondary logo", "Change the alignment"],
  Spacer: ["Make it taller", "Make it shorter"],
  Divider: ["Make it thicker", "Change the color"],
  NavBar: ["Make the navbar sticky", "Add a Contact link", "Move the logo to the center"],
  Footer: ["Add a column to the footer", "Update the copyright text", "Add social links"],
  HeroBanner: [
    "Make this taller",
    "Change the headline",
    "Add a CTA",
    "Replace the background image",
  ],
  PropertyCard: ["Show the address", "Add a View units button", "Change the image style"],
  UnitCard: ["Show square footage", "Add a View unit button", "Hide the price"],
  Repeater: ["Filter to 2-bedroom units", "Sort by rent ascending", "Connect a search input"],
  InputField: ["Make this required", "Pre-fill from a query parameter", "Change the label"],
  Form: ["Add an email field", "Change the submit button label", "Rename the form"],
  MapEmbed: ["Recenter the map", "Change the zoom"],
  Gallery: ["Add a row of images", "Use a 4-column layout"],
};

export function suggestionsForSelection(node: ComponentNode | null): string[] {
  if (!node) return [...WHOLE_PAGE_SUGGESTIONS];
  return [...SUGGESTIONS_BY_TYPE[node.type]];
}
