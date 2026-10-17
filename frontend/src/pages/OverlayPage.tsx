import { DEFAULT_OVERLAY_APPEARANCE } from '@cdf/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { appearanceToAnimation, appearanceToPosition } from '@/components/overlay/appearance';
import { LeaderboardOverlay } from '@/components/overlay/LeaderboardOverlay';
import { PostgameOverlay } from '@/components/overlay/PostgameOverlay';
import { TeamEliminatedPopup } from '@/components/overlay/TeamEliminatedPopup';
import { Top4Overlay } from '@/components/overlay/Top4Overlay';
import { u } from '@/components/overlay/overlay-scale';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEliminationWatcher } from '@/hooks/useEliminationWatcher';
import { useLiveStore } from '@/stores/live-store';

export interface OverlayPageProps {
  instanceId: string;
}

/**
 * A checkerboard drawn behind the panel when the page is embedded in the admin preview.
 *
 * An iframe cannot show the page behind it here: with no background of its own, the embedded
 * document still paints a canvas, and its colour comes from `color-scheme` — white by default, with
 * no value that means "transparent". A real browser source is composited transparently by the
 * broadcast software itself, so this never applies on air; the marker only ever arrives from the
 * admin, which appends it to the address.
 */
const PREVIEW_BACKDROP: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: -1,
  backgroundColor: '#0a1420',
  backgroundImage:
    'linear-gradient(45deg, #16283c 25%, transparent 25%), linear-gradient(-45deg, #16283c 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #16283c 75%), linear-gradient(-45deg, transparent 75%, #16283c 75%)',
  backgroundSize: '48px 48px',
  backgroundPosition: '0 0, 0 24px, 24px -24px, -24px 0px',
};

/**
 * A single overlay instance, rendered for consumption as a broadcast browser source.
 *
 * Nobody is looking at this page in a browser — it is composited over live video. That shapes every
 * decision here: transparent background, no interaction, and nothing rendered until we actually
 * know what should be on screen.
 */
