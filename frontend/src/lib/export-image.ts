import { toPng } from 'html-to-image';

export type ResolutionMode = '4k' | '1080p';

export interface ExportImageOptions {
  filename: string;
  resolution?: ResolutionMode;
  backgroundColor?: string;
  /** Custom pixel ratio override if needed */
  pixelRatio?: number;
  /** Fixed layout width of the source element (defaults to 1920) */
  width?: number;
  /** Fixed layout height of the source element (defaults to 1080) */
  height?: number;
}

/**
 * Exports an HTML element to a crisp, high-resolution PNG file and triggers a browser download.
 * Ensures the image does not get pixelated or blurry ("ga pecah") when shared on social media.
 *
 * Automatically:
 * 1. Waits for fonts to finish rendering.
 * 2. Filters out elements marked with `data-export-ignore="true"` or `.export-ignore`.
 * 3. Scales to high-DPI (4K UHD 3840×2160 or Full HD 1920×1080) for maximum clarity.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  options: ExportImageOptions,
): Promise<string> {
  const {
    filename,
    resolution = '4k',
    backgroundColor = '#000000',
    pixelRatio: customRatio,
    width = 1920,
    height = 1080,
  } = options;

  // 1. Ensure fonts are completely ready before measuring or capturing
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font readiness promise rejects
    }
  }

  // 2. Delay to let any pending renders settle
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 3. Target resolution
  const targetWidth = resolution === '4k' ? 3840 : 1920;
  const targetHeight = resolution === '4k' ? 2160 : 1080;
  const autoRatio = resolution === '4k' ? 2 : 1;
  const finalRatio = customRatio ?? autoRatio;

  // 4. Filter function: exclude any element with data-export-ignore or .export-ignore
  const filter = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (
        (typeof el.hasAttribute === 'function' && el.hasAttribute('data-export-ignore')) ||
        (typeof el.getAttribute === 'function' && el.getAttribute('data-export-ignore') === 'true') ||
        (el.classList && typeof el.classList.contains === 'function' && el.classList.contains('export-ignore'))
      ) {
        return false;
      }
    }
    return true;
  };

  const toPngConfig = {
    width,
    height,
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
    pixelRatio: finalRatio,
    style: {
      transform: 'none',
      transformOrigin: '0 0',
      width: `${width}px`,
      height: `${height}px`,
      margin: '0',
    },
    filter,
    backgroundColor,
    cacheBust: true,
    skipFonts: false,
  };

  let dataUrl: string;
  try {
    dataUrl = await toPng(element, toPngConfig);
  } catch (err) {
    console.warn('Initial toPng capture failed, attempting fallback without font embedding:', err);
    dataUrl = await toPng(element, { ...toPngConfig, skipFonts: true });
  }

  // 5. Trigger browser download
  const cleanFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
  const link = document.createElement('a');
  link.download = cleanFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}
