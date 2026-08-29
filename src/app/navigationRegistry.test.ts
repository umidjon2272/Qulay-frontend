import { describe, expect, it } from "vitest";
import { getNavigation, navigationRegistry } from "./navigationRegistry";

describe("navigation registry", () => {
  it("builds exactly five mobile primary items with AI in the center", () => {
    const items = getNavigation("mobilePrimary");
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.id)).toEqual(["dashboard", "tasks", "ai", "calendar", "more"]);
  });

  it("keeps finance in More and hides CRM contacts and standalone memory", () => {
    expect(getNavigation("mobileMore").some((item) => item.id === "finance")).toBe(true);
    expect(navigationRegistry.some((item) => item.id === "contacts" || item.id === "memory")).toBe(false);
  });

  it("hides modules when an explicit permission or feature set does not allow them", () => {
    const items = getNavigation("mobileMore", { permissions: new Set(), features: new Set() });
    expect(items.some((item) => item.id === "finance")).toBe(false);
  });

  it("uses the same registry for desktop and mobile", () => {
    expect(getNavigation("desktop").some((item) => item.id === "finance")).toBe(true);
    expect(getNavigation("mobileMore").some((item) => item.id === "finance")).toBe(true);
  });
});
