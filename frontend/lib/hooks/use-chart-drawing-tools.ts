"use client";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import type { ChartPoint, ChartShape, Candle, DrawingTool } from "@/lib/types/curriculum";
import { SINGLE_POINT_TOOLS } from "@/lib/types/curriculum";
import { TOOL_COLORS } from "@/lib/chart-drawing/tool-meta";
import { DrawingLayerPrimitive, type HandleKind } from "@/lib/chart-drawing/shape-primitive";

type DragState = { shapeId: string; handle: HandleKind; last: ChartPoint };

type Args = {
  candles: Candle[] | undefined;
};

export function useChartDrawingTools({ candles }: Args) {
  const [shapes, setShapes] = useState<ChartShape[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [pendingPoint, setPendingPoint] = useState<ChartPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<ChartPoint | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ point: ChartPoint; tool: "note" | "text" } | null>(null);

  const primitiveRef = useRef<DrawingLayerPrimitive>(new DrawingLayerPrimitive());
  const dragRef = useRef<DragState | null>(null);

  // Stabil event handler'ların (subscribeClick/subscribeCrosshairMove/native
  // pointerdown, hepsi tek seferlik attachToChart() içinde abone olunuyor)
  // her render'da yeniden abone olmadan en güncel state'i okuyabilmesi için
  // ref aynaları.
  const activeToolRef = useRef(activeTool);
  const pendingPointRef = useRef(pendingPoint);
  const magnetRef = useRef(magnet);
  const candlesRef = useRef(candles);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  useEffect(() => {
    pendingPointRef.current = pendingPoint;
  }, [pendingPoint]);
  useEffect(() => {
    magnetRef.current = magnet;
  }, [magnet]);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Primitive'in kendi çizim state'ini React state'iyle senkron tut.
  useEffect(() => {
    primitiveRef.current.setShapes(shapes);
  }, [shapes]);
  useEffect(() => {
    primitiveRef.current.setSelectedId(selectedShapeId);
  }, [selectedShapeId]);
  useEffect(() => {
    const preview =
      activeTool && pendingPoint && previewPoint ? { tool: activeTool, p1: pendingPoint, p2: previewPoint } : null;
    primitiveRef.current.setPreview(preview);
  }, [activeTool, pendingPoint, previewPoint]);
  useEffect(() => {
    primitiveRef.current.setPendingAnchor(pendingPoint && !previewPoint ? pendingPoint : null);
  }, [pendingPoint, previewPoint]);

  // Seçili şekli Delete/Backspace ile silme (input/textarea'da yazarken değil).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedShapeId) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        removeShape(selectedShapeId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShapeId]);

  function snapToCandlePoint(point: ChartPoint): ChartPoint {
    if (!magnetRef.current || !candlesRef.current || candlesRef.current.length === 0) return point;
    let closest = candlesRef.current[0];
    let minDiff = Infinity;
    for (const c of candlesRef.current) {
      const t = new Date(c.timestamp).getTime() / 1000;
      const diff = Math.abs(t - point.time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    const t = new Date(closest.timestamp).getTime() / 1000;
    const options = [closest.open, closest.high, closest.low, closest.close];
    let closestPrice = options[0];
    let minPriceDiff = Infinity;
    for (const p of options) {
      const diff = Math.abs(p - point.price);
      if (diff < minPriceDiff) {
        minPriceDiff = diff;
        closestPrice = p;
      }
    }
    return { time: t, price: closestPrice };
  }

  function pointFromParam(param: MouseEventParams<Time>, series: ISeriesApi<"Candlestick">): ChartPoint | null {
    if (!param.point || param.time === undefined) return null;
    const price = series.coordinateToPrice(param.point.y);
    if (price === null) return null;
    return { time: param.time as unknown as number, price };
  }

  function finalizeShape(tool: DrawingTool, p1: ChartPoint, p2: ChartPoint | undefined, text?: string) {
    const newShape: ChartShape = {
      id: crypto.randomUUID(),
      tool,
      p1,
      p2,
      color: TOOL_COLORS[tool],
      locked: false,
    };
    if (tool === "channel" && p2) {
      const baseOffset = Math.abs(p2.price - p1.price) * 0.3;
      const priceOffset = baseOffset || Math.abs(p1.price) * 0.03 || 1;
      newShape.p3 = { time: (p1.time + p2.time) / 2, price: (p1.price + p2.price) / 2 + priceOffset };
    }
    if (text) newShape.text = text;
    setShapes((prev) => [...prev, newShape]);
    setPendingPoint(null);
    setPreviewPoint(null);
    setActiveTool(null);
  }

  function selectTool(tool: DrawingTool) {
    setActiveTool((prev) => (prev === tool ? null : tool));
    setPendingPoint(null);
    setPreviewPoint(null);
    setNoteDraft(null);
    setSelectedShapeId(null);
  }

  function deselectTool() {
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
    setNoteDraft(null);
  }

  function confirmNote(text: string) {
    if (!noteDraft || !text.trim()) {
      setNoteDraft(null);
      setActiveTool(null);
      return;
    }
    const newShape: ChartShape = {
      id: crypto.randomUUID(),
      tool: noteDraft.tool,
      p1: noteDraft.point,
      text: text.trim(),
      color: TOOL_COLORS[noteDraft.tool],
      locked: false,
    };
    setShapes((prev) => [...prev, newShape]);
    setNoteDraft(null);
    setActiveTool(null);
  }

  function cancelNote() {
    setNoteDraft(null);
    setActiveTool(null);
  }

  function removeShape(id: string) {
    setShapes((prev) => {
      const s = prev.find((x) => x.id === id);
      if (s?.locked) return prev;
      return prev.filter((x) => x.id !== id);
    });
    setSelectedShapeId((prev) => (prev === id ? null : prev));
    if (dragRef.current?.shapeId === id) dragRef.current = null;
  }

  function toggleLock(id: string) {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)));
    setSelectedShapeId((prev) => (prev === id ? null : prev));
  }

  function clearShapes() {
    setShapes((prev) => prev.filter((s) => s.locked));
    setSelectedShapeId(null);
  }

  // "Geri al" — sadece en son eklenen (kilitli olmayan) şekli diziden çıkarır.
  // clearShapes'ten (hepsini temizle) ayrı tutulur, birbirine karışmaz.
  function undoLastShape() {
    setShapes((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i].locked) {
          const removedId = prev[i].id;
          setSelectedShapeId((sel) => (sel === removedId ? null : sel));
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        }
      }
      return prev;
    });
  }

  function loadShapes(newShapes: ChartShape[]) {
    setShapes(newShapes);
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
    setNoteDraft(null);
    setSelectedShapeId(null);
  }

  // Bir grafik (yeniden) oluşturulduğunda çağrılır: çizim motorunu bu chart'a
  // bağlar (primitive attach + click/crosshair aboneliği + sürükleme için
  // native pointerdown/up). Döndürülen fonksiyon her şeyi geri söker.
  function attachToChart(chart: IChartApi, series: ISeriesApi<"Candlestick">, container: HTMLElement): () => void {
    series.attachPrimitive(primitiveRef.current);

    function onClick(param: MouseEventParams<Time>) {
      const tool = activeToolRef.current;
      if (!tool) return;
      const raw = pointFromParam(param, series);
      if (!raw) return;
      const point = snapToCandlePoint(raw);

      if (tool === "note" || tool === "text") {
        setNoteDraft({ point, tool });
        return;
      }
      if (SINGLE_POINT_TOOLS.includes(tool)) {
        finalizeShape(tool, point, undefined);
        return;
      }
      const pending = pendingPointRef.current;
      if (!pending) {
        setPendingPoint(point);
      } else {
        finalizeShape(tool, pending, point);
      }
    }

    // NOT: sürükleme takibi bilerek chart.subscribeCrosshairMove'a değil,
    // window üzerindeki native pointermove'a bağlanıyor. Kütüphanenin kendi
    // crosshair-move event'i, buton basılıyken (aktif bir pan/drag jesti
    // sırasında) güvenilir şekilde ateşlenmeyebiliyor — bu yüzden koordinat
    // çevrimini (coordinateToTime/coordinateToPrice) burada kendimiz, tıpkı
    // nokta yerleştirmede olduğu gibi, doğrudan native event'ten yapıyoruz.
    function onWindowPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      if (time === null || price === null) return;
      const raw: ChartPoint = { time: time as unknown as number, price };
      const deltaTime = raw.time - drag.last.time;
      const deltaPrice = raw.price - drag.last.price;
      applyDragDelta(drag.shapeId, drag.handle, deltaTime, deltaPrice);
      drag.last = raw;
    }

    function onCrosshairMove(param: MouseEventParams<Time>) {
      if (dragRef.current) return; // sürükleme onWindowPointerMove'da işleniyor
      if (activeToolRef.current && pendingPointRef.current) {
        const raw = pointFromParam(param, series);
        if (raw) setPreviewPoint(snapToCandlePoint(raw));
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (activeToolRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = primitiveRef.current.hitTest(x, y);
      if (!hit) {
        setSelectedShapeId(null);
        return;
      }
      e.preventDefault();
      const [shapeId, handle] = hit.externalId.split("::") as [string, HandleKind];
      setSelectedShapeId(shapeId);
      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      if (time === null || price === null) return;
      dragRef.current = { shapeId, handle, last: { time: time as unknown as number, price } };
      chart.applyOptions({ handleScroll: false, handleScale: false });
    }

    function onPointerUp() {
      if (dragRef.current) {
        dragRef.current = null;
        chart.applyOptions({ handleScroll: true, handleScale: true });
      }
    }

    chart.subscribeClick(onClick);
    chart.subscribeCrosshairMove(onCrosshairMove);
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      series.detachPrimitive(primitiveRef.current);
      chart.unsubscribeClick(onClick);
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dragRef.current = null;
    };
  }

  function applyDragDelta(shapeId: string, handle: HandleKind, deltaTime: number, deltaPrice: number) {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId || s.locked) return s;
        const shift = (p: ChartPoint): ChartPoint => ({ time: p.time + deltaTime, price: p.price + deltaPrice });
        if (handle === "body") {
          return {
            ...s,
            p1: shift(s.p1),
            p2: s.p2 ? shift(s.p2) : undefined,
            p3: s.p3 ? shift(s.p3) : undefined,
          };
        }
        if (handle === "p1") {
          if (s.tool === "horizontal") return { ...s, p1: { ...s.p1, price: s.p1.price + deltaPrice } };
          if (s.tool === "vertical") return { ...s, p1: { ...s.p1, time: s.p1.time + deltaTime } };
          return { ...s, p1: shift(s.p1) };
        }
        if (handle === "p2" && s.p2) return { ...s, p2: shift(s.p2) };
        if (handle === "p3" && s.p3) return { ...s, p3: shift(s.p3) };
        return s;
      })
    );
  }

  return {
    shapes,
    activeTool,
    pendingPoint,
    previewPoint,
    selectedShapeId,
    magnet,
    setMagnet,
    noteDraft,
    selectTool,
    deselectTool,
    confirmNote,
    cancelNote,
    removeShape,
    toggleLock,
    clearShapes,
    undoLastShape,
    loadShapes,
    attachToChart,
  };
}
