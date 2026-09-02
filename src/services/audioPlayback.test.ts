import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('voice audio lifecycle', () => {
  let source: {buffer:unknown; connect:ReturnType<typeof vi.fn>; disconnect:ReturnType<typeof vi.fn>; start:ReturnType<typeof vi.fn>; stop:ReturnType<typeof vi.fn>; onended:(()=>void)|null};
  let context: {state:string; resume:ReturnType<typeof vi.fn>; destination:object; decodeAudioData:ReturnType<typeof vi.fn>; createBufferSource:ReturnType<typeof vi.fn>};
  beforeEach(() => {
    vi.resetModules();
    source={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};
    context={state:'suspended',resume:vi.fn(async () => {context.state='running';}),destination:{},decodeAudioData:vi.fn().mockResolvedValue({}),createBufferSource:vi.fn(()=>source)};
    vi.stubGlobal('AudioContext',class { constructor() { return context; } });
  });
  it('unlocks once before asynchronous playback and releases the buffer source on abort', async () => {
    const audio=await import('./audioPlayback');
    await audio.prepareAudioPlayback(); await audio.prepareAudioPlayback();
    expect(context.resume).toHaveBeenCalledTimes(1);
    const controller=new AbortController();
    const playing=audio.playVoiceAudio('AA==',controller.signal);
    await vi.waitFor(()=>expect(source.start).toHaveBeenCalledTimes(1));
    controller.abort(); await playing;
    expect(source.stop).toHaveBeenCalledTimes(1);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });
  it('never plays a late decoded answer after the chat/voice session was closed', async () => {
    const audio=await import('./audioPlayback'); await audio.prepareAudioPlayback();
    let decode!: (value:object)=>void;
    context.decodeAudioData.mockImplementation(()=>new Promise(resolve=>{decode=resolve;}));
    const controller=new AbortController(); const playing=audio.playVoiceAudio('AA==',controller.signal);
    controller.abort(); decode({}); await playing;
    expect(source.start).not.toHaveBeenCalled();
  });
  it('surfaces playback errors instead of claiming speech completed', async () => {
    const audio=await import('./audioPlayback'); await audio.prepareAudioPlayback();
    source.start.mockImplementation(()=>{throw new Error('device unavailable');});
    await expect(audio.playVoiceAudio('AA==',new AbortController().signal)).rejects.toThrow('device unavailable');
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });
});
