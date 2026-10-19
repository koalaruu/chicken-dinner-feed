import type { MatchState, OverlayAppearance, Team } from '@cdf/shared';
import { motion } from 'motion/react';

interface WwcdOverlayProps {
  match: MatchState;
  appearance?: OverlayAppearance;
}

export function WwcdOverlay({ match, appearance: _appearance }: WwcdOverlayProps) {
  // Sort teams to identify WWCD champion
  const sortedTeams = [...match.teams].sort((a, b) => a.rank - b.rank);
  const liveWinner =
    sortedTeams.find((t) => t.rank === 1 && (!t.isEliminated || match.phase === 'ended')) ||
    sortedTeams[0];

  // Fallback demo team if no match data is present
  const winner: Team = liveWinner || {
    teamNo: 1,
    name: 'BIGETRON RA',
    logoUrl: null,
    players: [],
    standingPlayerCount: 4,
    eliminations: 14,
    killPoints: 14,
    placementPoints: 10,
    totalPoints: 24,
    rank: 1,
    placement: 1,
    isEliminated: false,
  };

  const totalTeams = match.teams.length > 0 ? match.teams.length : 25;
  const placementPts = winner.placementPoints ?? 10;
  const totalPts = winner.totalPoints ?? placementPts + winner.eliminations;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none font-sans text-white bg-black">
      {/* Dynamic CSS animations for marquee and golden embers */}
      <style>{`
        @keyframes wwcdMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wwcd-marquee {
          display: flex;
          width: max-content;
          animation: wwcdMarquee 25s linear infinite;
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.8; }
          50% { transform: translateY(-10px) scale(1.05); opacity: 1; }
        }
        .animate-float-slow {
          animation: floatSlow 4s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(255, 210, 76, 0.6)) drop-shadow(0 0 35px rgba(255, 180, 0, 0.4)); }
          50% { filter: drop-shadow(0 0 30px rgba(255, 210, 76, 0.9)) drop-shadow(0 0 60px rgba(255, 180, 0, 0.7)); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Stage Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
      />

      {/* Atmospheric Overlays: Golden volumetric lighting & Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/80 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(245, 197, 83, 0.15) 0%, rgba(24, 18, 14, 0.5) 45%, rgba(10, 8, 6, 0.88) 80%, rgba(0, 0, 0, 0.98) 100%)',
        }}
      />

      {/* Subtle Golden Ray Beams in center */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255,210,76,0.6) 0%, rgba(224,169,53,0.2) 50%, transparent 70%)',
        }}
      />

      {/* MAIN CONTAINER */}
      <div className="relative z-10 flex flex-col justify-between w-full h-full px-8 py-5 box-border">
        {/* TOP BAR / HEADER */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center justify-between border-b border-[#f5c553]/40 pb-3 bg-black/60 backdrop-blur-md px-6 py-2.5 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.85)]"
        >
          {/* Left Brand Badge */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center size-11 rounded-lg bg-gradient-to-br from-[#ffd24c] via-[#f5c553] to-[#d49b35] text-[#18110a] shadow-lg border border-white/40 font-black text-lg">
              <svg className="size-6 text-[#18110a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd24c] px-2 py-0.5 rounded bg-[#ffd24c]/15 border border-[#ffd24c]/30">
                  PMCC INDONESIA 2024
                </span>
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                  PENS ESPORTS BROADCAST
                </span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-[#ffd24c] to-[#e0a935] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                WINNER WINNER CHICKEN DINNER
              </h1>
            </div>
          </div>

          {/* Center Match Info Pill */}
          <div className="hidden md:flex items-center gap-3 px-5 py-1.5 rounded-full bg-[#18120e]/90 border border-[#d49b35]/50 shadow-inner">
            <span className="text-xs font-black text-[#ffd24c] uppercase tracking-wider">
              {match.matchId ? `MATCH: ${match.matchId}` : 'MATCH COMPLETED'}
            </span>
            <span className="text-[#ffd24c]/50">&bull;</span>
            <span className="text-xs font-bold text-white/90">{totalTeams} TEAMS</span>
            <span className="text-[#ffd24c]/50">&bull;</span>
            <span className="text-xs font-black text-[#2bb0b8] uppercase tracking-wider">
              ROUND WINNER
            </span>
          </div>

          {/* Right WWCD Mini Emblem */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ffd24c]/20 via-[#ffd24c]/10 to-transparent border border-[#ffd24c]/40 shadow-sm">
              <img
                src="/images/chicken-dinner-badge.png"
                alt="WWCD Icon"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-xs font-black tracking-wider text-[#ffd24c] uppercase">
                WWCD CHAMPION
              </span>
            </div>
          </div>
        </motion.header>

        {/* CENTER STAGE: SQUAD LINEUP & WWCD TITLE */}
        <div className="relative flex-1 flex flex-col justify-end items-center overflow-visible">
          {/* WWCD Floating Grand Emblem & Title (Above Characters) */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
          >
            {/* Golden Pan Badge with glowing pulsing effect */}
            <div className="relative mb-1">
              <div className="absolute inset-0 rounded-full bg-[#ffd24c]/30 blur-2xl transform scale-150" />
              <img
                src="/images/chicken-dinner-badge.png"
                alt="Chicken Dinner Pan"
                className="relative w-28 h-28 md:w-36 md:h-36 object-contain animate-pulse-glow drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Dramatic 3D Typography */}
            <div className="text-center">
              <div className="text-lg md:text-xl font-black uppercase tracking-[0.35em] text-[#f5c553] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                WINNER WINNER
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider uppercase bg-gradient-to-b from-[#ffffff] via-[#ffd24c] to-[#c78d20] bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(255,210,76,0.6)]">
                CHICKEN DINNER
              </h2>
            </div>
          </motion.div>

          {/* SQUAD CHARACTERS LINEUP (Standing on stage floor) */}
          <div className="relative w-full max-w-6xl h-[420px] md:h-[480px] lg:h-[530px] flex justify-center items-end pointer-events-none z-10">
            {/* Character 1 (Left Wing: Hooded Operative) */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 0.95 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="absolute left-[8%] md:left-[14%] bottom-0 h-[78%] md:h-[84%] flex items-end drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
            >
              <img
                src="/images/characters/char1.png"
                alt="Squad Member 1"
                className="h-full object-contain filter brightness-90 contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </motion.div>

            {/* Character 2 (Mid-Left: Female Commando) */}
            <motion.div
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 0.95 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="absolute left-[24%] md:left-[28%] bottom-0 h-[84%] md:h-[90%] flex items-end drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
            >
              <img
                src="/images/characters/char4.png"
                alt="Squad Member 2"
                className="h-full object-contain filter brightness-95 contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </motion.div>

            {/* Character 3 (CENTER: Iconic PUBG Guy with L3 Helmet & AKM) */}
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
              className="relative z-10 bottom-0 h-[92%] md:h-[100%] flex items-end drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]"
            >
              {/* Radial Golden Stage Light behind central character */}
              <div className="absolute inset-0 -top-12 bg-radial from-[#ffd24c]/30 to-transparent blur-xl pointer-events-none" />
              <img
                src="/images/characters/char5.png"
                alt="Squad Leader"
                className="relative h-full object-contain filter brightness-105 contrast-110 drop-shadow-[0_0_20px_rgba(255,210,76,0.3)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </motion.div>

            {/* Character 4 (Mid-Right: Female Sniper with Cap & Kar98) */}
            <motion.div
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 0.95 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="absolute right-[24%] md:right-[28%] bottom-0 h-[84%] md:h-[90%] flex items-end drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
            >
              <img
                src="/images/characters/char3.png"
                alt="Squad Member 3"
                className="h-full object-contain filter brightness-95 contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </motion.div>

            {/* Character 5 (Right Wing: Suit Rifleman) */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 0.95 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="absolute right-[8%] md:right-[14%] bottom-0 h-[78%] md:h-[84%] flex items-end drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
            >
              <img
                src="/images/characters/char2.png"
                alt="Squad Member 4"
                className="h-full object-contain filter brightness-90 contrast-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* BOTTOM SECTION: MARQUEE TICKER & 4-COLUMN STATS CARD */}
        <div className="relative z-20 flex flex-col gap-3 mt-1">
          {/* SIGNATURE MARQUEE / TICKER RIBBON (From Reference) */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="w-full overflow-hidden border-y border-[#ffd24c]/60 bg-gradient-to-r from-[#18120e] via-[#2c1d0d] to-[#18120e] shadow-[0_4px_25px_rgba(0,0,0,0.8)] py-1.5 backdrop-blur-sm"
          >
            <div className="animate-wwcd-marquee text-[#ffd24c] font-black text-xs md:text-sm tracking-[0.25em] uppercase whitespace-nowrap">
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
              <span className="mx-6">★ WINNER WINNER CHICKEN DINNER</span>
              <span className="mx-6 text-white/80">•</span>
            </div>
          </motion.div>

          {/* 4-COLUMN STATS PANEL WITH ESPORTS CORNER BRACKETS */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3.5"
          >
            {/* BOX 1: TEAM LOGO & NAME */}
            <div className="relative group bg-[#18120e]/90 border border-[#d49b35]/40 rounded-xl p-3.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex items-center gap-3.5 overflow-hidden">
              {/* Corner Brackets Accents (Esports Bracket Styling) */}
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ffd24c]" />

              {/* Team Logo / Badge */}
              <div className="shrink-0 size-14 md:size-16 rounded-lg bg-gradient-to-br from-[#2a1d12] to-[#120c08] border border-[#f5c553]/50 flex items-center justify-center p-2 shadow-inner">
                {winner.logoUrl ? (
                  <img src={winner.logoUrl} alt={winner.name} className="w-full h-full object-contain" />
                ) : (
                  <img
                    src="/images/chicken-dinner-badge.png"
                    alt="WWCD Icon"
                    className="w-10 h-10 object-contain drop-shadow"
                  />
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-black tracking-widest text-[#ffd24c] uppercase px-2 py-0.5 rounded bg-[#ffd24c]/10 border border-[#ffd24c]/30 mb-1">
                  CHAMPION TEAM #{winner.teamNo}
                </span>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white truncate drop-shadow-md">
                  {winner.name}
                </h3>
                <span className="text-[11px] font-bold text-[#2bb0b8] uppercase tracking-wide">
                  ROUND WINNER
                </span>
              </div>
            </div>

            {/* BOX 2: OVERALL RANKING / MATCH PLACEMENT */}
            <div className="relative bg-[#18120e]/90 border border-[#d49b35]/40 rounded-xl p-3.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex flex-col justify-between overflow-hidden">
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ffd24c]" />

              <span className="text-xs font-black uppercase tracking-widest text-[#ffd24c]/90">
                MATCH PLACEMENT
              </span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-4xl md:text-5xl font-black text-[#ffd24c] tracking-tight drop-shadow-[0_2px_12px_rgba(255,210,76,0.5)]">
                  #1
                </span>
                <span className="text-sm font-bold text-white/50 tracking-wider">
                  / {totalTeams} TEAMS
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                SURVIVED TILL LAST
              </span>
            </div>

            {/* BOX 3: ELIMS (TEAM KILLS) */}
            <div className="relative bg-[#18120e]/90 border border-[#d49b35]/40 rounded-xl p-3.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex flex-col justify-between overflow-hidden">
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ffd24c]" />

              <span className="text-xs font-black uppercase tracking-widest text-[#ffd24c]/90">
                ELIMS
              </span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]">
                  {winner.eliminations}
                </span>
                <span className="text-xs font-bold text-white/60 tracking-wider">
                  KILLS
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                TOTAL SQUAD FRAGS
              </span>
            </div>

            {/* BOX 4: POINTS */}
            <div className="relative bg-[#18120e]/90 border border-[#d49b35]/40 rounded-xl p-3.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex flex-col justify-between overflow-hidden">
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ffd24c]" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ffd24c]" />

              <span className="text-xs font-black uppercase tracking-widest text-[#ffd24c]/90">
                POINTS
              </span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#ffd24c] to-[#f5a524] bg-clip-text text-transparent tracking-tight drop-shadow-[0_2px_12px_rgba(255,210,76,0.5)]">
                  {totalPts}
                </span>
                <span className="text-xs font-bold text-[#ffd24c]/70 tracking-wider">
                  TOTAL PTS
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {placementPts} RANK + {winner.eliminations} ELIMS
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
