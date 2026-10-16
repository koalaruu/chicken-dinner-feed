import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useEliminationStore } from '@/stores/elimination-store';

const POPUP_DURATION_MS = 4500;

export function TeamEliminatedPopup() {
  const current = useEliminationStore((s) => s.current);
  const dismiss = useEliminationStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;

    const timer = setTimeout(() => {
      dismiss();
    }, POPUP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [current?.id, dismiss]);

  return (
    <div className="fixed top-24 right-8 z-[9999] pointer-events-none select-none">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="w-[330px] sm:w-[370px] rounded-xl overflow-hidden border-2 border-[#d49b35] shadow-[0_16px_50px_rgba(0,0,0,0.92),0_0_35px_rgba(212,155,53,0.4)] backdrop-blur-md bg-[#18120e]"
          >
            {/* Top Ribbon Header */}
            <div className="bg-gradient-to-r from-[#8b1e1e] via-[#ab2323] to-[#731919] px-4 py-1.5 flex items-center justify-between border-b border-[#f5c553]/60 shadow-inner">
              <div className="flex items-center gap-2">
                {/* Skull / Target Crosshair Icon */}
                <svg
                  className="size-4 text-[#ffd24c] animate-pulse"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="22" y1="12" x2="18" y2="12" />
                  <line x1="6" y1="12" x2="2" y2="12" />
                  <line x1="12" y1="6" x2="12" y2="2" />
                  <line x1="12" y1="22" x2="12" y2="18" />
                </svg>
                <span className="font-black tracking-widest text-[#ffd24c] text-xs uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  TEAM ELIMINATED
                </span>
              </div>

              <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                PMCC ESPORTS
              </span>
            </div>

            {/* Main Body */}
            <div className="flex items-center gap-3.5 p-3.5 bg-gradient-to-b from-[#221812] to-[#140e0a]">
              {/* Left: Placement Rank Badge */}
              <div className="flex flex-col items-center justify-center size-14 rounded-lg bg-gradient-to-br from-[#f5c553] via-[#ebb343] to-[#d49b35] text-[#18110a] shadow-lg shrink-0 border border-white/20">
                <span className="font-black text-xl leading-none tabular-nums">
                  #{current.placement}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#18110a]/80 mt-0.5">
                  PLACE
                </span>
              </div>

              {/* Center / Team Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xl sm:text-2xl text-white tracking-wide uppercase truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {current.name}
                </h3>

                {/* Stats Pills: ELIM & PTS */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#16252c] border border-[#2bb0b8]/40">
                    <span className="text-[10px] font-extrabold text-[#2bb0b8] uppercase tracking-wider">
                      ELIMS:
                    </span>
                    <span className="text-xs font-black text-white tabular-nums">
                      {current.eliminations}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#16252c] border border-[#ffd24c]/40">
                    <span className="text-[10px] font-extrabold text-[#d49b35] uppercase tracking-wider">
                      PTS:
                    </span>
                    <span className="text-xs font-black text-[#ffd24c] tabular-nums">
                      {current.totalPoints}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Shrinking Countdown Bar */}
            <div className="h-[3.5px] w-full bg-black/50 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: POPUP_DURATION_MS / 1000, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-[#d49b35] via-[#f5c553] to-[#ffd24c] shadow-[0_0_8px_#ffd24c]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
