import { describe, expect, it } from "vitest";
import { parseAIAction } from "./aiActions";

const now = new Date("2026-08-29T08:00:00+05:00");

const meeting = (input: string) => {
  const action = parseAIAction(input, now);
  expect(action?.type).toBe("createMeeting");
  if (action?.type !== "createMeeting") throw new Error("Expected createMeeting action");
  return action.payload;
};

describe("Uzbek createMeeting title extraction", () => {
  it("uses only the quoted meeting title", () => {
    expect(meeting("Ertaga soat 15:00 ga ‘Google sync test’ uchrashuvini yarat").title).toBe("Google sync test");
  });

  it.each([
    ["Bugun soat 09:30 ga 'Jamoa standup' uchrashuvi qo'y", "Jamoa standup", "09:30"],
    ["Ertaga 14:00 da “Mijoz bilan demo” uchrashuvini rejalashtir", "Mijoz bilan demo", "14:00"],
    ["Dushanba kuni soat 11 da Haftalik reja uchrashuvini yarat", "Haftalik reja", "11:00"],
    ["2026-08-30 soat 16:45 ga Release review meetingni yarat", "Release review", "16:45"],
  ])("cleans Uzbek meeting phrase: %s", (input, title, time) => {
    expect(meeting(input)).toMatchObject({ title, time });
  });
});
