import { ChevronLeft, ChevronRight, Copy, Download, Link2, Mail, Maximize, MessageCircle, MessageSquare, Minus, Plus, RotateCw, Send, Share2, X } from "lucide-react";
import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PlanDocument } from "../lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

class ViewerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const WHEEL_PAGE_THRESHOLD = 90;
const PAGE_TURN_COOLDOWN_MS = 650;

function defaultScale() {
  if (typeof window === "undefined") return 0.5;
  const android = /Android/i.test(navigator.userAgent);
  const desktop = window.matchMedia("(min-width: 1024px)").matches;
  if (android || !desktop) return 1;
  return 0.5;
}

type Props = {
  planName: string;
  planNumber?: string | null;
  docs: PlanDocument[];
  activeUrl: string;
  onClose: () => void;
  onChangeDoc: (url: string) => void;
};

export function PdfViewer({
  planName,
  planNumber,
  docs,
  activeUrl,
  onClose,
  onChangeDoc,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(defaultScale);
  const [rotation, setRotation] = useState(0);
  const [pageWidth, setPageWidth] = useState(480);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const pageRef = useRef(page);
  const numPagesRef = useRef(numPages);
  const wheelAccumRef = useRef(0);
  const pageTurnLockRef = useRef(0);
  scaleRef.current = scale;
  pageRef.current = page;
  numPagesRef.current = numPages;

  const activeDoc = docs.find((d) => d.url === activeUrl) ?? docs[0];

  useEffect(() => {
    setPage(1);
    setScale(defaultScale());
    setRotation(0);
    setNumPages(0);
    setLoadError(null);
    setShareOpen(false);
    setCopied(null);
    wheelAccumRef.current = 0;
    pageTurnLockRef.current = 0;
  }, [activeUrl]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      setPageWidth(Math.max(240, width - 24));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
  const zoomIn = () => setScale((s) => clampZoom(s + ZOOM_STEP));
  const zoomOut = () => setScale((s) => clampZoom(s - ZOOM_STEP));
  const fitWidth = () => setScale(1);
  const goPage = (next: number) => {
    if (!numPages) return;
    setPage(Math.min(numPages, Math.max(1, next)));
  };

  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    if (!shareOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [shareOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (shareOpen) {
          setShareOpen(false);
          return;
        }
        onClose();
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") goPage(page + 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") goPage(page - 1);
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        fitWidth();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, page, numPages, shareOpen]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale((s) => clampZoom(s + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
        return;
      }

      const atTop = node.scrollTop <= 1;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
      const scrollingDown = e.deltaY > 0;
      const atEdge = scrollingDown ? atBottom : atTop;
      if (!atEdge) {
        wheelAccumRef.current = 0;
        return;
      }

      e.preventDefault();
      const now = Date.now();
      if (now < pageTurnLockRef.current) {
        wheelAccumRef.current = 0;
        return;
      }

      const delta =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * node.clientHeight : e.deltaY;
      if (wheelAccumRef.current && Math.sign(wheelAccumRef.current) !== Math.sign(delta)) {
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += delta;
      if (Math.abs(wheelAccumRef.current) < WHEEL_PAGE_THRESHOLD) return;

      const total = numPagesRef.current;
      const current = pageRef.current;
      if (!total) return;
      const next = Math.min(total, Math.max(1, current + (delta > 0 ? 1 : -1)));
      wheelAccumRef.current = 0;
      pageTurnLockRef.current = now + PAGE_TURN_COOLDOWN_MS;
      if (next === current) return;
      setPage(next);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    let startDist = 0;
    let startScale = 1;
    const distance = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = distance(e.touches);
        startScale = scaleRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !startDist) return;
      e.preventDefault();
      setScale(clampZoom(startScale * (distance(e.touches) / startDist)));
    };
    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove);
    };
  }, []);

  const onDocumentLoad = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setPage(1);
    setLoadError(null);
  }, []);

  const shareTitle = [planNumber ? `Plan ${planNumber}` : null, planName, activeDoc?.label]
    .filter(Boolean)
    .join(" · ");
  const shareUrl = typeof window === "undefined" ? activeUrl : new URL(activeUrl, window.location.origin).href;
  const shareText = `${shareTitle}\n${shareUrl}`;
  const fileName = `${(activeDoc?.label || "document").replace(/[<>:"/\\|?*]+/g, " ").trim()}.pdf`;

  const copy = async (value: string, kind: "link" | "text") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const shareNative = async () => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const canNative = mobile && typeof navigator.share === "function";
    if (!canNative) {
      setShareOpen((open) => !open);
      return;
    }
    try {
      const payload: ShareData = { title: shareTitle, text: shareTitle, url: shareUrl };
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        payload.files = [file];
      }
      await navigator.share(payload);
      setShareOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareOpen(false);
        return;
      }
      setShareOpen(true);
    }
  };

  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-card-foreground hover:bg-muted disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close preview" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <header className="relative z-20 shrink-0 border-b border-border px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <button type="button" className={iconBtn} onClick={onClose} aria-label="Close preview">
              <X className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {planNumber ? `Plan ${planNumber} · ` : ""}
                {planName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{activeDoc?.label}</p>
            </div>
            <div className="relative flex items-center" ref={shareMenuRef}>
              <button
                type="button"
                className={iconBtn}
                onClick={() => {
                  if (shareOpen) setShareOpen(false);
                  else void shareNative();
                }}
                aria-label="Share"
                aria-expanded={shareOpen}
              >
                <Share2 className="h-4 w-4" />
              </button>
              {shareOpen ? (
                <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card">
                  {typeof navigator !== "undefined" && "share" in navigator ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => void shareNative()}
                    >
                      <Share2 className="h-4 w-4" />
                      Device share
                    </button>
                  ) : null}
                  <a
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShareOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShareOpen(false)}
                  >
                    <Send className="h-4 w-4" />
                    Telegram
                  </a>
                  <a
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`}
                    onClick={() => setShareOpen(false)}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                  <a
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    href={`sms:?&body=${encodeURIComponent(shareText)}`}
                    onClick={() => setShareOpen(false)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </a>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void copy(shareUrl, "link")}
                  >
                    <Link2 className="h-4 w-4" />
                    {copied === "link" ? "Link copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void copy(shareText, "text")}
                  >
                    <Copy className="h-4 w-4" />
                    {copied === "text" ? "Text copied" : "Copy details"}
                  </button>
                </div>
              ) : null}
            </div>
            <a href={activeUrl} download className={iconBtn} aria-label="Download PDF">
              <Download className="h-4 w-4" />
            </a>
          </div>
          {docs.length > 1 ? (
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {docs.map((doc) => (
                <button
                  key={doc.url}
                  type="button"
                  onClick={() => onChangeDoc(doc.url)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    doc.url === activeUrl ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <div ref={stageRef} className="pdf-stage min-h-0 flex-1 overflow-auto bg-muted">
          {loadError ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{loadError}</p>
          ) : (
            <div className="flex justify-center p-3">
              <ViewerBoundary fallback={<p className="p-8 text-sm text-muted-foreground">Could not open this PDF.</p>}>
                <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading document…</p>}>
                  <Document
                    file={activeUrl}
                    onLoadSuccess={onDocumentLoad}
                    onLoadError={() => setLoadError("Could not open this PDF.")}
                  >
                    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading page…</p>}>
                      <Page
                        pageNumber={page}
                        width={pageWidth}
                        scale={scale}
                        rotate={rotation}
                        renderAnnotationLayer
                        renderTextLayer
                        className="pdf-page shadow-card"
                      />
                    </Suspense>
                  </Document>
                </Suspense>
              </ViewerBoundary>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-border px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center">
              <button type="button" className={iconBtn} onClick={() => goPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="num min-w-14 px-1 text-center text-xs sm:min-w-16 sm:text-sm">
                {page} / {numPages || "—"}
              </span>
              <button
                type="button"
                className={iconBtn}
                onClick={() => goPage(page + 1)}
                disabled={!numPages || page >= numPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <button type="button" className={iconBtn} onClick={zoomOut} disabled={scale <= MIN_ZOOM} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
              </button>
              <span className="num hidden w-10 text-center text-xs sm:inline">{Math.round(scale * 100)}%</span>
              <button type="button" className={iconBtn} onClick={zoomIn} disabled={scale >= MAX_ZOOM} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
              </button>
              <button type="button" className={`${iconBtn} hidden sm:inline-flex`} onClick={fitWidth} aria-label="Fit width">
                <Maximize className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
