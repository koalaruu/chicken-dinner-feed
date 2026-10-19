import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useEliminationWatcher } from '@/hooks/useEliminationWatcher';
import { api, ApiError } from '@/lib/api';
import { useEliminationStore } from '@/stores/elimination-store';
import { useLiveStore } from '@/stores/live-store';
import { toast } from '@/stores/toast-store';

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

export function ManualMatchControl() {
  const liveSnapshot = useLiveStore((state) => state.snapshot);
  const liveTeams = liveSnapshot?.match.teams ?? [];

  // Watch for eliminations and trigger popup directly in admin preview
  useEliminationWatcher(liveSnapshot?.match);

  const top4OverlayState = useLiveStore((state) => state.overlayStates['top4']);
  const isTop4OnAir = top4OverlayState?.visible ?? false;

  const postgameOverlayState = useLiveStore((state) => state.overlayStates['postgame']);
  const isPostgameOnAir = postgameOverlayState?.visible ?? false;

  const recapOverlayState = useLiveStore((state) => state.overlayStates['recap']);
  const isRecapOnAir = recapOverlayState?.visible ?? false;

  const wwcdOverlayState = useLiveStore((state) => state.overlayStates['wwcd']);
  const isWwcdOnAir = wwcdOverlayState?.visible ?? false;

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [currentSource, setCurrentSource] = useState<string>('');
  const [manualState, setManualState] = useState<{
    matchId: string | null;
    phase: 'idle' | 'live' | 'ended';
    teams: {
      teamNo: number;
      aliveCount: number;
      kills: number;
      isEliminated: boolean;
    }[];
  } | null>(null);

  const [search, setSearch] = useState('');
  const [pendingReset, setPendingReset] = useState(false);
  const [pendingEnd, setPendingEnd] = useState(false);

  const fetchState = async () => {
    try {
      const res = await api.getManualState();
      setEnabled(res.enabled);
      setCurrentSource(res.currentSource);
      setManualState(res.state);
    } catch (err) {
      toast.error('Gagal memuat status manual match', describe(err));
    }
  };

  useEffect(() => {
    void fetchState();
  }, []);

  const handleStart = async () => {
    try {
      const state = await api.startManualMatch();
      setManualState(state);
      toast.success('Match dimulai!', 'Semua tim diset aktif (4 pemain, 0 kill). Overlay siap di OBS.');
    } catch (err) {
      toast.error('Gagal memulai match', describe(err));
    }
  };

  const handleEnd = async () => {
    setPendingEnd(false);
    try {
      const state = await api.endManualMatch();
      setManualState(state);
      toast.success('Match selesai', 'Peringkat akhir telah dikunci. Anda bisa menutup map di Series Control.');
    } catch (err) {
      toast.error('Gagal mengakhiri match', describe(err));
    }
  };

  const handleReset = async () => {
    setPendingReset(false);
    try {
      const state = await api.resetManualMatch();
      setManualState(state);
      toast.success('Match di-reset', 'Semua poin dan eliminasi kembali ke awal.');
    } catch (err) {
      toast.error('Gagal mereset match', describe(err));
    }
  };

  const updateTeam = async (params: {
    teamNo: number;
    kills?: number;
    deltaKills?: number;
    aliveCount?: number;
    eliminate?: boolean;
    revive?: boolean;
  }) => {
    try {
      const state = await api.updateManualTeam(params);
      setManualState(state);
    } catch (err) {
      toast.error('Gagal mengupdate tim', describe(err));
    }
  };

  const handleToggleTop4 = async () => {
    try {
      const res = await api.setOverlayVisibility('top4', 'toggle');
      toast.success(
        res.visible ? 'Overlay Top 4 ON AIR' : 'Overlay Top 4 disembunyikan',
        res.visible
          ? 'Banner Top 4 sedang tampil di stream OBS.'
          : 'Banner Top 4 sudah disembunyikan dari stream.',
      );
    } catch (err) {
      toast.error('Gagal mengubah status Top 4', describe(err));
    }
  };

  const handleCopyTop4Url = async () => {
    const url = `${window.location.origin}/overlay/top4`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL disalin ke clipboard!', url);
    } catch {
      toast.error('Gagal menyalin URL', url);
    }
  };

  const handleTogglePostgame = async () => {
    try {
      const res = await api.setOverlayVisibility('postgame', 'toggle');
      toast.success(
        res.visible ? 'Postgame Standings ON AIR' : 'Postgame Standings disembunyikan',
        res.visible
          ? 'Tabel hasil pertandingan (background 0001.png) sedang tampil di stream OBS.'
          : 'Tabel hasil pertandingan sudah disembunyikan dari stream.',
      );
    } catch (err) {
      toast.error('Gagal mengubah status Postgame Overlay', describe(err));
    }
  };

  const handleCopyPostgameUrl = async () => {
    const url = `${window.location.origin}/overlay/postgame`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL Postgame Standings disalin ke clipboard!', url);
    } catch {
      toast.error('Gagal menyalin URL', url);
    }
  };

  const handleToggleRecap = async () => {
    try {
      const res = await api.setOverlayVisibility('recap', 'toggle');
      toast.success(
        res.visible ? 'Tournament Recap (R1-R4) ON AIR' : 'Tournament Recap disembunyikan',
        res.visible
          ? 'Overlay Recap Round 1-4 (background PMCC 0001.png) sedang tampil di stream OBS.'
          : 'Overlay Recap Round 1-4 sudah disembunyikan dari stream.',
      );
    } catch (err) {
      toast.error('Gagal mengubah status Recap Overlay', describe(err));
    }
  };

  const handleCopyRecapUrl = async () => {
    const url = `${window.location.origin}/overlay/recap`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL Tournament Recap disalin ke clipboard!', url);
    } catch {
      toast.error('Gagal menyalin URL', url);
    }
  };

  const handleToggleWwcd = async () => {
    try {
      const res = await api.setOverlayVisibility('wwcd', 'toggle');
      toast.success(
        res.visible ? 'WWCD Winner Screen ON AIR' : 'WWCD Winner Screen disembunyikan',
        res.visible
          ? 'Winner screen (squad showcase, running ribbon & stats card) sedang tampil di stream OBS.'
          : 'Winner screen sudah disembunyikan dari stream.',
      );
    } catch (err) {
      toast.error('Gagal mengubah status WWCD Overlay', describe(err));
    }
  };

  const handleCopyWwcdUrl = async () => {
    const url = `${window.location.origin}/overlay/wwcd`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL WWCD Winner Screen disalin ke clipboard!', url);
    } catch {
      toast.error('Gagal menyalin URL', url);
    }
  };

  const isEliminationEnabled = useEliminationStore((s) => s.enabled);
  const setEliminationEnabled = useEliminationStore((s) => s.setEnabled);
  const triggerEliminationTest = useEliminationStore((s) => s.triggerTest);

  const handleCopyEliminationUrl = async () => {
    const url = `${window.location.origin}/overlay/elimination`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL Pop-up Eliminasi disalin!', url);
    } catch {
      toast.error('Gagal menyalin URL', url);
    }
  };

  if (enabled === false) {
    return (
      <div className="grid max-w-2xl gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm">
        <h3 className="text-base font-semibold text-amber-400">Mode Manual Sedang Non-Aktif</h3>
        <p className="text-muted-foreground">
          Sumber data saat ini diatur ke: <strong className="text-foreground">{currentSource}</strong>.
        </p>
        <p className="text-muted-foreground">
          Untuk menggunakan panel kontrol pertandingan langsung ini, ubah konfigurasi di file{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-amber-300">
            backend/.env
          </code>
          :
        </p>
        <pre className="rounded-lg bg-black/50 p-3 font-mono text-xs text-emerald-400">
          INGEST_SOURCE=manual
        </pre>
        <p className="text-muted-foreground text-xs">
          Setelah disimpan, restart aplikasi dengan menjalankan <code className="font-mono">npm run dev</code> atau jalankan{' '}
          <code className="font-mono">startup.bat</code>.
        </p>
      </div>
    );
  }

  const phase = manualState?.phase ?? 'idle';
  const matchId = manualState?.matchId ?? null;
  const teams = manualState?.teams ?? [];

  // Match teams with live rankings
  const combinedTeams = teams.map((team) => {
    const live = liveTeams.find((t) => t.teamNo === team.teamNo);
    return {
      ...team,
      name: live?.name ?? `Team ${team.teamNo}`,
      logoUrl: live?.logoUrl ?? null,
      rank: live?.rank ?? 1,
      totalPoints: live?.totalPoints ?? 0,
      placementPoints: live?.placementPoints ?? 0,
    };
  });

  const filteredTeams = combinedTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      String(t.teamNo).includes(search.trim()),
  );

  const aliveTeamCount = teams.filter((t) => !t.isEliminated).length;
  const totalKills = teams.reduce((acc, t) => acc + t.kills, 0);

  const aliveTeamsList = combinedTeams.filter((t) => !t.isEliminated);
  const currentLeader =
    (aliveTeamsList.length > 0
      ? [...aliveTeamsList].sort((a, b) => b.totalPoints - a.totalPoints || a.rank - b.rank)[0]
      : [...combinedTeams].sort((a, b) => b.totalPoints - a.totalPoints || a.rank - b.rank)[0]) ??
    null;

  const top4Teams =
    aliveTeamsList.length > 0
      ? aliveTeamsList.slice(0, 4)
      : combinedTeams.slice(0, 4);

  return (
    <div className="grid max-w-5xl gap-6">
      <ConfirmDialog
        open={pendingReset}
        title="Reset Pertandingan Ini?"
        confirmLabel="Reset Sekarang"
        destructive
        onCancel={() => setPendingReset(false)}
        onConfirm={() => void handleReset()}
      >
        <p>
          Semua kill dan urutan eliminasi tim akan dikembalikan ke kondisi awal (0 kills, 4 pemain hidup).
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingEnd}
        title="Akhiri Pertandingan (Match Ended)?"
        confirmLabel="Akhiri Match"
        onCancel={() => setPendingEnd(false)}
        onConfirm={() => void handleEnd()}
      >
        <p>
          Status pertandingan akan diubah menjadi <strong>ENDED</strong>. Peringkat dan poin penempatan survivor
          akan dikunci.
        </p>
      </ConfirmDialog>

      {/* Header Match Controls */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              phase === 'live'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : phase === 'ended'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
            }`}
          >
            {phase === 'live' && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
            {phase === 'live' ? 'Match Sedang Berlangsung' : phase === 'ended' ? 'Match Selesai' : 'Match Idle / Standby'}
          </span>

          {matchId && (
            <span className="font-mono text-xs text-muted-foreground">
              ID: <span className="text-foreground">{matchId}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {phase === 'idle' ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
            >
              ▶ Mulai Match Baru
            </button>
          ) : (
            <>
              {phase === 'live' && (
                <button
                  type="button"
                  onClick={() => setPendingEnd(true)}
                  className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-amber-500 transition-colors"
                >
                  ⏹ Akhiri Match
                </button>
              )}
              {phase === 'ended' && (
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
                >
                  ▶ Mulai Match Berikutnya
                </button>
              )}
              <button
                type="button"
                onClick={() => setPendingReset(true)}
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </section>

      {/* Quick Summary Dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-3.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Tim Bertahan</p>
          <p className="mt-1 text-2xl font-bold">
            <span className="text-emerald-400">{aliveTeamCount}</span>{' '}
            <span className="text-sm font-normal text-muted-foreground">/ {teams.length} Tim</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Kills</p>
          <p className="mt-1 text-2xl font-bold text-[var(--brand-gold)]">{totalKills}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-card/60 p-3.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Leader Saat Ini</p>
          <p className="mt-1 text-base font-bold truncate">
            {currentLeader?.name ?? '-'}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({currentLeader?.totalPoints ?? 0} PTS)
            </span>
          </p>
        </div>
      </div>

      {/* Top 4 Endgame HUD Overlay Controller */}
      <section className="rounded-xl border border-[#d49b35]/30 bg-gradient-to-r from-[#18120e] via-[#1a1510] to-[#16252c]/50 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isTop4OnAir
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {isTop4OnAir && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
              {isTop4OnAir ? 'TOP 4 ON AIR' : 'TOP 4 OFF AIR'}
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#f5c553]">Top 4 Endgame Overlay (Horizontal)</h4>
              <p className="text-[11px] text-muted-foreground">
                Banner horizontal khusus 4 tim terakhir. Tampilkan ke siaran stream saat zona akhir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleTop4()}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow ${
                isTop4OnAir
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
            >
              {isTop4OnAir ? '⏹ Sembunyikan (Hide)' : '🔴 Tampilkan di Stream (ON AIR)'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyTop4Url()}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              title="Salin URL Browser Source untuk OBS"
            >
              📋 Salin URL OBS
            </button>

            <a
              href="/overlay/top4"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#d49b35]/40 bg-[#d49b35]/10 px-2.5 py-1.5 text-xs font-semibold text-[#f5c553] hover:bg-[#d49b35]/20 transition-colors inline-flex items-center gap-1"
            >
              ↗ Buka Overlay
            </a>
          </div>
        </div>

        {/* Live Mini Preview of Top 4 */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>Live Preview Banner Top 4</span>
            <span className="text-zinc-500 font-normal">URL: /overlay/top4</span>
          </p>

          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-2.5 min-w-[700px]">
              {top4Teams.map((t) => (
                <div
                  key={t.teamNo}
                  className="flex flex-col flex-1 rounded-md overflow-hidden border border-[#d49b35]/50 shadow-md bg-[#18120e]"
                >
                  <div className="flex h-7 items-stretch">
                    <div className="flex-1 bg-gradient-to-r from-[#f5c553] to-[#e0a935] px-2 py-0.5 flex items-center justify-center min-w-0">
                      <span className="font-black text-[#18110a] text-xs uppercase truncate">
                        {t.name}
                      </span>
                    </div>
                    <div className="bg-[#16252c] px-2 flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-[#2bb0b8]">ALIVE</span>
                      <div className="flex gap-[2px]">
                        {[1, 2, 3, 4].map((slot) => (
                          <div
                            key={slot}
                            className={`w-1 h-3 rounded-[1px] ${
                              slot <= t.aliveCount ? 'bg-[#ffd24c]' : 'bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex h-6 items-center justify-between px-2.5 bg-[#18120e] border-t border-[#d49b35]/30 text-[11px]">
                    <span className="font-bold text-[#d49b35]">
                      ELIM: <span className="text-white font-black">{t.kills}</span>
                    </span>
                    <span className="font-bold text-[#d49b35]">
                      PTS: <span className="text-[#ffd24c] font-black">{t.totalPoints}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Postgame Match Table (Standings) Section */}
      <section className="rounded-xl border border-[#d49b35]/50 bg-gradient-to-r from-[#18120e] via-[#241a12] to-[#18120e] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isPostgameOnAir
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {isPostgameOnAir && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
              {isPostgameOnAir ? 'ON AIR' : 'OFF AIR'}
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#f5c553]">Postgame Match Standings (16 Teams &bull; 0001.png Stage)</h4>
              <p className="text-[11px] text-muted-foreground">
                Tabel hasil akhir 16 tim bertema PMCC dengan background 3D stage trophy. Buka setelah match selesai.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleTogglePostgame()}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow ${
                isPostgameOnAir
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
            >
              {isPostgameOnAir ? '⏹ Sembunyikan (Hide)' : '🔴 Tampilkan di Stream (ON AIR)'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyPostgameUrl()}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              title="Salin URL Browser Source untuk OBS"
            >
              📋 Salin URL OBS
            </button>

            <a
              href="/overlay/postgame"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#d49b35]/40 bg-[#d49b35]/10 px-2.5 py-1.5 text-xs font-semibold text-[#f5c553] hover:bg-[#d49b35]/20 transition-colors inline-flex items-center gap-1"
            >
              ↗ Buka Overlay Fullscreen
            </a>
          </div>
        </div>

        {/* Mini Preview Box */}
        <div
          className="mt-3 relative rounded-lg overflow-hidden border border-[#d49b35]/40 h-36 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#ffd24c] px-2 py-0.5 rounded bg-black/70 border border-[#ffd24c]/40">
                LIVE PREVIEW: POSTGAME STANDINGS (16 TEAMS)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">/overlay/postgame</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Left Top 3 Preview */}
              <div className="flex-1 space-y-1">
                {combinedTeams.slice(0, 3).map((t, idx) => (
                  <div
                    key={t.teamNo}
                    className="flex items-center justify-between px-2 py-0.5 rounded bg-black/70 border border-[#d49b35]/30 text-[10px]"
                  >
                    <span className="font-bold text-[#ffd24c]">
                      #{idx + 1} {t.name}
                    </span>
                    <span className="font-mono text-white">{t.totalPoints} PTS</span>
                  </div>
                ))}
              </div>

              {/* Center Trophy Icon */}
              <div className="shrink-0 flex flex-col items-center">
                <span className="text-xl">🏆</span>
                <span className="text-[9px] font-bold text-[#ffd24c]">PMCC STAGE</span>
              </div>

              {/* Right Ranks 4-6 Preview */}
              <div className="flex-1 space-y-1">
                {combinedTeams.slice(3, 6).map((t, idx) => (
                  <div
                    key={t.teamNo}
                    className="flex items-center justify-between px-2 py-0.5 rounded bg-black/70 border border-[#d49b35]/20 text-[10px]"
                  >
                    <span className="font-semibold text-zinc-300">
                      #{idx + 4} {t.name}
                    </span>
                    <span className="font-mono text-white">{t.totalPoints} PTS</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[9px] text-center text-zinc-400">
              Menampilkan format 2 kolom lengkap (Top 8 kiri & Rank 9-16 kanan) dengan panggung 3D PMCC
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Recap (Round 1 - 4 Standings) Section */}
      <section className="rounded-xl border border-[#d49b35]/60 bg-gradient-to-r from-[#18120e] via-[#261910] to-[#18120e] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isRecapOnAir
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {isRecapOnAir && <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />}
              {isRecapOnAir ? 'ON AIR' : 'OFF AIR'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#f5c553]">Tournament Recap (Round 1 - 4 Breakdown)</h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#ffd24c]/20 text-[#ffd24c] border border-[#ffd24c]/40">
                  NEW OVERLAY
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rekap perolehan rank placement, perolehan kills, poin tiap round (R1, R2, R3, R4) + total WWCD & poin keseluruhan dengan background 3D stage PMCC.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleRecap()}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow ${
                isRecapOnAir
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
            >
              {isRecapOnAir ? '⏹ Sembunyikan (Hide)' : '🔴 Tampilkan di Stream (ON AIR)'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyRecapUrl()}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              title="Salin URL Browser Source untuk OBS"
            >
              📋 Salin URL OBS
            </button>

            <a
              href="/overlay/recap"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#d49b35]/40 bg-[#d49b35]/10 px-2.5 py-1.5 text-xs font-semibold text-[#f5c553] hover:bg-[#d49b35]/20 transition-colors inline-flex items-center gap-1"
            >
              ↗ Buka Overlay Fullscreen
            </a>
          </div>
        </div>

        {/* Mini Preview Box */}
        <div
          className="mt-3 relative rounded-lg overflow-hidden border border-[#d49b35]/50 h-38 bg-cover bg-center shadow-inner"
          style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#ffd24c] px-2 py-0.5 rounded bg-black/80 border border-[#ffd24c]/40">
                LIVE PREVIEW: RECAP ROUND 1 - 4 (16 TEAMS &bull; PLACEMENT &amp; KILLS)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">/overlay/recap</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Left Top 3 Preview with R1-R4 badge */}
              <div className="flex-1 space-y-1">
                {combinedTeams.slice(0, 3).map((t, idx) => (
                  <div
                    key={t.teamNo}
                    className="flex items-center justify-between px-2 py-0.5 rounded bg-black/75 border border-[#d49b35]/30 text-[10px]"
                  >
                    <span className="font-bold text-[#ffd24c] truncate max-w-[120px]">
                      #{idx + 1} {t.name}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-[9px] text-[#2bb0b8]">{t.kills}K</span>
                      <span className="text-[9px] text-zinc-400">R1-R4</span>
                      <span className="font-black text-[#ffd24c]">{t.totalPoints} PTS</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Center Trophy Icon */}
              <div className="shrink-0 flex flex-col items-center">
                <span className="text-xl">🏆</span>
                <span className="text-[9px] font-black text-[#ffd24c] uppercase">PMCC RECAP</span>
              </div>

              {/* Right Ranks 4-6 Preview */}
              <div className="flex-1 space-y-1">
                {combinedTeams.slice(3, 6).map((t, idx) => (
                  <div
                    key={t.teamNo}
                    className="flex items-center justify-between px-2 py-0.5 rounded bg-black/75 border border-[#d49b35]/20 text-[10px]"
                  >
                    <span className="font-semibold text-zinc-300 truncate max-w-[120px]">
                      #{idx + 4} {t.name}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-[9px] text-[#2bb0b8]">{t.kills}K</span>
                      <span className="font-black text-white">{t.totalPoints} PTS</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-zinc-400 border-t border-white/10 pt-1">
              <span>Menampilkan rincian Round 1, Round 2, Round 3, Round 4 (Placement rank, Kills, Points)</span>
              <span className="text-[#ffd24c] font-bold">16 Tim &bull; 3D Stage Background</span>
            </div>
          </div>
        </div>
      </section>

      {/* WWCD Winner Screen Section */}
      <section className="rounded-xl border border-[#ffd24c]/60 bg-gradient-to-r from-[#18120e] via-[#2c1d0d] to-[#18120e] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isWwcdOnAir
                  ? 'bg-amber-500/20 text-[#ffd24c] border border-[#ffd24c]/40 shadow-[0_0_12px_rgba(255,210,76,0.4)]'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {isWwcdOnAir && <span className="size-2 rounded-full bg-[#ffd24c] animate-pulse" />}
              {isWwcdOnAir ? 'WWCD ON AIR' : 'WWCD OFF AIR'}
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#ffd24c] flex items-center gap-1.5">
                <span>🍗 WWCD Winner Screen (Squad Lineup & Ticker • 3D Stage)</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Tampilan selebrasi Winner Winner Chicken Dinner (squad characters showcase, running ticker ribbon, dan 4 kartu statistik juara).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleToggleWwcd()}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow ${
                isWwcdOnAir
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white animate-pulse'
              }`}
            >
              {isWwcdOnAir ? '⏹ Sembunyikan (Hide)' : '🔴 Tampilkan di Stream (ON AIR)'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyWwcdUrl()}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              title="Salin URL Browser Source untuk OBS"
            >
              📋 Salin URL OBS
            </button>

            <a
              href="/overlay/wwcd"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#ffd24c]/40 bg-[#ffd24c]/10 px-2.5 py-1.5 text-xs font-semibold text-[#ffd24c] hover:bg-[#ffd24c]/20 transition-colors inline-flex items-center gap-1"
            >
              ↗ Buka Overlay Fullscreen
            </a>
          </div>
        </div>

        {/* Mini Preview Box */}
        <div
          className="mt-3 relative rounded-lg overflow-hidden border border-[#ffd24c]/40 h-36 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#ffd24c] px-2 py-0.5 rounded bg-black/80 border border-[#ffd24c]/40 flex items-center gap-1">
                <span>🍗</span> LIVE PREVIEW: WWCD WINNER SCREEN
              </span>
              <span className="text-[10px] font-mono text-zinc-400">/overlay/wwcd</span>
            </div>

            <div className="flex items-center justify-between gap-4 px-2">
              {/* Winner Team Card */}
              <div className="flex items-center gap-3 bg-black/80 border border-[#ffd24c]/50 rounded-lg p-2 flex-1">
                <div className="size-10 rounded bg-[#2a1d12] border border-[#ffd24c]/40 flex items-center justify-center p-1 shrink-0">
                  <img
                    src="/images/chicken-dinner-badge.png"
                    alt="Chicken dinner"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-[#ffd24c] uppercase">WWCD CHAMPION</span>
                  <div className="text-xs font-black text-white uppercase truncate">
                    {currentLeader?.name ?? 'BIGETRON RA'}
                  </div>
                </div>
              </div>

              {/* Stats highlights */}
              <div className="flex items-center gap-2">
                <div className="text-center px-3 py-1 rounded bg-black/80 border border-[#d49b35]/30">
                  <div className="text-[8px] font-bold text-zinc-400 uppercase">RANK</div>
                  <div className="text-sm font-black text-[#ffd24c]">#1</div>
                </div>
                <div className="text-center px-3 py-1 rounded bg-black/80 border border-[#d49b35]/30">
                  <div className="text-[8px] font-bold text-zinc-400 uppercase">ELIMS</div>
                  <div className="text-sm font-black text-white">{currentLeader?.kills ?? 14}</div>
                </div>
                <div className="text-center px-3 py-1 rounded bg-black/80 border border-[#d49b35]/30">
                  <div className="text-[8px] font-bold text-zinc-400 uppercase">POINTS</div>
                  <div className="text-sm font-black text-[#ffd24c]">{currentLeader?.totalPoints ?? 24}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-zinc-400 border-t border-white/10 pt-1">
              <span>Menampilkan squad characters render, pan emas, running ticker, dan kartu skor lengkap</span>
              <span className="text-[#ffd24c] font-bold">10_winner-screen.html style</span>
            </div>
          </div>
        </div>
      </section>

      {/* Wipeout Elimination Alert Controller */}
      <section className="rounded-xl border border-red-500/30 bg-gradient-to-r from-[#18120e] via-[#221414] to-[#18120e] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isEliminationEnabled
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
              }`}
            >
              {isEliminationEnabled && <span className="size-2 rounded-full bg-red-400 animate-pulse" />}
              {isEliminationEnabled ? 'POPUP AKTIF' : 'POPUP NON-AKTIF'}
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#f5c553]">Pop-up Animasi Wipeout (Team Eliminated)</h4>
              <p className="text-[11px] text-muted-foreground">
                Animasi otomatis muncul saat tim tereliminasi (tema PMCC). Tampil di overlay utama dan /overlay/elimination.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerEliminationTest();
                toast.success('Animasi Wipeout Diuji!', 'Pop-up eliminasi muncul di layar selama 4.5 detik.');
              }}
              className="rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white px-3.5 py-1.5 text-xs font-bold shadow transition-all active:scale-95 flex items-center gap-1.5"
            >
              💥 Test Animasi Pop-up
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !isEliminationEnabled;
                setEliminationEnabled(next);
                toast.success(next ? 'Pop-up Eliminasi Diaktifkan' : 'Pop-up Eliminasi Dinonaktifkan');
              }}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              {isEliminationEnabled ? 'Matikan Pop-up' : 'Nyalakan Pop-up'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyEliminationUrl()}
              className="rounded-lg border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              title="Salin URL Browser Source terpisah untuk OBS"
            >
              📋 Salin URL /overlay/elimination
            </button>
          </div>
        </div>
      </section>

      {/* Search & Team Controller List */}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Daftar Kontrol Tim</h3>
          <input
            type="text"
            placeholder="Cari tim atau nomor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 sm:w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid gap-2.5">
          {filteredTeams.map((team) => (
            <div
              key={team.teamNo}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                team.isEliminated
                  ? 'border-border/40 bg-zinc-950/40 opacity-60'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              {/* Team Info */}
              <div className="flex items-center gap-3 min-w-[160px] sm:min-w-[200px]">
                <span className="size-7 rounded-lg bg-secondary/80 flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shrink-0">
                  #{team.rank}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{team.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tim {team.teamNo} &bull;{' '}
                    <span className="font-semibold text-foreground">{team.totalPoints} PTS</span>
                  </p>
                </div>
              </div>

              {/* Sisa Pemain (Alive Count) Buttons */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden md:inline">
                  Pemain:
                </span>
                {[4, 3, 2, 1, 0].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => void updateTeam({ teamNo: team.teamNo, aliveCount: num })}
                    className={`size-7 rounded-md text-xs font-bold transition-all ${
                      team.aliveCount === num
                        ? num === 0
                          ? 'bg-destructive text-white shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                    }`}
                    title={num === 0 ? 'Wipe / Semua Gugur' : `${num} pemain hidup`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Kills Controller */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline">
                  Kills:
                </span>
                <button
                  type="button"
                  onClick={() => void updateTeam({ teamNo: team.teamNo, deltaKills: -1 })}
                  disabled={team.kills <= 0}
                  className="size-7 rounded-md bg-secondary text-sm font-bold text-foreground hover:bg-secondary/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  value={team.kills}
                  onChange={(e) =>
                    void updateTeam({
                      teamNo: team.teamNo,
                      kills: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-12 rounded-md border border-border bg-background py-1 text-center font-mono text-xs font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void updateTeam({ teamNo: team.teamNo, deltaKills: 1 })}
                  className="size-7 rounded-md bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  +
                </button>
              </div>

              {/* Quick Wipe / Revive Action */}
              <div className="flex items-center gap-2">
                {team.isEliminated ? (
                  <button
                    type="button"
                    onClick={() => void updateTeam({ teamNo: team.teamNo, revive: true })}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    ↺ Revive
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void updateTeam({ teamNo: team.teamNo, eliminate: true })}
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    ✕ Wipe
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
