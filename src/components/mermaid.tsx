'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from 'next-themes';
import {
  Expand,
  Pencil,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import LZString from 'lz-string';

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <Skeleton />;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, unknown>();

async function loadMermaid() {
  const cached = cache.get('mermaid');
  if (cached) return cached as typeof import('mermaid').default;
  const mod = await import('mermaid');
  cache.set('mermaid', mod.default);
  return mod.default;
}

const mermaidToExcalidrawCache = new Map<string, unknown>();

async function loadMermaidToExcalidraw() {
  const cached = mermaidToExcalidrawCache.get('converter');
  if (cached) return cached as typeof import('@excalidraw/mermaid-to-excalidraw');
  const mod = await import('@excalidraw/mermaid-to-excalidraw');
  mermaidToExcalidrawCache.set('converter', mod);
  return mod;
}

function cssVar(name: string) {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const facts = [
  'Always craft a bed dummy first thing so you can safely roam the prison corridors or dig tunnels during lights out.',
  'Keep an eye out for a green checkmark next to your daily routines — once you get it, you can leave to go steal from empty cells.',
  'Foil is your best friend. Wrap your key molds or cutters in a contraband pouch so you can walk through metal detectors without triggering an audit.',
  'Increase your intellect stat early by reading in the library — high intellect is required to craft the best tools like sturdier cutters and shovels.',
  "If you need to get rid of contraband quickly during an unannounced cell shakedown, flush it down the toilet or hide it in the desk of a cellmate you don't like.",
  "Wear a guard outfit at night to drastically lower your profile, but don't get too close to them or the security dogs — they will sniff you out.",
  'Beat up guards in isolated areas like the library or blind spots to steal their security keys. Just make sure to mold the key and put the original back before they wake up.',
  'Multiplayer opens up completely unique escape methods, like the "winging it" escape on the train or cooperative door-breaking routes.',
  'If you are planning a tunnel escape, start digging from right under your desk so you can easily cover the hole with the desk when guards pass by.',
  'Keep your heat level low by attending roll calls on time — if your heat hits 100, the guards and dogs will immediately hunt you down.',
  'Bribe other inmates by gifting them items or cash to raise their opinion of you — high opinion means they will help you fight guards or sell you rarer items.',
  'Use duct tape and sheets to cover the security cameras in a room if you need to beat up an inmate or break a wall without instantly raising the alarm.',
  'Always check the prison job board — getting a job like the mailroom or waste disposal gives you easy access to restricted areas of the prison map.',
  'If you run out of energy while working out or crafting, head to the cafeteria during meal times or take a quick shower to rapidly regenerate your stamina.',
  'Never leave wall blocks, vent covers, or cut fences exposed during the daytime — guards on patrol will spot them instantly and throw the prison into lockdown.',
];

function Skeleton() {
  const [fact] = useState(() => facts[Math.floor(Math.random() * facts.length)]);

  return (
    <div className="my-4 min-h-[500px] animate-pulse rounded-lg border bg-fd-muted p-6 flex flex-col items-center justify-center gap-4">
      <p>Loading diagram...</p>
        <p className="text-xs font-semibold  text-fd-muted-foreground">Top tip:</p>
        <p className="mt-2 text-sm text-fd-muted-foreground/80">{fact}</p>
      </div>
  );
}

const Button: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className="flex size-7 items-center justify-center rounded-md border bg-fd-secondary text-xs hover:bg-fd-accent"
  >
    {children}
  </button>
);

function fitSvg(container: HTMLElement) {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return null;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0 || cw === 0 || ch === 0) return null;
  const zoom = Math.min(cw / rect.width, ch / rect.height) * 0.9;
  return {
    zoom,
    pan: { x: (cw - rect.width * zoom) / 2, y: (ch - rect.height * zoom) / 2 },
  };
}

