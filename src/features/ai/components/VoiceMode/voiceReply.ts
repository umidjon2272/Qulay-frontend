import type { ChatMessage } from '../../context/AIChatContextValue';

/** A confirmed card keeps its message ID but receives NEW content to read aloud. */
export const voiceReplyKey = (message?: ChatMessage) => {
  if (!message || message.id === 0 || message.role !== 'ai' || message.isError || message.actionStatus === 'loading') return '';
  return `${message.id}:${message.actionStatus ?? ''}:${message.actionResult ?? message.text}`;
};
