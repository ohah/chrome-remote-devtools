import { useEffect, useMemo, useRef, useState } from 'react';
import { SERVER_URL } from '@/shared/lib';
import type { eventWithTime } from '@rrweb/types';
import type rrwebPlayer from 'rrweb-player';
import type { RRwebPlayerOptions } from 'rrweb-player';

interface RrwebReplayPanelProps {
  clientId: string;
}

interface StreamState {
  status: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
  lastError?: string;
}

function hasFullSnapshot(list: eventWithTime[]): boolean {
  // rrweb FullSnapshot = type === 2 / rrweb FullSnapshot은 type === 2
  return list.some((event) => event.type === 2);
}

function toWebSocketUrl(httpUrl: string): string {
  return httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

async function readMessage(data: Blob | ArrayBuffer | string): Promise<string> {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  return new TextDecoder().decode(data);
}

/**
 * rrweb replay panel / rrweb 리플레이 패널
 */
export function RrwebReplayPanel({ clientId }: RrwebReplayPanelProps) {
  const [events, setEvents] = useState<eventWithTime[]>([]);
  const [state, setState] = useState<StreamState>({ status: 'idle' });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const devtoolsId = `rrweb-${clientId}-${Date.now()}`;
    const baseUrl = new URL(`/remote/debug/devtools/${devtoolsId}`, SERVER_URL);
    baseUrl.searchParams.set('clientId', clientId);
    const wsUrl = toWebSocketUrl(baseUrl.toString());

    const socket = new WebSocket(wsUrl);
    setState({ status: 'connecting' });

    const handleMessage = async (event: MessageEvent<Blob | ArrayBuffer | string>) => {
      try {
        const text = await readMessage(event.data);
        const parsed = JSON.parse(text);
        if (parsed?.kind === 'rrweb' && Array.isArray(parsed.events)) {
          setEvents((prev) => [...prev, ...(parsed.events as eventWithTime[])]);
        }
      } catch (error) {
        setState({ status: 'error', lastError: (error as Error).message });
      }
    };

    socket.addEventListener('open', () => setState({ status: 'open' }));
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', () => setState({ status: 'closed' }));
    socket.addEventListener('error', () => setState({ status: 'error', lastError: 'socket error' }));

    return () => {
      socket.removeEventListener('message', handleMessage);
      socket.close();
    };
  }, [clientId]);

  useEffect(() => {
    let disposed = false;
    let playerInstance: rrwebPlayer | null = null;

    async function mountPlayer() {
      if (!containerRef.current) return;

      // rrweb-player requires at least 2 events AND a FullSnapshot / 최소 2개 이벤트와 FullSnapshot 필요
      const ready = events.length >= 2 && hasFullSnapshot(events);
      if (!ready) {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          const message = document.createElement('div');
          message.className = 'flex items-center justify-center h-full text-gray-400 text-sm';
          message.textContent = `Waiting for full snapshot... (${events.length} events)`;
          containerRef.current.appendChild(message);
        }
        return;
      }

      const [{ default: RrwebPlayer }, _] = await Promise.all([
        import('rrweb-player'),
        import('rrweb-player/dist/style.css'),
      ]);

      if (disposed || !containerRef.current) return;

      // Clear existing player before creating new one / 새 플레이어 생성 전 기존 플레이어 제거
      if (playerInstance) {
        playerInstance = null;
      }

      // Create new player / 새 플레이어 생성
      containerRef.current.innerHTML = '';
      const options: RRwebPlayerOptions = {
        target: containerRef.current,
        props: {
          events,
          autoPlay: false,
          showController: true,
          // Enable liveMode to handle streaming updates / 스트리밍 업데이트 처리를 위해 liveMode 활성화
          liveMode: true,
        },
      };
      playerInstance = new RrwebPlayer(options);
    }

    void mountPlayer();

    return () => {
      disposed = true;
      playerInstance = null;
    };
  }, [events]);

  const statusText = useMemo(() => {
    if (state.status === 'open') return 'Streaming';
    if (state.status === 'connecting') return 'Connecting...';
    if (state.status === 'closed') return 'Closed';
    if (state.status === 'error') return 'Error';
    return 'Idle';
  }, [state.status]);

  return (
    <div className="h-full w-full bg-gray-800 border border-gray-700 rounded-lg flex flex-col">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-100">rrweb Replay</span>
          <span className="text-xs text-gray-400">
            {statusText} · {events.length} events
          </span>
          {state.lastError && <span className="text-xs text-red-400">{state.lastError}</span>}
        </div>
        <button
          type="button"
          className="text-xs text-gray-300 hover:text-white"
          onClick={() => setEvents([])}
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-hidden" ref={containerRef} />
    </div>
  );
}

