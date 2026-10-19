import { useEffect, useRef, useState } from 'react';
import { DEFAULT_OVERLAY_APPEARANCE, type MatchState, type OverlayAppearance } from '@cdf/shared';
import { Camera, Check, Download, ExternalLink, Sparkles, X } from 'lucide-react';
import { LeaderboardOverlay } from '@/components/overlay/LeaderboardOverlay';
import { PostgameOverlay } from '@/components/overlay/PostgameOverlay';
import { RecapOverlay } from '@/components/overlay/RecapOverlay';
import { Top4Overlay } from '@/components/overlay/Top4Overlay';
import { WwcdOverlay } from '@/components/overlay/WwcdOverlay';
import { downloadElementAsPng, type ResolutionMode } from '@/lib/export-image';
import { toast } from '@/stores/toast-store';

export interface OverlayExportModalProps {
  open: boolean;
  onClose: () => void;
  type: string;
  match: MatchState;
  appearance?: OverlayAppearance;
}

export function OverlayExportModal({
  open,
  onClose,
  type,
  match,
  appearance,
}: OverlayExportModalProps) {
  const resolvedAppearance = appearance ?? DEFAULT_OVERLAY_APPEARANCE;
  const [resolution, setResolution] = useState<ResolutionMode>('4k');
  const [recapMode, setRecapMode] = useState<'all' | 'r1' | 'r2' | 'r3' | 'r4' | 'totals'>('all');
  const [postgameMode, setPostgameMode] = useState<'match' | 'series'>('match');
  const [isDownloading, setIsDownloading] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (!open) return;
    const calculateScale = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;
      const availW = Math.max(clientWidth - 24, 320);
      const availH = Math.max(clientHeight - 24, 180);
      const sX = availW / 1920;
      const sY = availH / 1080;
      setScale(Math.min(sX, sY));
    };

    calculateScale();
    const observer = new ResizeObserver(calculateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    window.addEventListener('resize', calculateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [open]);

  if (!open) return null;

  const handleDownload = async () => {
    if (!canvasRef.current || isDownloading) return;
    setIsDownloading(true);

    const now = new Date().toISOString().slice(0, 10);
    let filename = '';

    if (type === 'postgame') {
      const modeSuffix = postgameMode === 'match' ? 'Match' : 'Overall';
      const matchIdPart = match.matchId ? `-${match.matchId}` : '';
      filename = `PMCC-Postgame-${modeSuffix}${matchIdPart}-${now}.png`;
    } else if (type === 'recap') {
      const modeLabel =
        recapMode === 'all'
          ? 'Round-1-4-Breakdown'
          : recapMode === 'totals'
            ? 'Grand-Overall-Standings'
            : `Round-${recapMode.slice(1)}`;
      filename = `PMCC-Recap-${modeLabel}-${now}.png`;
    } else {
      filename = `PMCC-${type.toUpperCase()}-${now}.png`;
    }

    const el = canvasRef.current;
    const prevTransform = el.style.transform;
    el.style.transform = 'none';

    try {
      await downloadElementAsPng(el, {
        filename,
        resolution,
        width: 1920,
        height: 1080,
      });
      toast.success(
        'Gambar Berhasil Diunduh!',
        `${filename} tersimpan dalam format PNG (${resolution === '4k' ? '4K Ultra HD 3840×2160' : 'Full HD 1080p'}). Tajam, bersih & tidak kepotong!`,
      );
    } catch (err) {
      toast.error('Gagal mengunduh gambar', err instanceof Error ? err.message : String(err));
    } finally {
      el.style.transform = prevTransform;
      setIsDownloading(false);
    }
  };

  const overlayUrl = `/overlay/${type}`;

  const title =
    type === 'postgame'
      ? 'Export Postgame Standings ke PNG'
      : type === 'recap'
        ? 'Export Tournament Recap ke PNG'
        : `Export Overlay ${type.toUpperCase()} ke PNG`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[94vh] bg-[#0c141f] border border-[#d49b35]/40 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#121c2a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-[#ffd24c] via-[#f5c553] to-[#d49b35] text-[#18110a] shadow font-black">
              <Camera className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  {title}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="size-3" /> Anti-Pecah (HD)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unduh gambar broadcast berkualitas tinggi (4K Ultra HD) agar tidak buram / pecah saat di-post ke media sosial.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Action Controls & Options Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#0a111a] border-b border-white/10 text-xs">
          {/* Left: Mode / Round Selector (if applicable) */}
          <div className="flex flex-wrap items-center gap-2">
            {type === 'postgame' && (
              <>
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  Tampilan:
                </span>
                <div className="flex items-center bg-[#182333] p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPostgameMode('match')}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      postgameMode === 'match'
                        ? 'bg-[#ffd24c] text-[#18110a] shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Match Standings
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostgameMode('series')}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      postgameMode === 'series'
                        ? 'bg-[#ffd24c] text-[#18110a] shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Overall Standings
                  </button>
                </div>
              </>
            )}

            {type === 'recap' && (
              <>
                <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  Pilih Round:
                </span>
                <div className="flex items-center bg-[#182333] p-0.5 rounded-lg border border-white/10">
                  {(
                    [
                      ['all', 'ALL (R1-R4)'],
                      ['r1', 'Round 1'],
                      ['r2', 'Round 2'],
                      ['r3', 'Round 3'],
                      ['r4', 'Round 4'],
                      ['totals', 'Overall Totals'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRecapMode(val)}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all text-[11px] ${
                        recapMode === val
                          ? 'bg-[#ffd24c] text-[#18110a] shadow'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Quality Selector & Download Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-[#182333] p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setResolution('4k')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1.5 text-[11px] ${
                  resolution === '4k'
                    ? 'bg-gradient-to-r from-amber-400 to-[#ffd24c] text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Resolusi 3840×2160 (Paling tajam, tidak pecah saat upload medsos)"
              >
                {resolution === '4k' && <Check className="size-3 stroke-[3]" />}
                4K Ultra HD
              </button>
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1.5 text-[11px] ${
                  resolution === '1080p'
                    ? 'bg-zinc-200 text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Resolusi 1920×1080 (Standar Full HD)"
              >
                {resolution === '1080p' && <Check className="size-3 stroke-[3]" />}
                Full HD 1080p
              </button>
            </div>

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownload()}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-xs transition-all shadow-lg cursor-pointer ${
                isDownloading
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#ffd24c] via-[#f5c553] to-[#d49b35] text-[#18110a] hover:brightness-110 active:scale-95 border border-white/50 animate-pulse'
              }`}
            >
              <Download className={`size-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Menyiapkan Gambar...' : `Download PNG (${resolution.toUpperCase()})`}</span>
            </button>

            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold"
              title="Buka tampilan fullscreen di tab browser baru"
            >
              <ExternalLink className="size-3.5" />
              <span>Fullscreen</span>
            </a>
          </div>
        </div>

        {/* Live Preview Container (16:9 Aspect Ratio) */}
        <div
          ref={previewContainerRef}
          className="relative flex-1 min-h-[380px] max-h-[72vh] bg-black overflow-hidden flex items-center justify-center p-2 sm:p-4"
        >
          {/* Scaled frame matching the exact scaled size of 1920x1080 */}
          <div
            style={{
              width: `${Math.round(1920 * scale)}px`,
              height: `${Math.round(1080 * scale)}px`,
            }}
            className="relative overflow-hidden rounded-xl border border-[#d49b35]/40 shadow-2xl bg-black shrink-0"
          >
            {/* The actual 1920x1080 broadcast canvas */}
            <div
              ref={canvasRef}
              style={{
                width: '1920px',
                height: '1080px',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              className="absolute top-0 left-0 bg-black select-none"
            >
              {type === 'postgame' ? (
                <PostgameOverlay
                  match={match}
                  appearance={resolvedAppearance}
                  defaultMode={postgameMode}
                  className="w-[1920px] h-[1080px]"
                  animate={false}
                />
              ) : type === 'recap' ? (
                <RecapOverlay
                  match={match}
                  appearance={resolvedAppearance}
                  defaultMode={recapMode}
                  className="w-[1920px] h-[1080px]"
                  animate={false}
                />
              ) : type === 'wwcd' ? (
                <div className="w-[1920px] h-[1080px]">
                  <WwcdOverlay match={match} appearance={resolvedAppearance} />
                </div>
              ) : type === 'top4' ? (
                <div className="w-[1920px] h-[1080px]">
                  <Top4Overlay match={match} appearance={resolvedAppearance} />
                </div>
              ) : (
                <div className="w-[1920px] h-[1080px] p-6 flex items-center justify-center">
                  <LeaderboardOverlay match={match} appearance={resolvedAppearance} animateRows={false} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#0a111a] border-t border-white/10 text-[11px] text-muted-foreground">
          <span>
            Format: <strong>PNG 16∶9</strong> &bull; Ukuran export: {resolution === '4k' ? '3840 × 2160 (Ultra HD)' : '1920 × 1080 (Full HD)'} &bull; Tombol dan kontrol operator akan otomatis dihilangkan pada file gambar hasil download.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer px-2 py-0.5"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
