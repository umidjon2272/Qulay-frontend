import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAIReplyMock = vi.fn();
const buildConfirmationMock = vi.fn();
vi.mock("../../../services/api/conversationApi", () => ({
  listConversations: vi.fn().mockResolvedValue({ items: [] }),
  createConversation: vi.fn().mockResolvedValue({ id: "new-chat", title: "New" }),
  addMessage: vi.fn().mockResolvedValue({}),
  listMessages: vi.fn().mockResolvedValue({ items: [], meta: { hasMore: false, nextCursor: null } }),
  updateConversation: vi.fn(), deleteConversation: vi.fn(),
}));
vi.mock('../../../services/api/agentApi', () => ({ agentApi: { listActions: vi.fn().mockResolvedValue({ items: [] }) } }));

vi.mock("../../../services/aiService", () => ({
  getAIReply: (...args: unknown[]) => getAIReplyMock(...args),
}));
vi.mock("../router/chatRouter", () => ({
  buildTelegramSendConfirmation: (...args: unknown[]) => buildConfirmationMock(...args),
}));

import { AIChatProvider } from "./AIChatContext";
import { useAIChat } from "../hooks/useAIChat";
import { listMessages } from '../../../services/api/conversationApi';

const candidate = {
  peerId: "90071992547409931234",
  type: "USER" as const,
  displayName: "Aziz",
  username: "umidwwu",
};

const Harness = () => {
  const { messages, sendMessage, activeConversationId, historyLoading, historyError, loadConversation, loadOlderMessages, hasOlderMessages } = useAIChat();
  return <>
    <button onClick={() => sendMessage("Azizga Salom deb yoz")}>start</button>
    <button onClick={() => sendMessage("1 chisini")}>select first</button>
    <span data-testid="conversation">{activeConversationId}</span>
    <span data-testid="loading">{String(historyLoading)}</span>
    <span data-testid="history-error">{historyError}</span>
    <span data-testid="has-older">{String(hasOlderMessages)}</span>
    <button onClick={() => void loadConversation('chat-a')}>load a</button>
    <button onClick={() => void loadConversation('chat-b')}>load b</button>
    <button onClick={() => void loadOlderMessages()}>older</button>
    <pre data-testid="messages">{JSON.stringify(messages)}</pre>
  </>;
};

describe("AIChatProvider Telegram pending selection", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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


describe("chat continuity and account isolation", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); getAIReplyMock.mockReset().mockResolvedValue({ text: "Javob", conversationId: "chat-a", serverPersisted: true }); });
  const seed = (owner = "user-a") => {
    localStorage.setItem("yechim_ai_auth_user", JSON.stringify({ id: "user-a" }));
    localStorage.setItem("yechim_ai_chat_history", JSON.stringify({
      userId: owner, conversationId: "chat-a",
      messages: [{ id: 1, role: "ai", text: "Akmal sherigingiz", time: "10:00" }],
    }));
  };
  it("continues the same backend conversation after reloading", async () => {
    seed();
    render(<AIChatProvider><Harness /></AIChatProvider>);
    expect(screen.getByTestId("messages")).toHaveTextContent("Akmal sherigingiz");
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    await waitFor(() => expect(getAIReplyMock).toHaveBeenCalledWith("Azizga Salom deb yoz", expect.objectContaining({ conversationId: "chat-a" })));
  });
  it("never restores a cached conversation owned by another account", () => {
    seed("user-b");
    render(<AIChatProvider><Harness /></AIChatProvider>);
    expect(screen.getByTestId("messages")).not.toHaveTextContent("Akmal sherigingiz");
    expect(screen.getByTestId("conversation")).toBeEmptyDOMElement();
  });
});

describe('server history pagination', () => {
  const row = (id: string) => ({ id, role: 'ASSISTANT' as const, content: `message-${id}`, conversationId: 'chat-a', createdAt: '2026-09-01T10:00:00Z' });
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.mocked(listMessages).mockReset(); });
  it('loads pages without a welcome message and deduplicates IDs', async () => {
    vi.mocked(listMessages).mockResolvedValueOnce({ items: [row('2'), row('3')], meta: { page: 1, limit: 50, total: 3, totalPages: 1, hasMore: true, nextCursor: '2' } });
    render(<AIChatProvider><Harness /></AIChatProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'load a' }));
    await waitFor(() => expect(screen.getByTestId('messages')).toHaveTextContent('message-3'));
    expect(listMessages).toHaveBeenCalledWith('chat-a', 1, 50);
    expect(screen.getByTestId('messages')).not.toHaveTextContent('Assalomu');
    vi.mocked(listMessages).mockResolvedValueOnce({ items: [row('1'), row('2')], meta: { page: 1, limit: 50, total: 2, totalPages: 1, hasMore: false, nextCursor: null } });
    fireEvent.click(screen.getByRole('button', { name: 'older' }));
    await waitFor(() => expect(screen.getByTestId('messages')).toHaveTextContent('message-1'));
    const messages = JSON.parse(screen.getByTestId('messages').textContent!);
    expect(messages.map((m: { serverId: string }) => m.serverId)).toEqual(['1','2','3']);
    expect(screen.getByTestId('has-older')).toHaveTextContent('false');
  });
  it('shows transport errors separately instead of forging an AI reply', async () => {
    vi.mocked(listMessages).mockRejectedValueOnce(new Error('limit must not be greater than 100'));
    render(<AIChatProvider><Harness /></AIChatProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'load a' }));
    await waitFor(() => expect(screen.getByTestId('history-error')).toHaveTextContent('Suhbat tarixi yuklanmadi'));
    expect(screen.getByTestId('messages')).not.toHaveTextContent('limit must');
  });
  it('ignores a late response from a previously selected conversation', async () => {
    let finishA!: (value: Awaited<ReturnType<typeof listMessages>>) => void;
    vi.mocked(listMessages).mockImplementationOnce(() => new Promise(resolve => { finishA = resolve; }));
    vi.mocked(listMessages).mockResolvedValueOnce({ items: [row('b')], meta: { page: 1, limit: 50, total: 1, totalPages: 1, hasMore: false } });
    render(<AIChatProvider><Harness /></AIChatProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'load a' }));
    fireEvent.click(screen.getByRole('button', { name: 'load b' }));
    await waitFor(() => expect(screen.getByTestId('messages')).toHaveTextContent('message-b'));
    finishA({ items: [row('a')], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } });
    await waitFor(() => expect(screen.getByTestId('conversation')).toHaveTextContent('chat-b'));
    expect(screen.getByTestId('messages')).not.toHaveTextContent('message-a');
  });
});
