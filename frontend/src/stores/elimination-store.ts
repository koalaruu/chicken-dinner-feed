import { create } from 'zustand';

export interface EliminationItem {
  id: string;
  teamNo: number;
  name: string;
  placement: number;
  eliminations: number;
  totalPoints: number;
  logoUrl: string | null;
}

interface EliminationState {
  enabled: boolean;
  current: EliminationItem | null;
  queue: EliminationItem[];

  setEnabled(enabled: boolean, fromBroadcast?: boolean): void;
  trigger(item: Omit<EliminationItem, 'id'>, fromBroadcast?: boolean): void;
  dismiss(fromBroadcast?: boolean): void;
  clear(fromBroadcast?: boolean): void;
  triggerTest(): void;
}

const BROADCAST_CHANNEL_NAME = 'cdf_elimination_channel';

// Cross-tab & OBS browser source synchronization via standard BroadcastChannel
let bc: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('[elimination-store] BroadcastChannel not supported:', e);
  }
}

export const useEliminationStore = create<EliminationState>((set, get) => {
  // Listen for elimination messages sent from other tabs (e.g. Admin -> Overlay)
  if (bc) {
    bc.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'TRIGGER' && data.item) {
        get().trigger(data.item, true);
      } else if (data.type === 'DISMISS') {
        get().dismiss(true);
      } else if (data.type === 'CLEAR') {
        get().clear(true);
      } else if (data.type === 'SET_ENABLED' && typeof data.enabled === 'boolean') {
        get().setEnabled(data.enabled, true);
      }
    };
  }

  return {
    enabled: true,
    current: null,
    queue: [],

    setEnabled: (enabled, fromBroadcast = false) => {
      set({ enabled });
      if (!fromBroadcast && bc) {
        bc.postMessage({ type: 'SET_ENABLED', enabled });
      }
    },

    trigger: (item, fromBroadcast = false) => {
      if (!get().enabled) return;

      const fullItem: EliminationItem = {
        ...item,
        id: `${item.teamNo}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };

      if (!fromBroadcast && bc) {
        bc.postMessage({ type: 'TRIGGER', item: fullItem });
      }

      set((state) => {
        // If nothing is showing right now, show immediately
        if (!state.current) {
          return { current: fullItem };
        }
        // If current is the same team, refresh it
        if (state.current.teamNo === fullItem.teamNo) {
          return { current: fullItem };
        }
        // Avoid duplicate entries for the same team in queue
        const filteredQueue = state.queue.filter((q) => q.teamNo !== fullItem.teamNo);
        return { queue: [...filteredQueue, fullItem] };
      });
    },

    dismiss: (fromBroadcast = false) => {
      if (!fromBroadcast && bc) {
        bc.postMessage({ type: 'DISMISS' });
      }
      set((state) => {
        if (state.queue.length > 0) {
          const [next, ...rest] = state.queue;
          return { current: next, queue: rest };
        }
        return { current: null };
      });
    },

    clear: (fromBroadcast = false) => {
      if (!fromBroadcast && bc) {
        bc.postMessage({ type: 'CLEAR' });
      }
      set({ current: null, queue: [] });
    },

    triggerTest: () => {
      const samples = [
        { teamNo: 1, name: 'MGLZ', placement: 16, eliminations: 5, totalPoints: 5, logoUrl: null },
        { teamNo: 4, name: 'TWIST', placement: 12, eliminations: 8, totalPoints: 9, logoUrl: null },
        { teamNo: 2, name: 'APG', placement: 9, eliminations: 3, totalPoints: 4, logoUrl: null },
        { teamNo: 7, name: 'BOOM', placement: 10, eliminations: 4, totalPoints: 6, logoUrl: null },
        { teamNo: 11, name: 'BTR', placement: 5, eliminations: 11, totalPoints: 17, logoUrl: null },
      ];
      const picked = samples[Math.floor(Math.random() * samples.length)]!;
      get().trigger(picked);
    },
  };
});
