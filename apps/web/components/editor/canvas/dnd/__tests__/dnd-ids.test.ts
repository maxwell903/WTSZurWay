import { describe, expect, it } from "vitest";
import {
  dropZoneId,
  isDropZoneId,
  isNodeId,
  isPaletteId,
  isSideId,
  nodeId,
  paletteId,
  parseDropZoneId,
  parseNodeId,
  parsePaletteId,
  parseSideId,
  sideId,
} from "../dnd-ids";

describe("dnd-id constructors", () => {
  it("paletteId formats as 'palette:${type}'", () => {
    expect(paletteId("Heading")).toBe("palette:Heading");
    expect(paletteId("Section")).toBe("palette:Section");
  });
  it("nodeId formats as 'node:${id}'", () => {
    expect(nodeId("cmp_x")).toBe("node:cmp_x");
  });
  it("dropZoneId formats as 'dropzone:${id}'", () => {
    expect(dropZoneId("cmp_x")).toBe("dropzone:cmp_x");
  });
});

describe("isPaletteId", () => {
  it("returns true for a real component type", () => {
    expect(isPaletteId("palette:Heading")).toBe(true);
    expect(isPaletteId("palette:UnitCard")).toBe(true);
  });
  it("returns false for an unknown component type", () => {
    expect(isPaletteId("palette:Bogus")).toBe(false);
  });
  it("returns false for missing prefix or wrong shape", () => {
    expect(isPaletteId("Heading")).toBe(false);
    expect(isPaletteId("node:cmp_x")).toBe(false);
    expect(isPaletteId("palette:")).toBe(false);
  });
  it("returns false for non-strings", () => {
    expect(isPaletteId(42)).toBe(false);
    expect(isPaletteId(undefined)).toBe(false);
    expect(isPaletteId(null)).toBe(false);
  });
});

describe("isNodeId", () => {
  it("returns true for a non-empty node id", () => {
    expect(isNodeId("node:cmp_a1")).toBe(true);
  });
  it("returns false for missing tail or wrong prefix", () => {
    expect(isNodeId("node:")).toBe(false);
    expect(isNodeId("palette:Heading")).toBe(false);
    expect(isNodeId("dropzone:cmp_x")).toBe(false);
  });
  it("returns false for non-strings", () => {
    expect(isNodeId(42)).toBe(false);
  });
});

describe("isDropZoneId", () => {
  it("returns true for a non-empty dropzone id", () => {
    expect(isDropZoneId("dropzone:cmp_a1")).toBe(true);
  });
  it("returns false for missing tail or wrong prefix", () => {
    expect(isDropZoneId("dropzone:")).toBe(false);
    expect(isDropZoneId("node:cmp_x")).toBe(false);
  });
  it("returns false for non-strings", () => {
    expect(isDropZoneId(undefined)).toBe(false);
  });
});

describe("parse round-trips", () => {
  it("parsePaletteId(paletteId(t)) === t", () => {
    expect(parsePaletteId(paletteId("Image"))).toBe("Image");
    expect(parsePaletteId(paletteId("Form"))).toBe("Form");
  });
  it("parseNodeId(nodeId(id)) === id", () => {
    expect(parseNodeId(nodeId("cmp_x"))).toBe("cmp_x");
  });
  it("parseDropZoneId(dropZoneId(id)) === id", () => {
    expect(parseDropZoneId(dropZoneId("cmp_x"))).toBe("cmp_x");
  });
});

describe("parse rejection of malformed input", () => {
  it("parsePaletteId returns null for malformed strings and non-strings", () => {
    expect(parsePaletteId("palette:Bogus")).toBeNull();
    expect(parsePaletteId("Heading")).toBeNull();
    expect(parsePaletteId("palette:")).toBeNull();
    expect(parsePaletteId(42)).toBeNull();
    expect(parsePaletteId(undefined)).toBeNull();
  });
  it("parseNodeId returns null for malformed strings and non-strings", () => {
    expect(parseNodeId("node:")).toBeNull();
    expect(parseNodeId("palette:Heading")).toBeNull();
    expect(parseNodeId(undefined)).toBeNull();
  });
  it("parseDropZoneId returns null for malformed strings and non-strings", () => {
    expect(parseDropZoneId("dropzone:")).toBeNull();
    expect(parseDropZoneId("node:cmp_x")).toBeNull();
    expect(parseDropZoneId(null)).toBeNull();
  });
});

describe("side dropzone ids", () => {
  it("constructs and parses a right-side id", () => {
    const id = sideId("cmp_x", "right");
    expect(id).toBe("side:cmp_x:right");
    expect(isSideId(id)).toBe(true);
    expect(parseSideId(id)).toEqual({ targetId: "cmp_x", side: "right" });
  });

  it("constructs and parses left/top/bottom ids", () => {
    expect(parseSideId(sideId("cmp_y", "left"))).toEqual({ targetId: "cmp_y", side: "left" });
    expect(parseSideId(sideId("cmp_y", "top"))).toEqual({ targetId: "cmp_y", side: "top" });
    expect(parseSideId(sideId("cmp_y", "bottom"))).toEqual({ targetId: "cmp_y", side: "bottom" });
  });

  it("rejects malformed side ids", () => {
    expect(isSideId("side:cmp_x:diagonal")).toBe(false);
    expect(parseSideId("side:cmp_x:diagonal")).toBeNull();
    expect(parseSideId("between:cmp_x:0")).toBeNull();
    expect(parseSideId("node:cmp_x")).toBeNull();
    expect(parseSideId("side:")).toBeNull();
  });
});
