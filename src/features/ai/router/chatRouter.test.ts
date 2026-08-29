import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../../services/api/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/api/apiClient")>();
  return { ...actual, request: vi.fn() };
});

import { request, ApiError } from "../../../services/api/apiClient";
import { routeMessage } from "./chatRouter";
import { executeAIAction } from "../actions/actionExecutor";
import ActionConfirmation from "../components/ActionConfirmation/ActionConfirmation";

const requestMock = request as unknown as Mock;

const peer = (overrides: Partial<{ peerId: string; type: "USER" | "GROUP" | "CHANNEL"; displayName: string; username: string | null }> = {}) => ({
  peerId: "-1001234567890",
  type: "USER" as const,
  displayName: "Aziz Karimov",
  username: "aziz",
  lastActivity: null,
  ...overrides,
});

afterEach(() => {
  requestMock.mockReset();
});

describe("routeMessage — Telegram search", () => {
  it('"Telegramdan Azizni top" calls search_telegram_chats, not the old generic mock reply', async () => {
    requestMock.mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } });

    const reply = await routeMessage("Telegramdan Azizni top");

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [path, options] = requestMock.mock.calls[0];
    expect(path).toBe("/ai/tools/execute");
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.tool).toBe("search_telegram_chats");
    expect(body.input.query).toBe("Aziz");

    expect(reply.text).not.toContain("kimga va nima haqida yozish kerakligini ayting");
    expect(reply.telegramSelection).toEqual({
      mode: "search_result",
      candidates: [{ peerId: "-1001234567890", type: "USER", displayName: "Aziz Karimov", username: "aziz" }],
    });
  });

  it.each([
    "telegraamdan Azizni top",
    "telgramda Azizni qidir",
    "telegrammda Azizni izla",
    "telegrmdan Azizni top",
    "Telegram orqali Azizni top",
  ])('%s tolerates the known Telegram spelling variants', async (message) => {
    requestMock.mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } });

    const reply = await routeMessage(message);

    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("search_telegram_chats");
    expect(body.input.query).toBe("Aziz");
    expect(reply.telegramSelection?.candidates[0]?.peerId).toBe("-1001234567890");
  });

  it('"Telegramda Azizni qidir" also routes to search_telegram_chats', async () => {
    requestMock.mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [], meta: { executedAt: "", requestId: "r1" } });

    await routeMessage("Telegramda Azizni qidir");

    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("search_telegram_chats");
  });

  it("ignores malformed Telegram candidates instead of crashing", async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "search_telegram_chats",
      data: [{ peerId: 123, displayName: "Broken" }, peer()],
      meta: { executedAt: "", requestId: "r1" },
    });

    const reply = await routeMessage("Telegramdan Azizni top");

    expect(reply.telegramSelection?.candidates).toHaveLength(1);
    expect(reply.telegramSelection?.candidates[0]?.peerId).toBe("-1001234567890");
  });

  it("shows a controlled error when Telegram is not connected", async () => {
    requestMock.mockRejectedValueOnce(new ApiError(400, "Telegram account is not connected"));

    const reply = await routeMessage("Telegramdan Azizni top");

    expect(reply.text).toMatch(/ulanmagan/i);
    expect(reply.action).toBeUndefined();
    expect(reply.telegramSelection).toBeUndefined();
  });

  it("reports zero results without throwing", async () => {
    requestMock.mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [], meta: { executedAt: "", requestId: "r1" } });

    const reply = await routeMessage("Telegramdan Notopiladigan ni top");

    expect(reply.text).toMatch(/topilmadi/i);
  });
});

