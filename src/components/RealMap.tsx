import { useEffect, useMemo, useRef, useState } from "react"
import { feature } from "topojson-client"
import { Delaunay } from "d3-delaunay"
import { polygonHull } from "d3-polygon"
import { geoMercator, geoNaturalEarth1, geoPath, geoBounds } from "d3-geo"
import type { MapDefinition } from "../data/territories"
import type { TerritoryState, Player } from "../store/game"

interface RealMapProps {
  mapId: 'world' | 'turkey' | 'europe'
  mapDefinition: MapDefinition
  territories: TerritoryState[]
  players: Player[]
  selected?: { from?: string | null; to?: string | null }
  onTerritoryClick?: (territoryId: string) => void
  onTerritoryMouseDown?: (territoryId: string) => void
  onTerritoryMouseUp?: (territoryId: string) => void
  currentPlayerId?: number
  phase?: 'setup' | 'placement' | 'draft' | 'attack' | 'fortify'
  placementStage?: 'claim' | 'distribute'
  suggestedId?: string
  focusTerritoryId?: string
  lowEffects?: boolean
  // optional compact attack actions rendered on-map
  onAttackOnce?: () => void
  onAllIn?: () => void
  onEndAttack?: () => void
  lastBattleResult?: { conquered?: boolean; attackerLosses?: number; defenderLosses?: number } | null
  // optional compact fortify actions rendered on-map
  onFortifyOne?: () => void
  onFortifyAll?: () => void
  // optional compact conquest move actions rendered on-map
  onConquestOne?: () => void
  onConquestAll?: () => void
}