export function OverlayPage({ instanceId }: OverlayPageProps) {
  // Read once: the address does not change while the page is open.
  const [isPreview] = useState(() => new URLSearchParams(window.location.search).has('preview'));
  const [hasNoBg] = useState(
    () =>
      new URLSearchParams(window.location.search).has('nobg') ||
      new URLSearchParams(window.location.search).has('transparent'),
  );

  const snapshot = useLiveStore((state) => state.snapshot);
  const overlay = useLiveStore((state) => state.overlayStates[instanceId]);
  const instance = useLiveStore((state) => state.instances[instanceId] ?? null);
  const protocolMismatch = useLiveStore((state) => state.protocolMismatch);
  const connect = useLiveStore((state) => state.connect);

  useEffect(() => {
    // Marks the whole document as a broadcast surface: transparent, no cursor, no scrollbars.
    // Applied to the root because the browser source captures the entire page.
    document.documentElement.dataset.surface = 'overlay';
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, []);

  useEffect(() => connect(instanceId, { isPreview }), [connect, instanceId, isPreview]);

  // Falls back to the id until the configuration arrives, so a tab is never nameless — and an
  // unconfigured overlay is still identifiable by the address it was opened with.
  useDocumentTitle(instance?.name ?? instanceId);

  // Automatically watches for newly eliminated teams to show popups.
  // Must be called unconditionally before any early returns to satisfy React Rules of Hooks.
  useEliminationWatcher(snapshot?.match);

  if (protocolMismatch !== null) {
    // Deliberately visible rather than silent (ADR-0007). A browser source left open across an
    // upgrade would otherwise render subtly wrong data, which is worse than an obvious error.
    return (
      <div
        style={{
          position: 'fixed',
          top: u(20),
          left: u(20),
          padding: u(12),
          borderRadius: u(4),
          background: 'oklch(0.35 0.15 25 / 0.92)',
          color: 'white',
          fontFamily: 'var(--overlay-font-family)',
          fontSize: u(14),
        }}
      >
        Overlay is out of date — the server speaks protocol v{protocolMismatch}. Reload this browser
        source.
      </div>
    );
  }

  // Render nothing until both the match state and the visibility are known. Assuming "visible"
  // while waiting would flash the overlay on air whenever a hidden one is reloaded.
  if (!snapshot || !overlay) return null;

  // An unconfigured id still renders, using the defaults. Showing nothing would look identical to a
  // broken connection, and the operator has no way to tell them apart mid-broadcast.
  const appearance = instance?.appearance ?? DEFAULT_OVERLAY_APPEARANCE;
  const isTop4 = instance?.type === 'top4' || instanceId === 'top4';
  const isEliminationOnly = instance?.type === 'elimination' || instanceId === 'elimination';
  const isPostgame = instance?.type === 'postgame' || instanceId === 'postgame';

  if (isEliminationOnly) {
    return (
      <>
        {isPreview && <div style={PREVIEW_BACKDROP} aria-hidden />}
        <TeamEliminatedPopup />
      </>
    );
  }

  if (isPostgame) {
    return (
      <>
        {isPreview && <div style={PREVIEW_BACKDROP} aria-hidden />}
        <AnimatePresence initial={false}>
          {overlay.visible && (
            <motion.div
              key="postgame-panel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="w-screen h-screen"
            >
              <PostgameOverlay match={snapshot.match} appearance={appearance} />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (isTop4) {
    return (
      <>
        {isPreview && <div style={PREVIEW_BACKDROP} aria-hidden />}
        <TeamEliminatedPopup />
        <AnimatePresence initial={false}>
          {overlay.visible && (
            <motion.div
              key="top4-panel"
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -80, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Top4Overlay match={snapshot.match} appearance={appearance} />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const animation = appearanceToAnimation(appearance);

  return (
    <>
      {isPreview && <div style={{ ...PREVIEW_BACKDROP, zIndex: -20 }} aria-hidden />}

      {!hasNoBg && (
        <AnimatePresence initial={false}>
          {overlay.visible && (
            <motion.div
              key="leaderboard-stage-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
            >
              {/* 3D Background from PMCC stage */}
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
              />

              {/* Atmospheric Overlays: Dark gradient to preserve central trophy and keep left leaderboard table crisp */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/75" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(24, 18, 14, 0.2) 0%, rgba(10, 8, 6, 0.65) 75%, rgba(0, 0, 0, 0.9) 100%)',
                }}
              />

              {/* Top PMCC Championship Bar */}
              <div className="absolute top-4 left-6 right-6 flex items-center justify-between">
                <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-[#f5c553]/40 shadow-lg">
                  <div className="flex items-center justify-center size-7 rounded bg-gradient-to-br from-[#f5c553] to-[#d49b35] text-[#18110a] font-black text-xs shadow">
                    <svg className="size-4 text-[#18110a]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#ffd24c]">
                      PMCC INDONESIA 2024
                    </span>
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      LIVE MATCH LEADERBOARD
                    </h2>
                  </div>
                </div>

                {snapshot.match.matchId && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-[#f5c553]/40 text-xs font-black text-[#ffd24c] shadow-lg">
                    <span>MATCH {snapshot.match.matchId}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/80 font-bold uppercase text-[10px]">
                      {snapshot.match.phase === 'ended' ? 'FINAL' : 'LIVE'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Championship Watermark */}
              <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between px-5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-[#f5c553]/25 text-white/70 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#f5c553] animate-pulse" />
                  <span className="font-bold text-white/90 tracking-wide uppercase text-[11px]">
                    PUBG MOBILE CAMPUS CHALLENGE
                  </span>
                </div>
                <div className="font-black text-[#ffd24c] tracking-widest uppercase text-[10px]">
                  #BE THE ONE
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <TeamEliminatedPopup />

      <div style={appearanceToPosition(appearance)}>
        {/*
         * `initial={false}` suppresses the animation on first paint only: an overlay that was already
         * on air when the page loaded must simply be there, not slide in as though a director had
         * just triggered it. Later show/hide transitions animate normally.
         */}
        <AnimatePresence initial={false}>
          {overlay.visible && (
            <motion.div
              key="panel"
              variants={animation.variants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <LeaderboardOverlay
                match={snapshot.match}
                appearance={appearance}
                animateRows={animation.rowsEnabled}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