describe("routeMessage — Telegram send", () => {
  it("accepts a Telegram keyword typo in the explicit send form", async () => {
    requestMock
      .mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } })
      .mockResolvedValueOnce({ status: "confirmation_required", tool: "send_telegram_message", preview: { recipient: peer(), text: "Salom", confirmationRequired: true }, meta: { requestId: "r2" } });

    const reply = await routeMessage("telegraam orqali Azizga Salom yubor");

    expect(reply.action?.type).toBe("sendTelegramMessage");
  });

  it('"Azizga salom deb yoz" resolves the recipient and prepares confirmation', async () => {
    requestMock
      .mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } })
      .mockResolvedValueOnce({
        status: "confirmation_required",
        tool: "send_telegram_message",
        preview: { recipient: peer(), text: "salom", confirmationRequired: true },
        meta: { requestId: "r2" },
      });

    const reply = await routeMessage("Azizga salom deb yoz");

    expect(reply.action?.type).toBe("sendTelegramMessage");
    const previewBody = JSON.parse((requestMock.mock.calls[1][1] as RequestInit).body as string);
    expect(previewBody).toMatchObject({
      tool: "send_telegram_message",
      confirmed: false,
      input: { peerId: "-1001234567890", text: "salom" },
    });
  });

  it('"Azizga \'Salom, ishlar yaxshimi?\' deb yoz." resolves the contact then requires confirmation before sending', async () => {
    requestMock
      .mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } })
      .mockResolvedValueOnce({
        status: "confirmation_required",
        tool: "send_telegram_message",
        preview: { recipient: peer(), text: "Salom, ishlar yaxshimi?", confirmationRequired: true },
        meta: { requestId: "r2" },
      });

    const reply = await routeMessage("Azizga 'Salom, ishlar yaxshimi?' deb yoz.");

    expect(requestMock).toHaveBeenCalledTimes(2);

    const searchBody = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(searchBody.tool).toBe("search_telegram_chats");
    expect(searchBody.input.query).toBe("Aziz");

    const sendBody = JSON.parse((requestMock.mock.calls[1][1] as RequestInit).body as string);
    expect(sendBody.tool).toBe("send_telegram_message");
    expect(sendBody.confirmed).toBe(false);
    expect(sendBody.input).toEqual({ peerId: "-1001234567890", text: "Salom, ishlar yaxshimi?" });

    // Never auto-sends: only a confirmation_required preview call was made.
    expect(reply.action?.type).toBe("sendTelegramMessage");
    expect(reply.text).toBe('Aziz Karimovga yuborilsinmi?\n"Salom, ishlar yaxshimi?"');
  });

  it("shows a selection card when the recipient name matches multiple Telegram chats", async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "search_telegram_chats",
      data: [peer({ peerId: "123456789", displayName: "Aziz Karimov" }), peer({ peerId: "-1009876543210", displayName: "Aziz Yusupov", username: "aziz2", type: "CHANNEL" })],
      meta: { executedAt: "", requestId: "r1" },
    });

    const reply = await routeMessage("Azizga 'Salom' deb yoz.");

    expect(reply.action).toBeUndefined();
    expect(reply.telegramSelection?.candidates).toHaveLength(2);
    expect(reply.telegramSelection?.mode).toBe("send_recipient");
    expect(reply.telegramSelection?.pendingText).toBe("Salom");
    // Only the search call happened — no send preview call fired for an unresolved recipient.
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("shows a controlled error when Telegram is not connected on send", async () => {
    requestMock.mockRejectedValueOnce(new ApiError(400, "Telegram account is not connected"));

    const reply = await routeMessage("Azizga 'Salom' deb yoz.");

    expect(reply.text).toMatch(/ulanmagan/i);
  });

  it("maps an expired Telegram session to a reconnect instruction", async () => {
    requestMock
      .mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } })
      .mockRejectedValueOnce(new ApiError(400, "Telegram connection has expired", { message: "Telegram connection has expired" }));

    const reply = await routeMessage("Azizga 'Salom' deb yoz.");

    expect(reply.text).toMatch(/qayta ulang/i);
  });

  it("maps strict tool validation failures to a Telegram-specific message", async () => {
    requestMock
      .mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [peer()], meta: { executedAt: "", requestId: "r1" } })
      .mockRejectedValueOnce(new ApiError(400, "Invalid tool input", { message: "Invalid tool input", errors: ["peerId: must be a string"] }));

    const reply = await routeMessage("Azizga 'Salom' deb yoz.");

    expect(reply.text).toMatch(/ma'lumot formati xato/i);
  });

  it("reports no match without inventing a recipient", async () => {
    requestMock.mockResolvedValueOnce({ status: "success", tool: "search_telegram_chats", data: [], meta: { executedAt: "", requestId: "r1" } });

    const reply = await routeMessage("Notopiladiganga 'Salom' deb yoz.");

    expect(reply.text).toMatch(/topilmadi/i);
    expect(reply.action).toBeUndefined();
  });
});

