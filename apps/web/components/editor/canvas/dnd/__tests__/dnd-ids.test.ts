import { describe, expect, it } from "vitest";
import {
  dropZoneId,
  isDropZoneId,
  isNodeId,
  isPaletteId,
  nodeId,
  paletteId,
  parseDropZoneId,
  parseNodeId,
  parsePaletteId,
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
