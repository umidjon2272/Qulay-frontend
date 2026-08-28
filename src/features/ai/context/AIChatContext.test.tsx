import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAIReplyMock = vi.fn();
const buildConfirmationMock = vi.fn();

vi.mock("../../../services/aiService", () => ({
  getAIReply: (...args: unknown[]) => getAIReplyMock(...args),
}));
vi.mock("../router/chatRouter", () => ({
  buildTelegramSendConfirmation: (...args: unknown[]) => buildConfirmationMock(...args),
}));

import { AIChatProvider } from "./AIChatContext";
import { useAIChat } from "../hooks/useAIChat";

const candidate = {
  peerId: "90071992547409931234",
  type: "USER" as const,
  displayName: "Aziz",
  username: "umidwwu",
};

const Harness = () => {
  const { messages, sendMessage } = useAIChat();
  return <>
    <button onClick={() => sendMessage("Azizga Salom deb yoz")}>start</button>
    <button onClick={() => sendMessage("1 chisini")}>select first</button>
    <pre data-testid="messages">{JSON.stringify(messages)}</pre>
  </>;
};

describe("AIChatProvider Telegram pending selection", () => {
  beforeEach(() => {
    localStorage.clear();
    getAIReplyMock.mockReset().mockResolvedValue({
      text: "Bir nechta natija topildi.",
      telegramSelection: { mode: "send_recipient", pendingText: "Salom", candidates: [candidate] },
    });
    buildConfirmationMock.mockReset().mockResolvedValue({
      text: 'Azizga yuborilsinmi?\n"Salom"',
      action: {
        type: "sendTelegramMessage",
        payload: { peerId: candidate.peerId, recipientName: "Aziz", recipientUsername: "umidwwu", text: "Salom" },
        label: "Telegram xabari", confirmationMessage: "Tasdiqlansinmi?", success: "Yuborildi", error: "Xato",
      },
    });
  });

  it("resolves text selection before normal routing and still requires confirmation", async () => {
    render(<AIChatProvider><Harness /></AIChatProvider>);
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    await waitFor(() => expect(screen.getByTestId("messages")).toHaveTextContent("send_recipient"));

    fireEvent.click(screen.getByRole("button", { name: "select first" }));
    await waitFor(() => expect(buildConfirmationMock).toHaveBeenCalledWith(candidate, "Salom"));

    expect(getAIReplyMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("messages")).toHaveTextContent("90071992547409931234");
    expect(screen.getByTestId("messages")).toHaveTextContent("sendTelegramMessage");
    expect(screen.getByTestId("messages")).not.toHaveTextContent("Tushundim");
  });
});