describe("confirm / cancel semantics", () => {
  it("confirming a sendTelegramMessage action calls send_telegram_message with confirmed:true", async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "send_telegram_message",
      data: { messageId: "msg-1", recipient: peer() },
      meta: { executedAt: "", requestId: "r3" },
    });

    const result = await executeAIAction({
      type: "sendTelegramMessage",
      payload: { peerId: "-1001234567890", recipientName: "Aziz Karimov", recipientUsername: "aziz", text: "Salom" },
      label: "Telegram xabari",
      confirmationMessage: 'Aziz Karimovga yuborilsinmi?\n"Salom"',
      success: "✅ Aziz Karimovga xabar yuborildi.",
      error: "Telegram xabarini yuborishda xatolik bo'ldi.",
    });

    expect(result.success).toBe(true);
    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("send_telegram_message");
    expect(body.confirmed).toBe(true);
    expect(body.input).toEqual({ peerId: "-1001234567890", text: "Salom" });
    expect(Object.keys(body.input).sort()).toEqual(["peerId", "text"]);
  });

  it('clicking "Bekor qilish" never invokes onConfirm, so no send request is made', () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    render(
      ActionConfirmation({
        action: {
          type: "sendTelegramMessage",
          payload: { peerId: "-1001234567890", recipientName: "Aziz Karimov", text: "Salom" },
          label: "Telegram xabari",
          confirmationMessage: 'Aziz Karimovga yuborilsinmi?\n"Salom"',
          success: "✅ Aziz Karimovga xabar yuborildi.",
          error: "Telegram xabarini yuborishda xatolik bo'ldi.",
        },
        status: "pending",
        onConfirm,
        onDismiss,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Bekor qilish/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });
});


describe("routeMessage — Google tools", () => {
  it('"Bugungi uchrashuvlar" also reads connected Google Calendar events', async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "get_google_calendar_events",
      data: [{ id: "g1", title: "Google event", start: "2026-08-29T10:00:00.000Z", end: "2026-08-29T11:00:00.000Z" }],
      meta: { executedAt: "", requestId: "g0" },
    });

    const reply = await routeMessage("Bugungi uchrashuvlar");
    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("get_google_calendar_events");
    expect(reply.text).toContain("Google event");
  });

  it('"Bugungi Google Calendar uchrashuvlarimni ko‘rsat" calls get_google_calendar_events', async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "get_google_calendar_events",
      data: [{ id: "g1", title: "Aziz bilan uchrashuv", start: "2026-08-29T12:00:00.000Z", end: "2026-08-29T13:00:00.000Z", location: "Ofis" }],
      meta: { executedAt: "", requestId: "g1" },
    });

    const reply = await routeMessage("Bugungi Google Calendar uchrashuvlarimni ko‘rsat");

    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("get_google_calendar_events");
    expect(body.confirmed).toBe(true);
    expect(typeof body.input.from).toBe("string");
    expect(typeof body.input.to).toBe("string");
    expect(reply.text).toContain("Aziz bilan uchrashuv");
  });

  it('"Drive’dan shartnoma faylini top" calls search_google_drive_files', async () => {
    requestMock.mockResolvedValueOnce({
      status: "success",
      tool: "search_google_drive_files",
      data: { items: [{ id: "f1", name: "Shartnoma 2026.pdf", mimeType: "application/pdf", modifiedTime: null, webViewLink: null }], nextPageToken: null },
      meta: { executedAt: "", requestId: "g2" },
    });

    const reply = await routeMessage("Drive’dan shartnoma faylini top");

    const body = JSON.parse((requestMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool).toBe("search_google_drive_files");
    expect(body.input).toEqual({ query: "shartnoma", limit: 10 });
    expect(reply.text).toContain("Shartnoma 2026.pdf");
  });
});


describe("old mock response does not intercept other intents", () => {
  it('"Bugun soat 15:00 ga test uchrashuv yarat" maps to createMeeting', async () => {
    const reply = await routeMessage("Bugun soat 15:00 ga test uchrashuv yarat");
    expect(reply.action?.type).toBe("createMeeting");
    if (reply.action?.type !== "createMeeting") throw new Error("Expected createMeeting action");
    expect(reply.action.payload.time).toBe("15:00");
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('"Ertaga soat 11 da Aziz bilan uchrashuv qo\'y" still maps to the createMeeting action', async () => {
    const reply = await routeMessage("Ertaga soat 11 da Aziz bilan uchrashuv qo'y");
    expect(reply.action?.type).toBe("createMeeting");
    expect(requestMock).not.toHaveBeenCalled();
  });
});
