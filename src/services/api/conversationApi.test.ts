import { describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient',()=>({request:vi.fn().mockResolvedValue({items:[],meta:{}})}));
import { request } from './apiClient';
import { listMessages } from './conversationApi';
describe('message API boundary',()=>{
  it('clamps oversized requests and carries the server cursor',async()=>{
    await listMessages('chat',1,200,'message-id');
    expect(request).toHaveBeenLastCalledWith('/conversations/chat/messages?page=1&limit=100&before=message-id');
  });
  it('normalizes invalid sizes without making an invalid API request',async()=>{
    await listMessages('chat',1,NaN);
    expect(request).toHaveBeenLastCalledWith('/conversations/chat/messages?page=1&limit=50');
    await listMessages('chat',1,-5);
    expect(request).toHaveBeenLastCalledWith('/conversations/chat/messages?page=1&limit=1');
  });
});
