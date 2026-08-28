import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TelegramSelectionCard from "./TelegramSelection";

const candidate = { peerId: "90071992547409931234", type: "USER" as const, displayName: "Aziz", username: "umidwwu" };

describe("TelegramSelectionCard", () => {
  it.each(["search_result", "send_recipient"] as const)("makes %s candidates clickable without sending", (mode) => {
    const onSelect = vi.fn();
    render(<TelegramSelectionCard selection={{ mode, pendingText: mode === "send_recipient" ? "Salom" : undefined, candidates: [candidate] }} onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: /Aziz.*umidwwu.*tanlash/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(candidate);
    expect(onSelect.mock.calls[0][0].peerId).toBe("90071992547409931234");
    expect(button).toBeDisabled();
  });
});
