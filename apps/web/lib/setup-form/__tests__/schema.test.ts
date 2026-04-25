import { describe, expect, it } from "vitest";
import { setupFormSchema } from "../schema";

const minValid = {
  companyName: "Aurora Property Group",
  palette: "ocean" as const,
};

describe("setupFormSchema", () => {
  it("accepts a valid minimum payload", () => {
    const result = setupFormSchema.safeParse(minValid);
    expect(result.success).toBe(true);
  });

  it("rejects missing companyName", () => {
    const result = setupFormSchema.safeParse({ palette: "ocean" });
    expect(result.success).toBe(false);
  });

  it("rejects empty companyName", () => {
    const result = setupFormSchema.safeParse({ ...minValid, companyName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid URL in currentWebsiteUrl", () => {
    const result = setupFormSchema.safeParse({
      ...minValid,
      currentWebsiteUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid URL in currentWebsiteUrl", () => {
    const result = setupFormSchema.safeParse({
      ...minValid,
      currentWebsiteUrl: "https://aurora-cincy.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty string in currentWebsiteUrl", () => {
    const result = setupFormSchema.safeParse({
      ...minValid,
      currentWebsiteUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid palette id", () => {
    const result = setupFormSchema.safeParse({
      ...minValid,
      palette: "lava",
    });
    expect(result.success).toBe(false);
  });

  it("defaults templateStart to 'ai_generate' when omitted", () => {
    const result = setupFormSchema.parse(minValid);
    expect(result.templateStart).toBe("ai_generate");
  });

  it("rejects an invalid templateStart", () => {
    const result = setupFormSchema.safeParse({
      ...minValid,
      templateStart: "wizard",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 inspirationImages", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      name: `img-${i}.png`,
      url: `https://example.com/img-${i}.png`,
    }));
    const result = setupFormSchema.safeParse({ ...minValid, inspirationImages: five });
    expect(result.success).toBe(false);
  });

  it("accepts an empty email and a valid email", () => {
    expect(setupFormSchema.safeParse({ ...minValid, email: "" }).success).toBe(true);
    expect(
      setupFormSchema.safeParse({ ...minValid, email: "owner@aurora-cincy.com" }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = setupFormSchema.safeParse({ ...minValid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("coerces yearsInBusiness from string to non-negative integer", () => {
    const ok = setupFormSchema.safeParse({ ...minValid, yearsInBusiness: "12" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.yearsInBusiness).toBe(12);

    const negative = setupFormSchema.safeParse({ ...minValid, yearsInBusiness: -1 });
    expect(negative.success).toBe(false);
  });
});
