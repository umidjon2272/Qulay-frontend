/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("mobile responsive layout contracts", () => {
  it("keeps the More sheet above the dock with safe scrolling and compact breakpoints", () => {
    const css = source("src/components/Sidebar/Sidebar.scss");
    expect(css).toContain("max-height: 85dvh");
    expect(css).toContain(".sidebar--more-open .sidebar__mobile-dock");
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toMatch(/\.mobile-more__chevron\s*\{[^}]*flex:\s*0 0 auto/s);
  });

  it("uses seven shrink-safe calendar columns and bounded mobile layers", () => {
    const css = source("src/pages/Calendar/Calendar.scss");
    expect(css).toContain("grid-template-columns: repeat(7, minmax(0, 1fr))");
    expect(css).toMatch(/body #root \.calendar-page,[\s\S]*?max-width:\s*100%/);
    expect(css).toMatch(/body #root \.calendar-day\s*\{[\s\S]*?aspect-ratio:\s*1/);
  });
});