export default function RealMap({
  mapId,
  mapDefinition,
  territories,
  players,
  selected,
  onTerritoryClick,
  onTerritoryMouseDown,
  onTerritoryMouseUp,
  currentPlayerId = -1,
  phase,
  placementStage,
  suggestedId,
  focusTerritoryId,
  lowEffects = false,
  onAttackOnce,
  onAllIn,
  onEndAttack,
  lastBattleResult,
  onFortifyOne,
  onFortifyAll,
  onConquestOne,
  onConquestAll
}: RealMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [transform, setTransform] = useState<{ scale: number; tx: number; ty: number }>({ scale: 1, tx: 0, ty: 0 })
  const draggingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{ d: number; cx: number; cy: number } | null>(null)
  const touchStartClientRef = useRef<{ x: number; y: number } | null>(null)
  const touchMovedRef = useRef(false)
  const lastTapRef = useRef<number>(0)
  const touchClickBlockUntilRef = useRef<number>(0)
  // Simple inertia for touch panning
  const inertiaRef = useRef<{ vx: number; vy: number; lastTs: number; raf: number | null }>({ vx: 0, vy: 0, lastTs: 0, raf: null })
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [minimapActive, setMinimapActive] = useState(true)
  const minimapTimerRef = useRef<number | null>(null)
  // World base topology (lazy-loaded to split bundle)
  const [worldTopo, setWorldTopo] = useState<any | null>(null)
  // Track army placement increases for pop animation
  const prevArmiesRef = useRef<Record<string, number>>({})
  const [flashIds, setFlashIds] = useState<Record<string, number>>({})
  useEffect(() => {
    const t = window.setTimeout(() => setMinimapActive(false), 1200)
    return () => window.clearTimeout(t)
  }, [])
  // Lazy-load world topology once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // dynamic import (bundler will transform JSON to JS module)
        const mod: any = await import("world-atlas/countries-110m.json")
        if (!cancelled) setWorldTopo(mod?.default || mod)
      } catch {
        if (!cancelled) setWorldTopo(null)
      }
    })()
    return () => { cancelled = true }
  }, [])
  // Detect increases
  useEffect(() => {
    const now = Date.now()
    const nextPrev: Record<string, number> = { ...prevArmiesRef.current }
    territories.forEach(st => {
      const old = prevArmiesRef.current[st.id]
      if (old != null && st.armies > old) {
        try { (navigator as any)?.vibrate?.(10) } catch {}
        setFlashIds(f => {
          const nf = { ...f, [st.id]: now + 900 }
          window.setTimeout(() => {
            setFlashIds(ff => {
              const g = { ...ff }
              if (g[st.id] && g[st.id] <= Date.now()) {
                delete g[st.id]
              }
              return g
            })
          }, 950)
          return nf
        })
      }
      nextPrev[st.id] = st.armies
    })
    prevArmiesRef.current = nextPrev
  }, [territories])

  const { countryFeatures, projection, path, canvas, isMobile } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const world = worldTopo as any
    // Build countries safely even if world hasn't loaded yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = (world && world.objects && (world.objects as any).countries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (feature(world, (world.objects as any).countries) as any)
      : ({ type: 'FeatureCollection', features: [] } as any)

    // Build a feature for current map
    let f: any = null
    let featuresArray: any[] = []
    // Fallback geometry derived from mapDefinition points (keeps projection fit sane while topo loads)
    const coordPts: Array<[number, number]> = []
    for (const t of (mapDefinition?.territories ?? [])) {
      if (t.lon != null && t.lat != null) coordPts.push([t.lon, t.lat])
    }
    const fallbackGeom: any = coordPts.length ? ({ type: 'MultiPoint', coordinates: coordPts } as any) : ({ type: 'Sphere' } as any)

    if (mapId === 'world') {
      // Use all countries as backdrop for world (or Sphere until topology loads)
      if (countries.features && countries.features.length) {
        f = countries
        featuresArray = countries.features || []
      } else {
        f = fallbackGeom
        featuresArray = []
      }
      // removed regional boundary mesh (visual hint disabled)
    } else if (mapId === 'turkey') {
      // Use Türkiye feature if available; else fallback to Sphere until loaded
      if (countries.features && countries.features.length) {
      f = countries.features.find((cf: any) => String(cf.id) === '792')
        featuresArray = f ? [f] : []
      }
      if (!f) {
        f = fallbackGeom
        featuresArray = []
      }
    } else if (mapId === 'europe') {
      const europeFeatures: any[] = []
      for (const cf of (countries.features || [])) {
        try {
          const b = geoBounds(cf as any)
          const [[minLon, minLat], [maxLon, maxLat]] = b
          const cenLon = (minLon + maxLon) / 2
          const cenLat = (minLat + maxLat) / 2
          if (cenLon >= -35 && cenLon <= 60 && cenLat >= 34 && cenLat <= 72) {
            europeFeatures.push(cf)
          }
        } catch {}
      }
      if (europeFeatures.length) {
        const multipolyCoords: any[] = []
        for (const ef of europeFeatures) {
          const geom = (ef as any).geometry
          if (!geom) continue
          if (geom.type === 'Polygon') multipolyCoords.push(geom.coordinates)
          else if (geom.type === 'MultiPolygon') {
            for (const p of geom.coordinates) multipolyCoords.push(p)
          }
        }
        f = { type: 'MultiPolygon', coordinates: multipolyCoords }
        featuresArray = europeFeatures
        // regional mesh removed (visual hint disabled)
      } else {
        f = fallbackGeom
        featuresArray = []
      }
    }

    const mobile = typeof window !== 'undefined' && window.innerWidth < 768
    const canvas = mapId === 'world'
      ? (mobile ? { w: 1100, h: 260 } : { w: 1100, h: 520 })
      : (mobile ? { w: 1100, h: 320 } : { w: 1000, h: 520 })

    let projection = (mapId === 'world' ? geoNaturalEarth1() : geoMercator()).fitSize([canvas.w, canvas.h], (mapId === 'world' ? (f as any) : (f as any)))
    if (mapId === 'europe') {
      const currentTranslate = projection.translate()
      const currentScale = projection.scale()
      projection = projection
        .translate([currentTranslate[0] + 60, currentTranslate[1] + 180])
        .scale(currentScale * 2.0)
    }
    const path = geoPath(projection)
    return { countryFeatures: featuresArray.length ? featuresArray : [f], projection, path, canvas, isMobile: mobile }
  }, [mapId, worldTopo])

  // Precompute Voronoi regions for territory coloring
  const voronoiData = useMemo(() => {
    const idToTerr = new Map(mapDefinition.territories.map(t => [t.id, t]))
    const pts: Array<{ id: string; x: number; y: number }> = []
    // First pass: add those with explicit coords
    for (const t of mapDefinition.territories) {
      if (t.lon != null && t.lat != null) {
        const p = projection([t.lon, t.lat]) as [number, number]
        if (p) pts.push({ id: t.id, x: p[0], y: p[1] })
      }
    }
    // Second pass: derive missing from neighbor averages
    for (const t of mapDefinition.territories) {
      if (t.lon != null && t.lat != null) continue
      const neighs = (t.neighbors || []).map(n => idToTerr.get(n)).filter(Boolean) as typeof mapDefinition.territories
      const coords = neighs
        .filter(n => n.lon != null && n.lat != null)
        .map(n => projection([n.lon as number, n.lat as number]) as [number, number])
        .filter(Boolean)
      if (coords.length >= 1) {
        const sx = coords.reduce((s, c) => s + c[0], 0)
        const sy = coords.reduce((s, c) => s + c[1], 0)
        const cx = sx / coords.length
        const cy = sy / coords.length
        pts.push({ id: t.id, x: cx, y: cy })
      }
    }
    if (pts.length < 3) return null
    const delaunay = Delaunay.from(pts, d => d.x, d => d.y)
    const vor = delaunay.voronoi([0, 0, canvas.w, canvas.h])
    return { pts, vor }
  }, [mapDefinition, projection, canvas])

  // Memo: projected coords by territory id, and quick lookup maps
  const projectedById = useMemo(() => {
    const out = new Map<string, [number, number]>()
    for (const t of mapDefinition.territories) {
      if (t.lon == null || t.lat == null) continue
      const p = projection([t.lon, t.lat]) as [number, number]
      if (p) out.set(t.id, p)
    }
    return out
  }, [mapDefinition, projection])
  const stateById = useMemo(() => {
    const m = new Map<string, TerritoryState>()
    territories.forEach(st => m.set(st.id, st))
    return m
  }, [territories])
  const playerById = useMemo(() => {
    const m = new Map<number, Player>()
    players.forEach(p => m.set(p.id, p))
    return m
  }, [players])
  // Fallback clip hull from projected points
  const clipHullPathD = useMemo(() => {
    const pts = Array.from(projectedById.values())
    if (pts.length < 3) return null
    const hull = polygonHull(pts as Array<[number, number]>)
    if (!hull || hull.length < 3) return null
    return `M ${hull.map(([x, y]) => `${x},${y}`).join(' L ')} Z`
  }, [projectedById])

  // Continent hulls (separate scoring regions)
  const continentHulls = useMemo(() => {
    const groups: Record<string, Array<[number, number]>> = {}
    for (const t of mapDefinition.territories) {
      if (t.lon == null || t.lat == null) continue
      const p = projection([t.lon, t.lat]) as [number, number]
      if (!p) continue
      if (!groups[t.continent]) groups[t.continent] = []
      groups[t.continent].push([p[0], p[1]])
    }
    const hulls: Array<{ id: string; hull: Array<[number, number]> }> = []
    Object.keys(groups).forEach(id => {
      const h = polygonHull(groups[id])
      if (h && h.length >= 3) hulls.push({ id, hull: h as Array<[number, number]> })
    })
    return hulls
  }, [mapDefinition, projection])
  // Center on requested territory
  useEffect(() => {
    if (!focusTerritoryId) return
    const t = mapDefinition.territories.find(tt => tt.id === focusTerritoryId)
    if (!t || t.lon == null || t.lat == null) return
    const xy = projection([t.lon, t.lat]) as [number, number]
    centerOnContent(xy[0], xy[1])
    // small zoom-in when fully zoomed out
    setTransform(tr => ({ ...tr, scale: Math.max(1, tr.scale) }))
  }, [focusTerritoryId, mapDefinition, projection])

  const ownerOf = (territoryId: string) => {
    const t = stateById.get(territoryId)
    if (!t || t.ownerId === -1) return null
    return playerById.get(t.ownerId) || null
  }

  const selectedFrom = (typeof (selected?.from) === 'string' ? (selected as { from: string }).from : undefined) as string | undefined
  const fromDef = selectedFrom ? mapDefinition.territories.find(t => t.id === selectedFrom) : undefined
  const lang = (typeof document !== 'undefined' && document.documentElement.lang?.toLowerCase().startsWith('en')) ? 'en' : 'tr'
  const ctrlSize = isMobile ? 28 : 28
  const hitSize = isMobile ? 40 : 34
  const ctrlText = isMobile ? 16 : 14
  const ctrlTextSmall = isMobile ? 11 : 10
  const ctrlSpacing = 8
  const ctrlMargin = 12
  const ctrlStackH = ctrlSize * 4 + ctrlSpacing * 3
  const controlsX = canvas.w - (ctrlSize + 12)
  const controlsY = canvas.h - (ctrlStackH + ctrlMargin)

  // Reset view on map change
  useEffect(() => {
    const scaleInit = isMobile ? 1.25 : 1
    const txInit = (1 - scaleInit) * (canvas.w / 2)
    const tyInit = (1 - scaleInit) * (canvas.h / 2)
    setTimeout(() => {
      setTransform({ scale: scaleInit, tx: txInit, ty: tyInit })
    }, 0)
  }, [mapId, isMobile, canvas.w, canvas.h])

  const svgToViewBox = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.w
    const y = ((clientY - rect.top) / rect.height) * canvas.h
    return { x, y }
  }

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
  const centerOnContent = (cx: number, cy: number) => {
    setTransform(t => ({
      ...t,
      tx: canvas.w / 2 - t.scale * cx,
      ty: canvas.h / 2 - t.scale * cy
    }))
  }

  const handleWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    // activity ping
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    const { x, y } = svgToViewBox(e.clientX, e.clientY)
    const delta = -e.deltaY
    const zoomIntensity = 0.0015
    const factor = Math.exp(delta * zoomIntensity)
    const newScale = clamp(transform.scale * factor, 0.7, 3.5)
    // keep point (x,y) stable: t' = p' - s' * p, p' = s * p + t
    const px = x
    const py = y
    const ppx = transform.scale * px + transform.tx
    const ppy = transform.scale * py + transform.ty
    const newTx = ppx - newScale * px
    const newTy = ppy - newScale * py
    setTransform({ scale: newScale, tx: newTx, ty: newTy })
  }

  const handleMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    draggingRef.current = true
    lastPosRef.current = svgToViewBox(e.clientX, e.clientY)
  }
  const handleMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!draggingRef.current || !lastPosRef.current) return
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    const cur = svgToViewBox(e.clientX, e.clientY)
    const dx = (cur.x - lastPosRef.current.x) * transform.scale
    const dy = (cur.y - lastPosRef.current.y) * transform.scale
    lastPosRef.current = cur
    setTransform(t => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }))
  }
  const endDrag = () => {
    draggingRef.current = false
    lastPosRef.current = null
  }

  const handleTouchStart: React.TouchEventHandler<SVGSVGElement> = (e) => {
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    if (e.touches.length === 1) {
      lastPosRef.current = svgToViewBox(e.touches[0].clientX, e.touches[0].clientY)
      touchStartClientRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      touchMovedRef.current = false
      pinchRef.current = null
    } else if (e.touches.length === 2) {
      const a = svgToViewBox(e.touches[0].clientX, e.touches[0].clientY)
      const b = svgToViewBox(e.touches[1].clientX, e.touches[1].clientY)
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      const cx = (a.x + b.x) / 2
      const cy = (a.y + b.y) / 2
      pinchRef.current = { d, cx, cy }
    }
  }
  const handleTouchMove: React.TouchEventHandler<SVGSVGElement> = (e) => {
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    if (e.touches.length === 1 && lastPosRef.current) {
      if (touchStartClientRef.current) {
        const dxp = e.touches[0].clientX - touchStartClientRef.current.x
        const dyp = e.touches[0].clientY - touchStartClientRef.current.y
        if (Math.hypot(dxp, dyp) > 8) {
          touchMovedRef.current = true
        }
      }
      const cur = svgToViewBox(e.touches[0].clientX, e.touches[0].clientY)
      const dx = (cur.x - lastPosRef.current.x) * transform.scale
      const dy = (cur.y - lastPosRef.current.y) * transform.scale
      lastPosRef.current = cur
      // Update velocity for inertia (approximate per-frame velocity)
      const now = performance.now()
      const dt = Math.max(1, now - (inertiaRef.current.lastTs || now))
      inertiaRef.current.vx = (dx / dt) * 16 // normalise to ~60fps step
      inertiaRef.current.vy = (dy / dt) * 16
      inertiaRef.current.lastTs = now
      setTransform(t => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }))
    } else if (e.touches.length === 2 && pinchRef.current) {
      const a = svgToViewBox(e.touches[0].clientX, e.touches[0].clientY)
      const b = svgToViewBox(e.touches[1].clientX, e.touches[1].clientY)
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      const factor = d / pinchRef.current.d
      const newScale = clamp(transform.scale * factor, 0.7, 3.5)
      const ppx = transform.scale * pinchRef.current.cx + transform.tx
      const ppy = transform.scale * pinchRef.current.cy + transform.ty
      const newTx = ppx - newScale * pinchRef.current.cx
      const newTy = ppy - newScale * pinchRef.current.cy
      setTransform({ scale: newScale, tx: newTx, ty: newTy })
      pinchRef.current = { ...pinchRef.current, d }
    }
  }
  const handleTouchEnd: React.TouchEventHandler<SVGSVGElement> = (e) => {
    // Double-tap to zoom in (only when not a drag)
    const now = Date.now()
    const prev = lastTapRef.current || 0
    if (e.changedTouches && e.changedTouches.length === 1 && !touchMovedRef.current) {
      const dt = now - prev
      if (dt > 0 && dt < 300) {
        const c = e.changedTouches[0]
        const p = svgToViewBox(c.clientX, c.clientY)
        const factor = 1.4
        const newScale = clamp(transform.scale * factor, 0.7, 3.5)
        const ppx = transform.scale * p.x + transform.tx
        const ppy = transform.scale * p.y + transform.ty
        const newTx = ppx - newScale * p.x
        const newTy = ppy - newScale * p.y
        setTransform({ scale: newScale, tx: newTx, ty: newTy })
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    } else {
      lastTapRef.current = now
    }
    // Block subsequent synthetic click shortly after touch
    touchClickBlockUntilRef.current = Date.now() + 350
    // Start inertia scrolling if there was movement and not a pinch
    if (touchMovedRef.current && !pinchRef.current) {
      const start = performance.now()
      const friction = 0.92
      const maxMs = 350
      const step = () => {
        const tnow = performance.now()
        const elapsed = tnow - start
        if (elapsed > maxMs || (Math.abs(inertiaRef.current.vx) < 0.05 && Math.abs(inertiaRef.current.vy) < 0.05)) {
          if (inertiaRef.current.raf != null) cancelAnimationFrame(inertiaRef.current.raf)
          inertiaRef.current.raf = null
          return
        }
        setTransform(t => ({
          ...t,
          tx: t.tx + inertiaRef.current.vx,
          ty: t.ty + inertiaRef.current.vy
        }))
        inertiaRef.current.vx *= friction
        inertiaRef.current.vy *= friction
        inertiaRef.current.raf = requestAnimationFrame(step)
      }
      if (inertiaRef.current.raf != null) cancelAnimationFrame(inertiaRef.current.raf)
      inertiaRef.current.raf = requestAnimationFrame(step)
    }
    lastPosRef.current = null
    pinchRef.current = null
    touchStartClientRef.current = null
    touchMovedRef.current = false
  }

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <defs>
        <filter id="bg-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
        </filter>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
        <filter id="region-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f59e0b" floodOpacity="0.6" />
        </filter>
        {/* Clip all region paints to map boundary */}
        <clipPath id={`map-clip-${mapId}`}>
          {countryFeatures && countryFeatures.length > 0 ? (
            countryFeatures.map((cf, idx) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <path key={idx} d={path(cf as any) || undefined} />
            ))
          ) : clipHullPathD ? (
            <path d={clipHullPathD} />
          ) : (
            <rect x={0} y={0} width={canvas.w} height={canvas.h} />
          )}
        </clipPath>
      </defs>

      {/* Zoom/pan container */}
      <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}>
      {/* Countries backdrop */}
      <g style={{ pointerEvents: 'none' }}>
        {countryFeatures.map((cf, idx) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <path key={idx} d={path(cf as any)!} fill="none" stroke="#334155" strokeOpacity={0.4} strokeWidth={mapId==='world' ? (isMobile ? 0.9 : 1.0) : (isMobile ? 1.2 : 1.3)} />
        ))}
      </g>
      {/* Removed extra dotted meshes per request: keep only neighbor connectors */}

      {/* Territory regions colored by ownership (Voronoi) */}
      {voronoiData && (
        <>
          {/* Fills */}
          <g style={{ pointerEvents: 'none' }} opacity={lowEffects ? 0.26 : 0.42} clipPath={`url(#map-clip-${mapId})`}>
            {voronoiData.pts.map((p, i) => {
              const poly = voronoiData.vor.cellPolygon(i) as Array<[number, number]> | null
              if (!poly || poly.length < 3) return null
              const st = stateById.get(p.id)
              const owner = st && st.ownerId >= 0 ? playerById.get(st.ownerId) : null

              // Recompute clickability similar to markers (simplified)
              const isMine = ((st?.ownerId ?? -9999) === currentPlayerId)
              let clickable = true
              if (phase === 'attack') {
              if (!selectedFrom) {
                  clickable = !!isMine && (st?.armies || 0) > 1
                } else {
                const fromDefLocal = selectedFrom ? mapDefinition.territories.find(t => t.id === selectedFrom) : undefined
                  const isNeighbor = fromDefLocal ? fromDefLocal.neighbors.includes(p.id) : false
                const fromSelected = (selectedFrom !== undefined && selectedFrom === p.id)
                clickable = (fromSelected) || (isNeighbor && (st?.ownerId ?? -1) !== currentPlayerId)
                }
              } else if (phase === 'fortify') {
              const fromDefLocal = selectedFrom ? mapDefinition.territories.find(t => t.id === selectedFrom) : undefined
              const isNeighbor = fromDefLocal ? fromDefLocal.neighbors.includes(p.id) : false
              const fromSelected = (selectedFrom !== undefined && selectedFrom === p.id)
              const hasFrom = !!fromDefLocal
              clickable = isMine && ((st?.armies || 0) > 1 || (hasFrom && (fromSelected || isNeighbor)))
              } else if (phase === 'draft') {
                clickable = isMine
              } else if (phase === 'placement') {
                if (placementStage === 'claim') clickable = ((st?.ownerId ?? -2) === -1)
                else clickable = isMine
              }
              const inactive = !clickable

              const fillBase = owner?.color || '#475569'
              const alpha = inactive ? '26' : isMine ? '44' : '33'
              const d = `M ${poly.map(([x, y]) => `${x},${y}`).join(' L ')} Z`
              return (
                <path key={p.id} d={d} fill={fillBase + alpha} stroke="none" />
              )
            })}
          </g>
          {/* Removed extra inter-continent dotted hints */}

          {/* Soft continent silhouettes (very subtle) */}
          <g style={{ pointerEvents: 'none' }} clipPath={`url(#map-clip-${mapId})`}>
            {continentHulls.map(ch => {
              const d = `M ${ch.hull.map(([x, y]) => `${x},${y}`).join(' L ')} Z`
              return (
                <g key={`contour-${ch.id}`}>
                  <path d={d} fill="#0ea5e908" stroke="none" />
                </g>
              )
            })}
          </g>
        </>
      )}

      {/* Soft continent background overlays (stronger for world to increase separation) */}
        <g opacity={lowEffects ? 0.12 : (isMobile ? (mapId === 'world' ? 0.22 : 0.18) : (mapId === 'world' ? 0.35 : 0.28))} filter={lowEffects ? undefined : "url(#bg-blur)"} style={{ pointerEvents: 'none' }} clipPath={`url(#map-clip-${mapId})`}>
        {mapDefinition.continents.map(cont => (
          <g key={cont.id}>
            {mapDefinition.territories.filter(t => t.continent === cont.id).map(t => {
                const xy = projectedById.get(t.id)
                if (!xy) return null
              const radius = mapId === 'world' ? (isMobile ? 120 : 160) : 120
              return (
                <circle key={t.id} cx={xy[0]} cy={xy[1]} r={radius} fill={(cont.color || '#64748b') + '66'} />
              )
            })}
          </g>
        ))}
      </g>

        {/* Continent labels (hidden on mobile for clarity) */}
        {!isMobile && (
      <g style={{ pointerEvents: 'none' }}>
        {mapDefinition.continents.map(cont => {
          const pts = mapDefinition.territories.filter(t => t.continent === cont.id && t.lon != null && t.lat != null)
          if (pts.length === 0) return null
          let sx = 0, sy = 0
              pts.forEach(t => { const xy = projectedById.get(t.id)!; sx += xy[0]; sy += xy[1] })
          const cx = sx / pts.length, cy = sy / pts.length
          return (
            <g key={cont.id}>
              <rect x={cx - 70} y={cy - 30} width={140} height={26} rx={8} fill="#0b1220AA" />
                  <text x={cx} y={cy - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="#e2e8f0">
                {cont.name} · +{cont.bonus}
              </text>
            </g>
          )
        })}
      </g>
        )}

      {/* Neighbor links - dashed to clarify borders on all maps */}
      <g style={{ pointerEvents: 'none' }}>
        {mapDefinition.territories.map(t => (
          t.neighbors.map(nId => {
            const a = mapDefinition.territories.find(tt => tt.id === t.id)
            const b = mapDefinition.territories.find(tt => tt.id === nId)
            if (!a || !b || a.id > b.id) return null
              const aXY = projectedById.get(a.id) || null
              const bXY = projectedById.get(b.id) || null
            if (!aXY || !bXY) return null
            const sameCont = a.continent === b.continent
              const contColor = mapDefinition.continents.find(c => c.id === a.continent)?.color || '#64748b'
              const stroke = sameCont ? contColor : '#7c3aed'
              const dash = '6 6'
              const w = lowEffects ? (isMobile ? 0.8 : 0.7) : (isMobile ? 1.2 : 1.0)
              // ownership-aware opacity: higher if border between different owners, lower if same owner
              const aOwner = stateById.get(a.id)?.ownerId
              const bOwner = stateById.get(b.id)?.ownerId
              const enemyEdge = (aOwner != null && bOwner != null && aOwner >= 0 && bOwner >= 0 && aOwner !== bOwner)
              const op = lowEffects ? (enemyEdge ? 0.6 : 0.3) : (enemyEdge ? 0.8 : 0.5)
            return (
                <line key={`${a.id}-${b.id}`} x1={aXY[0]} y1={aXY[1]} x2={bXY[0]} y2={bXY[1]} stroke={stroke} strokeWidth={w + 0.2} strokeDasharray={dash} opacity={op} />
            )
          })
        ))}
      </g>

      {/* Territory markers */}
      <g>
        {mapDefinition.territories.map(t => {
          if (t.lon == null || t.lat == null) return null

            const xy = projectedById.get(t.id)
            if (!xy) return null
          const owner = ownerOf(t.id)
            const state = stateById.get(t.id)
          const isSelected = selectedFrom === t.id || selected?.to === t.id

          // Neighbor highlighting rules
          const isNeighbor = fromDef ? fromDef.neighbors.includes(t.id) : false
          let selectable = false
          if (phase === 'attack' && isNeighbor) {
            selectable = (state?.ownerId ?? -1) !== currentPlayerId
          } else if (phase === 'fortify' && isNeighbor) {
            selectable = (state?.ownerId ?? -2) === currentPlayerId
          }

          const degree = t.neighbors.length
          const big = degree >= 5

          const strokeColor = isSelected ? (owner?.color || '#94a3b8') : selectable ? (phase === 'attack' ? '#ef4444' : '#60a5fa') : (owner?.color || '#94a3b8')
          const strokeWidth = isSelected ? 2.5 : selectable ? 2 : 1.5
          const radius = isSelected ? (isMobile ? 9 : 10) : selectable ? (isMobile ? 8 : 9) : (isMobile ? 6 : 7)
          const isCurrentPlayers = state?.ownerId === currentPlayerId && (phase === 'placement' || phase === 'draft')
          const isSuggested = suggestedId === t.id
            const isFocused = focusTerritoryId === t.id
          const nameSmall = lang === 'en' ? 'Land' : 'Toprak'
          const nameBig = lang === 'en' ? 'Area' : 'Alan'
            const nameFont = isMobile ? (big ? 6.0 : 5.0) : (mapId === 'europe' ? (big ? 9.0 : 7.0) : (big ? 10.0 : 8.0))
            const armyFont = isMobile ? 5.4 : (mapId === 'europe' ? 7.2 : 8.0)

            // Clickability hint: dim non-clickables
            const isMine = ((state?.ownerId ?? -9999) === currentPlayerId)
            let clickable = true
            if (phase === 'attack') {
              if (!selectedFrom) {
                clickable = !!isMine && (state?.armies || 0) > 1
              } else {
                clickable = isSelected || (isNeighbor && (state?.ownerId ?? -1) !== currentPlayerId)
              }
            } else if (phase === 'fortify') {
              // Without explicit selection, allow selecting own with >1 armies
              clickable = isMine && (state?.armies || 0) > 1
              if (fromDef) {
                clickable = isSelected || (isNeighbor && isMine)
              }
            } else if (phase === 'draft') {
              clickable = isMine
            } else if (phase === 'placement') {
              if (placementStage === 'claim') {
                clickable = ((state?.ownerId ?? -2) === -1)
              } else {
                clickable = isMine
              }
            }
            const inactive = !clickable && !isSelected && !isSuggested && !isFocused
            const baseFill = (owner?.color || '#64748b') + (inactive ? '88' : 'CC')
            const nameFill = inactive ? '#cbd5e1' : '#e2e8f0'
            const armyFill = inactive ? '#e5e7eb' : '#ffffff'

          return (
            <g key={t.id}
               onClick={() => { if (Date.now() < touchClickBlockUntilRef.current) return; onTerritoryClick?.(t.id) }}
               onMouseDown={() => onTerritoryMouseDown?.(t.id)}
               onMouseUp={() => onTerritoryMouseUp?.(t.id)}
                 onMouseEnter={() => setHover({ id: t.id, x: xy[0], y: xy[1] })}
                 onMouseLeave={() => setHover(null)}
              onTouchEnd={() => { if (!touchMovedRef.current) { onTerritoryMouseUp?.(t.id) } }}
                 style={{ cursor: clickable ? 'pointer' : 'default', opacity: inactive ? 0.7 : 1 }}>
              {/* invisible larger hit area */}
                <circle cx={xy[0]} cy={xy[1]} r={isMobile ? 20 : 18} fill="transparent" />
              {isCurrentPlayers && (
                <circle cx={xy[0]} cy={xy[1]} r={radius + 5} fill="none" stroke={(owner?.color || '#22c55e')} strokeOpacity={0.4} strokeWidth={4} />
              )}
              {isSuggested && (
                  <circle cx={xy[0]} cy={xy[1]} r={radius + 8} fill="none" stroke="#fbbf24" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="3 3" />
              )}
              {selectable && (
                  <circle cx={xy[0]} cy={xy[1]} r={radius + 6} fill="none" stroke={phase === 'attack' ? '#ef4444' : '#60a5fa'} strokeOpacity={0.35} strokeWidth={1.6} className={lowEffects ? '' : 'animate-pulse-slow'} />
                )}
                {isFocused && (
                  <>
                    <circle cx={xy[0]} cy={xy[1]} r={radius + 12} fill="none" stroke="#22d3ee" strokeOpacity={0.9} strokeWidth={2.5} />
                    <circle cx={xy[0]} cy={xy[1]} r={radius + 18} fill="none" stroke="#22d3ee" strokeOpacity={0.45} strokeWidth={2} className="animate-ping" />
                  </>
                )}
                {/* Army placement pop animation */}
                {flashIds[t.id] && flashIds[t.id] > Date.now() && (
                  <g style={{ pointerEvents: 'none' }}>
                    <g className="animate-fade-in-scale">
                      <circle cx={xy[0]} cy={xy[1]} r={radius + 7} fill="none" stroke={(owner?.color || '#fbbf24')} strokeOpacity={0.95} strokeWidth={2} />
                    </g>
                    {!lowEffects && (
                      <circle cx={xy[0]} cy={xy[1]} r={radius + 12} fill="none" stroke={(owner?.color || '#fbbf24')} strokeOpacity={0.35} strokeWidth={2} className="animate-ping" />
                    )}
                    <text x={xy[0]} y={xy[1] - (radius + 16)} textAnchor="middle" fontSize={12} fontWeight={700} fill={(owner?.color || '#fbbf24')} className="animate-rise-fade">+1</text>
                  </g>
                )}
                <circle cx={xy[0]} cy={xy[1]} r={radius} fill={baseFill} stroke={strokeColor} strokeWidth={strokeWidth} filter={lowEffects ? undefined : "url(#shadow)"} />
                {/* Name with outline for readability */}
                <text x={xy[0]} y={xy[1] - 12} textAnchor="middle" fontSize={nameFont} fontWeight={big ? 700 : 500} stroke="#0b1220" strokeWidth={2.0} strokeOpacity={0.9} fill="none">{t.name}</text>
                <text x={xy[0]} y={xy[1] - 12} textAnchor="middle" fontSize={nameFont} fontWeight={big ? 700 : 500} fill={nameFill}>{t.name}</text>
                <text x={xy[0]} y={xy[1] + (isMobile ? 3 : 4)} textAnchor="middle" fontSize={armyFont} fill={armyFill}>{state?.armies ?? 0}</text>
              <title>{big ? nameBig : nameSmall}</title>
            </g>
          )
        })}
      </g>

      {/* Compact on-map attack actions bubble */}
      {(() => {
        const fromId = (typeof selectedFrom === 'string') ? selectedFrom : undefined
        const toId = (typeof (selected?.to) === 'string') ? (selected as { to: string }).to : undefined
        if (phase !== 'attack' || !fromId || !toId || lastBattleResult) return null
        const fromDef2 = mapDefinition.territories.find(tt => tt.id === fromId)
        const toDef2 = mapDefinition.territories.find(tt => tt.id === toId)
        if (!fromDef2 || !toDef2) return null
        const fa = (fromDef2.lon != null && fromDef2.lat != null) ? (projection([fromDef2.lon, fromDef2.lat]) as [number, number]) : null
        const ta = (toDef2.lon != null && toDef2.lat != null) ? (projection([toDef2.lon, toDef2.lat]) as [number, number]) : null
        if (!fa || !ta) return null
        const mx = (fa[0] + ta[0]) / 2
        const my = (fa[1] + ta[1]) / 2
        const w = 128, h = 28
        // Visible content bounds in content coords
        const x0 = (-transform.tx) / transform.scale
        const x1 = (canvas.w - transform.tx) / transform.scale
        const y0 = (-transform.ty) / transform.scale
        const y1 = (canvas.h - transform.ty) / transform.scale
        const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v))
        const bx = clamp(mx - w/2, x0 + 8, x1 - (w + 8))
        const by = clamp(my - h - 16, y0 + 8, y1 - (h + 8))
        return (
          <g transform={`translate(${bx} ${by})`} style={{ pointerEvents: 'auto' }}>
            <rect x={0} y={0} width={w} height={h} rx={9} fill="#0b1220EE" stroke="#334155" />
            <g transform="translate(6 6)">
              <g onClick={() => { try { (navigator as any).vibrate?.(8) } catch {}; onAttackOnce?.() }} style={{ cursor: onAttackOnce ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={36} height={22} rx={7} fill="#ef4444" opacity="0.9" />
                <text x={18} y={9} textAnchor="middle" fontSize="9" fill="#fff">⚔️</text>
              </g>
              <g transform="translate(44 0)" onClick={() => { try { (navigator as any).vibrate?.(10) } catch {}; onAllIn?.() }} style={{ cursor: onAllIn ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={36} height={22} rx={7} fill="#f59e0b" opacity="0.95" />
                <text x={18} y={9} textAnchor="middle" fontSize="9" fill="#0b1220">⚡</text>
              </g>
              <g transform="translate(88 0)" onClick={() => { try { (navigator as any).vibrate?.(6) } catch {}; onEndAttack?.() }} style={{ cursor: onEndAttack ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={36} height={22} rx={7} fill="#334155" opacity="0.95" />
                <text x={18} y="9" textAnchor="middle" fontSize="9" fill="#e2e8f0">⏹</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Compact on-map conquest actions bubble */}
      {(() => {
        const fromId = (typeof selectedFrom === 'string') ? selectedFrom : undefined
        const toId = (typeof (selected?.to) === 'string') ? (selected as { to: string }).to : undefined
        if (phase !== 'attack' || !lastBattleResult?.conquered || !fromId || !toId) return null
        const fromDef2 = mapDefinition.territories.find(tt => tt.id === fromId)
        const toDef2 = mapDefinition.territories.find(tt => tt.id === toId)
        if (!fromDef2 || !toDef2) return null
        const fa = (fromDef2.lon != null && fromDef2.lat != null) ? (projection([fromDef2.lon, fromDef2.lat]) as [number, number]) : null
        const ta = (toDef2.lon != null && toDef2.lat != null) ? (projection([toDef2.lon, toDef2.lat]) as [number, number]) : null
        if (!fa || !ta) return null
        const mx = (fa[0] + ta[0]) / 2
        const my = (fa[1] + ta[1]) / 2
        const w = 150, h = 34
        // Visible content bounds in content coords
        const x0 = (-transform.tx) / transform.scale
        const x1 = (canvas.w - transform.tx) / transform.scale
        const y0 = (-transform.ty) / transform.scale
        const y1 = (canvas.h - transform.ty) / transform.scale
        const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v))
        const bx = clamp(mx - w/2, x0 + 8, x1 - (w + 8))
        const by = clamp(my - h - 16, y0 + 8, y1 - (h + 8))
        return (
          <g transform={`translate(${bx} ${by})`} style={{ pointerEvents: 'auto' }}>
            <rect x={0} y={0} width={w} height={h} rx={10} fill="#0b1220EE" stroke="#334155" />
            <g transform="translate(8 7)">
              <g onClick={onConquestOne} style={{ cursor: onConquestOne ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={60} height={24} rx={8} fill="#10B981" opacity="0.9" />
                <text x={30} y={10} textAnchor="middle" fontSize="10" fill="#0b1220">+1</text>
              </g>
              <g transform="translate(68 0)" onClick={onConquestAll} style={{ cursor: onConquestAll ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={74} height={24} rx={8} fill="#059669" opacity="0.9" />
                <text x={37} y="10" textAnchor="middle" fontSize="10" fill="#e2e8f0">ALL ➜</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Compact on-map fortify actions bubble */}
      {(() => {
        const fromId = (typeof selectedFrom === 'string') ? selectedFrom : undefined
        const toId = (typeof (selected?.to) === 'string') ? (selected as { to: string }).to : undefined
        if (phase !== 'fortify' || !fromId || !toId) return null
        const fromDef2 = mapDefinition.territories.find(tt => tt.id === fromId)
        const toDef2 = mapDefinition.territories.find(tt => tt.id === toId)
        if (!fromDef2 || !toDef2) return null
        const fa = (fromDef2.lon != null && fromDef2.lat != null) ? (projection([fromDef2.lon, fromDef2.lat]) as [number, number]) : null
        const ta = (toDef2.lon != null && toDef2.lat != null) ? (projection([toDef2.lon, toDef2.lat]) as [number, number]) : null
        if (!fa || !ta) return null
        const mx = (fa[0] + ta[0]) / 2
        const my = (fa[1] + ta[1]) / 2
        const w = 150, h = 34
        // Visible content bounds in content coords
        const x0 = (-transform.tx) / transform.scale
        const x1 = (canvas.w - transform.tx) / transform.scale
        const y0 = (-transform.ty) / transform.scale
        const y1 = (canvas.h - transform.ty) / transform.scale
        const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v))
        const bx = clamp(mx - w/2, x0 + 8, x1 - (w + 8))
        const by = clamp(my - h - 16, y0 + 8, y1 - (h + 8))
        return (
          <g transform={`translate(${bx} ${by})`} style={{ pointerEvents: 'auto' }}>
            <rect x={0} y={0} width={w} height={h} rx={10} fill="#0b1220EE" stroke="#334155" />
            <g transform="translate(8 7)">
              <g onClick={onFortifyOne} style={{ cursor: onFortifyOne ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={60} height={24} rx={8} fill="#3B82F6" opacity="0.9" />
                <text x={30} y={10} textAnchor="middle" fontSize="10" fill="#fff">+1</text>
              </g>
              <g transform="translate(68 0)" onClick={onFortifyAll} style={{ cursor: onFortifyAll ? 'pointer' : 'default' }}>
                <rect x={0} y={-6} width={74} height={24} rx={8} fill="#1e40af" opacity="0.9" />
                <text x={37} y="10" textAnchor="middle" fontSize="10" fill="#e2e8f0">ALL ➜</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Compact on-map dice result chips */}
      {(() => {
        const fromId = (typeof selectedFrom === 'string') ? selectedFrom : undefined
        const toId = (typeof (selected?.to) === 'string') ? (selected as { to: string }).to : undefined
        if (!lastBattleResult || lastBattleResult.conquered || !fromId || !toId) return null
        const fromDef2 = mapDefinition.territories.find(tt => tt.id === fromId)
        const toDef2 = mapDefinition.territories.find(tt => tt.id === toId)
        if (!fromDef2 || !toDef2) return null
        const fa = (fromDef2.lon != null && fromDef2.lat != null) ? (projection([fromDef2.lon, fromDef2.lat]) as [number, number]) : null
        const ta = (toDef2.lon != null && toDef2.lat != null) ? (projection([toDef2.lon, toDef2.lat]) as [number, number]) : null
        if (!fa || !ta) return null
        const mx = (fa[0] + ta[0]) / 2
        const my = (fa[1] + ta[1]) / 2
        const diceA = (lastBattleResult as any).attackerRolls || []
        const diceD = (lastBattleResult as any).defenderRolls || []
        const w = Math.max(76, (diceA.length + diceD.length) * 22), h = 30
        return (
          <g transform={`translate(${mx - w/2} ${my - h - 22})`} style={{ pointerEvents: 'none' }} opacity={0.95}>
            <rect x={0} y={0} width={w} height={h} rx={10} fill="#0b1220EE" stroke="#334155" />
            {/* Attacker chips */}
            {diceA.map((r: number, i: number) => (
              <g key={`a${i}`} transform={`translate(${8 + i*20} 6)`}>
                <rect x={0} y={0} width={18} height={18} rx={6} fill="#ef4444" opacity="0.9" />
                <text x={9} y={13} textAnchor="middle" fontSize="10" fill="#fff">{r}</text>
              </g>
            ))}
            {/* Defender chips */}
            {diceD.map((r: number, i: number) => (
              <g key={`d${i}`} transform={`translate(${w - (8 + (diceD.length - i)*20)} 6)`}>
                <rect x={0} y={0} width={18} height={18} rx={6} fill="#3b82f6" opacity="0.9" />
                <text x={9} y={13} textAnchor="middle" fontSize="10" fill="#fff">{r}</text>
              </g>
            ))}
          </g>
        )
      })()}

        {/* Hover tooltip (scales with content) */}
        {hover && (() => {
          const st = territories.find(tt => tt.id === hover.id)
          const owner = st?.ownerId != null && st.ownerId >= 0 ? players.find(p => p.id === st.ownerId) : null
          const label = mapDefinition.territories.find(t => t.id === hover.id)?.name || hover.id
          const txt = `${label} • ${st?.armies ?? 0}`
          return (
            <g transform={`translate(${hover.x + 14}, ${hover.y - 18})`} opacity={0.95} pointerEvents="none">
              <rect x={-6} y={-12} rx={6} ry={6} width={Math.max(60, txt.length * 5.6)} height={26} fill="#0b1220E6" stroke={owner?.color || '#64748b'} strokeWidth={1} />
              <text x={6} y={6} textAnchor="start" fontSize={10} fill="#e2e8f0">
                {label} · {(st?.armies ?? 0)}{" "}{lang==='en' ? 'armies' : 'asker'}
              </text>
            </g>
          )
        })()}
      </g>

      {/* Controls (not affected by zoom) */}
      <g transform={`translate(${controlsX} ${controlsY})`}>
        <g>
          {/* hit area */}
          <rect
            x={-hitSize}
            y={-(hitSize-ctrlSize)/2}
            width={hitSize}
            height={hitSize}
            rx={hitSize/2}
            fill="transparent"
            onClick={() => {
              setTransform(t => ({ ...t, scale: clamp(t.scale * 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform(t => ({ ...t, scale: clamp(t.scale * 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={ctrlSize/2}
            fill="#0b1220E6"
            stroke="#475569"
            onClick={() => {
              setTransform(t => ({ ...t, scale: clamp(t.scale * 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform(t => ({ ...t, scale: clamp(t.scale * 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          {/* plus icon */}
          <g>
            <line x1={-ctrlSize/2 - 6} y1={ctrlSize/2} x2={-ctrlSize/2 + 6} y2={ctrlSize/2} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
            <line x1={-ctrlSize/2} y1={ctrlSize/2 - 6} x2={-ctrlSize/2} y2={ctrlSize/2 + 6} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
          </g>
        </g>
        <g transform={`translate(0 ${ctrlSize + ctrlSpacing})`}>
          {/* hit area */}
          <rect
            x={-hitSize}
            y={-(hitSize-ctrlSize)/2}
            width={hitSize}
            height={hitSize}
            rx={hitSize/2}
            fill="transparent"
            onClick={() => {
              setTransform(t => ({ ...t, scale: clamp(t.scale / 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform(t => ({ ...t, scale: clamp(t.scale / 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={ctrlSize/2}
            fill="#0b1220E6"
            stroke="#475569"
            onClick={() => {
              setTransform(t => ({ ...t, scale: clamp(t.scale / 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform(t => ({ ...t, scale: clamp(t.scale / 1.15, 0.7, 3.5) }));
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          {/* minus icon */}
          <line x1={-ctrlSize/2 - 7} y1={ctrlSize/2} x2={-ctrlSize/2 + 7} y2={ctrlSize/2} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />
        </g>
        <g transform={`translate(0 ${(ctrlSize + ctrlSpacing) * 2})`}>
          {/* hit area */}
          <rect
            x={-hitSize}
            y={-(hitSize-ctrlSize)/2}
            width={hitSize}
            height={hitSize}
            rx={hitSize/2}
            fill="transparent"
            onClick={() => {
              setTransform({ scale: 1, tx: 0, ty: 0 });
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform({ scale: 1, tx: 0, ty: 0 });
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={ctrlSize/2}
            fill="#0b1220E6"
            stroke="#475569"
            onClick={() => {
              setTransform({ scale: 1, tx: 0, ty: 0 });
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setTransform({ scale: 1, tx: 0, ty: 0 });
              setMinimapActive(true);
              if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current);
              minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2500);
            }}
            style={{ cursor: 'pointer' }}
          />
          {/* reset icon (circle + small arrow head) */}
          <circle cx={-ctrlSize/2} cy={ctrlSize/2} r={8} stroke="#e2e8f0" strokeWidth={2} fill="none" opacity={0.9} />
          <path d={`M ${-ctrlSize/2 + 6} ${ctrlSize/2 - 8} L ${-ctrlSize/2 + 9} ${ctrlSize/2 - 8} L ${-ctrlSize/2 + 9} ${ctrlSize/2 - 11} Z`} fill="#e2e8f0" opacity={0.9} />
        </g>
        {/* Help button and inline panel */}
        <g transform={`translate(0 ${(ctrlSize + ctrlSpacing) * 3})`} style={{ cursor: 'pointer' }}>
          {/* hit area */}
          <rect
            x={-hitSize}
            y={-(hitSize-ctrlSize)/2}
            width={hitSize}
            height={hitSize}
            rx={hitSize/2}
            fill="transparent"
            onClick={() => setShowHelp(v => !v)}
          />
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={ctrlSize/2}
            fill="#0b1220E6"
            stroke="#475569"
            onClick={() => setShowHelp(v => !v)}
          />
          <text x={-ctrlSize/2} y={ctrlSize - 9} textAnchor="middle" fontSize={13} fill="#e2e8f0">?</text>
          {showHelp && (
            <g transform={`translate(-${isMobile ? 200 : 230} 0)`}>
              <rect x={0} y={0} width={isMobile ? 190 : 220} height={isMobile ? 110 : 120} rx={10} fill="#0b1220E6" stroke="#334155" />
              <text x={10} y={18} fontSize={12} fill="#93c5fd">{lang==='en' ? 'Shortcuts' : 'Kısayollar'}</text>
              <text x={10} y={38} fontSize={10} fill="#e2e8f0">A — {lang==='en' ? 'Attack round' : 'Bir tur saldır'}</text>
              <text x={10} y={54} fontSize={10} fill="#e2e8f0">E — {lang==='en' ? 'End attack' : 'Saldırıyı bitir'}</text>
              <text x={10} y={70} fontSize={10} fill="#e2e8f0">F — {lang==='en' ? 'Fortify all' : 'Tümünü takviye'}</text>
              <text x={10} y={86} fontSize={10} fill="#e2e8f0">R — {lang==='en' ? 'Redeem cards' : 'Kart bozdur'}</text>
              <text x={10} y={102} fontSize={10} fill="#e2e8f0">+/− — {lang==='en' ? 'Zoom' : 'Yakınlaştır'}</text>
            </g>
          )}
        </g>
      </g>

      {/* Minimap (bottom-left, not affected by zoom) */}
      {(() => {
        const mmW = isMobile ? 150 : 180
        const mmH = isMobile ? 90 : 110
        const s = Math.min(mmW / canvas.w, mmH / canvas.h)
        const offX = (mmW - canvas.w * s) / 2
        const offY = (mmH - canvas.h * s) / 2
        // Visible content bounds in content coordinates
        const x0 = (-transform.tx) / transform.scale
        const x1 = (canvas.w - transform.tx) / transform.scale
        const y0 = (-transform.ty) / transform.scale
        const y1 = (canvas.h - transform.ty) / transform.scale
        const vx = offX + x0 * s
        const vy = offY + y0 * s
        const vw = (x1 - x0) * s
        const vh = (y1 - y0) * s
        const toMinimap = (x: number, y: number) => ({ x: offX + x * s, y: offY + y * s })

        // Dragging on minimap to recenter
        let mmDragging = false
        const onDown = (evt: React.MouseEvent | React.TouchEvent, clientX?: number, clientY?: number) => {
          mmDragging = true
          const rect = (evt.target as Element).getBoundingClientRect()
          const cx = (clientX ?? ('clientX' in evt ? (evt as React.MouseEvent).clientX : 0)) - rect.left
          const cy = (clientY ?? ('clientY' in evt ? (evt as React.MouseEvent).clientY : 0)) - rect.top
          const contentX = (cx - offX) / s
          const contentY = (cy - offY) / s
          centerOnContent(contentX, contentY)
        }
        const onMove = (evt: React.MouseEvent) => {
          if (!mmDragging) return
          const rect = (evt.target as Element).getBoundingClientRect()
          const cx = evt.clientX - rect.left
          const cy = evt.clientY - rect.top
          const contentX = (cx - offX) / s
          const contentY = (cy - offY) / s
          centerOnContent(contentX, contentY)
        }
        const onUp = () => { mmDragging = false }

        return (
          <g transform={`translate(16 ${canvas.h - (mmH + 16)})`} style={{ cursor: 'pointer', opacity: minimapActive ? 1 : 0, transition: 'opacity 0.3s ease' }} onMouseEnter={() => { setMinimapActive(true); if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current) }} onMouseLeave={() => { if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current); minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 1200) }} onTouchStart={() => { setMinimapActive(true); if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current) }} onTouchEnd={() => { if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current); minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 1200) }}>
            <g onMouseDown={(e)=>{ onDown(e); setMinimapActive(true) }} onMouseMove={(e)=> { onMove(e); setMinimapActive(true) }} onMouseUp={()=> { onUp(); if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current); minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2000) }} onTouchStart={(e)=> { const t = (e.touches[0] || { clientX:0, clientY:0 }); onDown(e as any, t.clientX, t.clientY); setMinimapActive(true) }} onTouchMove={()=> { setMinimapActive(true) }} onTouchEnd={()=> { if (minimapTimerRef.current) window.clearTimeout(minimapTimerRef.current); minimapTimerRef.current = window.setTimeout(()=> setMinimapActive(false), 2000) }}>
              <rect x={0} y={0} width={mmW} height={mmH} rx={8} fill="#0b1220CC" stroke="#334155" />
              {/* Content frame */}
              <rect x={offX} y={offY} width={canvas.w * s} height={canvas.h * s} fill="#020617" stroke="#1f2937" />
              {/* Territory dots */}
              {mapDefinition.territories.map(t => {
                const xy = projectedById.get(t.id)
                if (!xy) return null
                const p = toMinimap(xy[0], xy[1])
                return <circle key={t.id} cx={p.x} cy={p.y} r={1.5} fill="#64748b" opacity={0.8} />
              })}
              {/* Viewport rectangle */}
              <rect x={vx} y={vy} width={vw} height={vh} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
            </g>
          </g>
        )
      })()}

      {/* Help button merged into controls above */}
    </svg>
  )
}