function MermaidContent({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [svg, setSvg] = useState('');
  const bindFunctionsRef = useRef<((el: HTMLElement) => void) | null>(null);
  const [svgId] = useState(() => 'mermaid-' + Math.random().toString(36).slice(2));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [excalidrawLoading, setExcalidrawLoading] = useState(false);

  const themeVars = useMemo(() => ({
    primaryColor: cssVar('--color-fd-card') || (resolvedTheme === 'dark' ? '#1e1e2e' : '#e6e9ef'),
    primaryBorderColor: cssVar('--color-fd-border') || (resolvedTheme === 'dark' ? '#313244' : '#ccd0da'),
    primaryTextColor: cssVar('--color-fd-foreground') || (resolvedTheme === 'dark' ? '#cdd6f4' : '#4c4f69'),
    lineColor: cssVar('--color-fd-border') || (resolvedTheme === 'dark' ? '#45475a' : '#bcc0cc'),
    secondaryColor: cssVar('--color-fd-muted') || (resolvedTheme === 'dark' ? '#181825' : '#eff1f5'),
    tertiaryColor: cssVar('--color-fd-card') || (resolvedTheme === 'dark' ? '#1e1e2e' : '#e6e9ef'),
    background: cssVar('--color-fd-background') || (resolvedTheme === 'dark' ? '#11111b' : '#eff1f5'),
    mainBkg: cssVar('--color-fd-card') || (resolvedTheme === 'dark' ? '#1e1e2e' : '#e6e9ef'),
    nodeBorder: cssVar('--color-fd-border') || (resolvedTheme === 'dark' ? '#45475a' : '#ccd0da'),
    clusterBkg: cssVar('--color-fd-muted') || (resolvedTheme === 'dark' ? '#181825' : '#eff1f5'),
    clusterBorder: cssVar('--color-fd-border') || (resolvedTheme === 'dark' ? '#313244' : '#ccd0da'),
    titleColor: cssVar('--color-fd-foreground') || (resolvedTheme === 'dark' ? '#cdd6f4' : '#4c4f69'),
    edgeLabelBackground: cssVar('--color-fd-card') || (resolvedTheme === 'dark' ? '#1e1e2e' : '#e6e9ef'),
    nodeTextColor: cssVar('--color-fd-foreground') || (resolvedTheme === 'dark' ? '#cdd6f4' : '#4c4f69'),
  }), [resolvedTheme]);

  // Load mermaid and render
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await loadMermaid();
      if (cancelled) return;
      mod.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        theme: 'base',
        themeVariables: themeVars,
      });
      const result = await mod.render(svgId, chart.replaceAll('\\n', '\n'));
      if (cancelled) return;
      setSvg(result.svg);
      bindFunctionsRef.current = result.bindFunctions ?? null;
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [chart, resolvedTheme, svgId, themeVars]);

  useLayoutEffect(() => {
    if (loading) return;
    const el = wheelRef.current;
    if (!el) return;
    const f = fitSvg(el);
    if (!f) return;
    zoomRef.current = f.zoom;
    panRef.current = f.pan;
    setZoom(f.zoom);
    setPan(f.pan);
  }, [loading, svg]);

  const zoomToward = useCallback(
    (factor: number, cx: number, cy: number) => {
      const prevZoom = zoomRef.current;
      const newZoom = prevZoom * factor;
      const newPanX = cx - factor * (cx - panRef.current.x);
      const newPanY = cy - factor * (cy - panRef.current.y);
      zoomRef.current = newZoom;
      panRef.current = { x: newPanX, y: newPanY };
      setZoom(newZoom);
      setPan(panRef.current);
    },
    [],
  );

  const zoomIn = useCallback(() => {
    const el = wheelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    zoomToward(1.4, r.width / 2, r.height / 2);
  }, [zoomToward]);

  const zoomOut = useCallback(() => {
    const el = wheelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    zoomToward(1 / 1.4, r.width / 2, r.height / 2);
  }, [zoomToward]);

  const reset = useCallback(() => {
    const el = wheelRef.current;
    if (!el) return;
    const f = fitSvg(el);
    if (!f) return;
    zoomRef.current = f.zoom;
    panRef.current = f.pan;
    setZoom(f.zoom);
    setPan(f.pan);
  }, []);

  const toggleExpand = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  const openInExcalidraw = useCallback(async () => {
    setExcalidrawLoading(true);
    try {
      const { parseMermaidToExcalidraw } = await loadMermaidToExcalidraw();
      const { elements } = await parseMermaidToExcalidraw(chart, {});
      const scene = {
        type: 'excalidraw',
        elements,
        appState: { viewBackgroundColor: cssVar('--color-fd-background') || '#ffffff' },
        version: 2,
      };
      const json = JSON.stringify(scene);
      const compressed = LZString.compressToBase64(json);
      const url = `https://excalidraw.com/#json=${encodeURIComponent(compressed)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // silently fail
    } finally {
      setExcalidrawLoading(false);
    }
  }, [chart, resolvedTheme]);

  // Passive: false wheel handler to prevent page scroll
  useEffect(() => {
    const el = wheelRef.current;
    if (!el || loading) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newZoom = zoomRef.current * factor;
      const newPanX = cx - factor * (cx - panRef.current.x);
      const newPanY = cy - factor * (cy - panRef.current.y);
      zoomRef.current = newZoom;
      panRef.current = { x: newPanX, y: newPanY };
      setZoom(newZoom);
      setPan(panRef.current);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [expanded, loading]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panRef.current = { ...panRef.current };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    panRef.current = {
      x: panRef.current.x + e.movementX,
      y: panRef.current.y + e.movementY,
    };
    setPan({ ...panRef.current });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    setIsPanning(false);
  }, []);

  if (loading) return <Skeleton />;

  const diagram = (
    <div
      className="flex items-center justify-center"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isPanning ? 'none' : 'transform 0.15s ease',
          transformOrigin: '0 0',
        }}
        ref={(svgContainer) => {
          bindFunctionsRef.current?.(svgContainer!);
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );

  const buttons = (
    <>
      <Button onClick={zoomIn} title="Zoom in">
        <ZoomIn size={14} />
      </Button>
      <Button onClick={zoomOut} title="Zoom out">
        <ZoomOut size={14} />
      </Button>
      <Button onClick={reset} title="Fit to container">
        <Minimize2 size={14} />
      </Button>
      <Button onClick={openInExcalidraw} title={excalidrawLoading ? 'Loading...' : 'Open in Excalidraw'}>
        {excalidrawLoading ? <Expand size={14} className="animate-spin" /> : <Pencil size={14} />}
      </Button>
      <Button onClick={toggleExpand} title={expanded ? 'Close overlay' : 'Expand to full page'}>
        {expanded ? <X size={14} /> : <Maximize2 size={14} />}
      </Button>
    </>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: cssVar('--color-fd-background') || (resolvedTheme === 'dark' ? '#11111b' : '#eff1f5') }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        <div
          ref={wheelRef}
          className="relative flex size-full items-center justify-center"
        >
          {diagram}
          <div className="absolute right-4 top-4 flex gap-1">
            {buttons}
          </div>
          {zoom !== 1 && (
            <div className="absolute bottom-4 left-4 rounded-md border bg-fd-secondary px-2 py-0.5 text-xs tabular-nums">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wheelRef}
      className="group relative my-4 min-h-[500px] overflow-hidden rounded-lg border"
    >
      <div ref={containerRef}>{diagram}</div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {buttons}
      </div>
      {zoom !== 1 && (
        <div className="absolute bottom-2 left-2 rounded-md border bg-fd-secondary px-2 py-0.5 text-xs tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}

export default Mermaid;
