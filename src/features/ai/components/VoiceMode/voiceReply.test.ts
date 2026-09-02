import { describe, expect, it } from 'vitest';
import { voiceReplyKey } from './voiceReply';
import type { ChatMessage } from '../../context/AIChatContextValue';
describe('spoken response identity', () => {
  const message:ChatMessage={id:42,role:'ai',text:'Tasdiqlaysizmi?',time:'10:00',actionStatus:'pending'};
  it('reads the final card result even though its ID stays the same', () => {
    expect(voiceReplyKey({...message,actionStatus:'success',actionResult:'500 000 so‘m qo‘shildi.'})).not.toBe(voiceReplyKey(message));
  });
  it('does not speak loading cards, local transport errors, welcome or user messages', () => {
    for (const value of [{...message,actionStatus:'loading' as const},{...message,isError:true},{...message,id:0},{...message,role:'user' as const}]) expect(voiceReplyKey(value)).toBe('');
  });
});
