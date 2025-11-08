import { useEffect, useMemo, useRef, useState } from "react"
import { feature } from "topojson-client"
import { Delaunay } from "d3-delaunay"
import { polygonHull } from "d3-polygon"
import { geoMercator, geoNaturalEarth1, geoPath, geoBounds } from "d3-geo"
import world110 from "world-atlas/countries-110m.json" with { type: "json" }
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
}

export default function RealMap({ mapId, mapDefinition, territories, players, selected, onTerritoryClick, onTerritoryMouseDown, onTerritoryMouseUp, currentPlayerId = -1, phase, placementStage, suggestedId, focusTerritoryId, lowEffects = false }: RealMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [transform, setTransform] = useState<{ scale: number; tx: number; ty: number }>({ scale: 1, tx: 0, ty: 0 })
  const draggingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{ d: number; cx: number; cy: number } | null>(null)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [minimapActive, setMinimapActive] = useState(true)
  const minimapTimerRef = useRef<number | null>(null)
  // Track army placement increases for pop animation
  const prevArmiesRef = useRef<Record<string, number>>({})
  const [flashIds, setFlashIds] = useState<Record<string, number>>({})
  useEffect(() => {
    const t = window.setTimeout(() => setMinimapActive(false), 1200)
    return () => window.clearTimeout(t)
  }, [])
  // Detect increases
  useEffect(() => {
    const now = Date.now()
    const nextPrev: Record<string, number> = { ...prevArmiesRef.current }
    territories.forEach(st => {
      const old = prevArmiesRef.current[st.id]
      if (old != null && st.armies > old) {
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
    const world = world110 as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = feature(world, world.objects.countries) as any

    // Build a feature for current map
    let f: any = null
    let featuresArray: any[] = []

    if (mapId === 'world') {
      // Use all countries as backdrop for world
      f = countries
      featuresArray = countries.features || []
    } else if (mapId === 'turkey') {
      f = countries.features.find((cf: any) => String(cf.id) === '792')
      featuresArray = f ? [f] : []
    } else if (mapId === 'europe') {
      const europeFeatures: any[] = []
      for (const cf of countries.features) {
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
      } else {
        f = { type: 'Sphere' }
        featuresArray = []
      }
    }

    const mobile = typeof window !== 'undefined' && window.innerWidth < 768
    const canvas = mapId === 'world'
      ? (mobile ? { w: 1100, h: 300 } : { w: 1000, h: 560 })
      : (mobile ? { w: 1100, h: 360 } : { w: 900, h: 560 })

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
  }, [mapId])

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
    const t = territories.find(tt => tt.id === territoryId)
    if (!t || t.ownerId === -1) return null
    return players.find(p => p.id === t.ownerId) || null
  }

  const selectedFrom = (typeof (selected?.from) === 'string' ? (selected as { from: string }).from : undefined) as string | undefined
  const fromDef = selectedFrom ? mapDefinition.territories.find(t => t.id === selectedFrom) : undefined
  const lang = (typeof document !== 'undefined' && document.documentElement.lang?.toLowerCase().startsWith('en')) ? 'en' : 'tr'
  const ctrlSize = isMobile ? 34 : 28
  const ctrlText = isMobile ? 18 : 16
  const ctrlTextSmall = isMobile ? 12 : 10

  // Reset view on map change
  useEffect(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 })
  }, [mapId])

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
    e.preventDefault()
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
    e.preventDefault()
    setMinimapActive(true)
    if (minimapTimerRef.current) { window.clearTimeout(minimapTimerRef.current) }
    minimapTimerRef.current = window.setTimeout(() => setMinimapActive(false), 2500)
    if (e.touches.length === 1 && lastPosRef.current) {
      const cur = svgToViewBox(e.touches[0].clientX, e.touches[0].clientY)
      const dx = (cur.x - lastPosRef.current.x) * transform.scale
      const dy = (cur.y - lastPosRef.current.y) * transform.scale
      lastPosRef.current = cur
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
  const handleTouchEnd: React.TouchEventHandler<SVGSVGElement> = () => {
    lastPosRef.current = null
    pinchRef.current = null
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
          {countryFeatures.map((cf, idx) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <path key={idx} d={path(cf as any) || undefined} />
          ))}
        </clipPath>
      </defs>

      {/* Zoom/pan container */}
      <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}>
      {/* Countries backdrop */}
      <g style={{ pointerEvents: 'none' }}>
        {countryFeatures.map((cf, idx) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <path key={idx} d={path(cf as any)!} fill="none" stroke="#1e293b" strokeOpacity={0.25} strokeWidth={mapId==='world' ? 0.6 : 0.9} />
        ))}
      </g>

      {/* Territory regions colored by ownership (Voronoi) */}
      {voronoiData && (
        <>
          {/* Fills */}
          <g style={{ pointerEvents: 'none' }} opacity={lowEffects ? 0.26 : 0.42} clipPath={`url(#map-clip-${mapId})`}>
            {voronoiData.pts.map((p, i) => {
              const poly = voronoiData.vor.cellPolygon(i) as Array<[number, number]> | null
              if (!poly || poly.length < 3) return null
              const st = territories.find(tt => tt.id === p.id)
              const owner = st && st.ownerId >= 0 ? players.find(pl => pl.id === st.ownerId) : null

              // Recompute clickability similar to markers (simplified)
              const isMine = st?.ownerId === currentPlayerId
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
                if (placementStage === 'claim') clickable = st?.ownerId === -1
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
          {/* Continent borders (scoring regions) */}
          <g style={{ pointerEvents: 'none' }} clipPath={`url(#map-clip-${mapId})`}>
            {continentHulls.map(ch => {
              const d = `M ${ch.hull.map(([x, y]) => `${x},${y}`).join(' L ')} Z`
              return (
                <g key={`contour-${ch.id}`}>
                  {/* Soft fill to avoid harsh borders */}
                  <path d={d} fill="#0ea5e911" stroke="none" />
                  <path d={d} fill="none" stroke="#94a3b8" strokeDasharray="2 6" strokeWidth={isMobile ? 1.2 : 1.0} opacity={0.35} />
                </g>
              )
            })}
          </g>
        </>
      )}

        {/* Soft continent background overlays (stronger for world to increase separation) */}
        <g opacity={lowEffects ? 0.14 : (mapId === 'world' ? 0.35 : 0.28)} filter={lowEffects ? undefined : "url(#bg-blur)"} style={{ pointerEvents: 'none' }}>
          {mapDefinition.continents.map(cont => (
            <g key={cont.id}>
              {mapDefinition.territories.filter(t => t.continent === cont.id).map(t => {
                if (t.lon == null || t.lat == null) return null
                const xy = projection([t.lon, t.lat]) as [number, number]
                const radius = mapId === 'world' ? (isMobile ? 120 : 160) : 120
                return (
                  <circle key={t.id} cx={xy[0]} cy={xy[1]} r={radius} fill={(cont.color || '#64748b') + '66'} />
                )
              })}
            </g>
          ))}
        </g>

        {/* Continent labels */}
        <g style={{ pointerEvents: 'none' }}>
          {mapDefinition.continents.map(cont => {
            const pts = mapDefinition.territories.filter(t => t.continent === cont.id && t.lon != null && t.lat != null)
            if (pts.length === 0) return null
            let sx = 0, sy = 0
            pts.forEach(t => { const xy = projection([t.lon!, t.lat!]) as [number, number]; sx += xy[0]; sy += xy[1] })
            const cx = sx / pts.length, cy = sy / pts.length
            return (
              <g key={cont.id}>
                <rect x={cx - 70} y={cy - 30} width={140} height={26} rx={8} fill="#0b1220AA" />
                <text x={cx} y={cy - 12} textAnchor="middle" fontSize={isMobile ? 11 : 12} fontWeight={700} fill="#e2e8f0">
                  {cont.name} · +{cont.bonus}
                </text>
              </g>
            )
          })}
        </g>

        {/* Neighbor links - dashed to clarify borders on all maps */}
        <g style={{ pointerEvents: 'none' }}>
          {mapDefinition.territories.map(t => (
            t.neighbors.map(nId => {
              const a = mapDefinition.territories.find(tt => tt.id === t.id)
              const b = mapDefinition.territories.find(tt => tt.id === nId)
              if (!a || !b || a.id > b.id) return null
              const aXY = a.lon != null && a.lat != null ? projection([a.lon, a.lat]) as [number, number] : null
              const bXY = b.lon != null && b.lat != null ? projection([b.lon, b.lat]) as [number, number] : null
              if (!aXY || !bXY) return null
              const sameCont = a.continent === b.continent
              const stroke = sameCont ? '#475569' : '#7c3aed'
              const dash = sameCont ? '4 3' : '6 4'
              const w = lowEffects ? (isMobile ? 1.2 : 1.0) : (isMobile ? 1.6 : 1.2)
              return (
                <line key={`${a.id}-${b.id}`} x1={aXY[0]} y1={aXY[1]} x2={bXY[0]} y2={bXY[1]} stroke={stroke} strokeWidth={w + 0.2} strokeDasharray={dash} opacity={lowEffects ? (sameCont?0.38:0.62) : (sameCont?0.6:0.85)} />
              )
            })
          ))}
        </g>

        {/* Territory markers */}
        <g>
          {mapDefinition.territories.map(t => {
            if (t.lon == null || t.lat == null) return null

            const xy = projection([t.lon, t.lat]) as [number, number]
            const owner = ownerOf(t.id)
            const state = territories.find(tt => tt.id === t.id)
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
            const nameFont = isMobile ? (big ? 6.6 : 5.4) : (mapId === 'europe' ? (big ? 9.0 : 7.0) : (big ? 10.0 : 8.0))
            const armyFont = isMobile ? 5.8 : (mapId === 'europe' ? 7.2 : 8.0)

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
                 onClick={() => onTerritoryClick?.(t.id)}
                 onMouseDown={() => onTerritoryMouseDown?.(t.id)}
                 onMouseUp={() => onTerritoryMouseUp?.(t.id)}
                 onMouseEnter={() => setHover({ id: t.id, x: xy[0], y: xy[1] })}
                 onMouseLeave={() => setHover(null)}
                 onTouchStart={() => onTerritoryMouseDown?.(t.id)}
                 onTouchEnd={() => onTerritoryMouseUp?.(t.id)}
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
                  <circle cx={xy[0]} cy={xy[1]} r={radius + 10} fill="none" stroke="#22d3ee" strokeOpacity={0.8} strokeWidth={2.5} strokeDasharray="3 2" />
                )}
                {/* Army placement pop animation */}
                {flashIds[t.id] && flashIds[t.id] > Date.now() && (
                  <g className="animate-fade-in-scale">
                    <circle cx={xy[0]} cy={xy[1]} r={radius + 7} fill="none" stroke={(owner?.color || '#fbbf24')} strokeOpacity={0.9} strokeWidth={2} />
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
      <g transform={`translate(${canvas.w - 48} 16)`}>
        <g>
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={6}
            fill="#0b1220CC"
            stroke="#334155"
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
          <text x={-ctrlSize/2} y={ctrlSize - 10} textAnchor="middle" fontSize={ctrlText} fill="#e2e8f0">+</text>
        </g>
        <g transform="translate(0 36)">
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={6}
            fill="#0b1220CC"
            stroke="#334155"
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
          <text x={-ctrlSize/2} y={ctrlSize - 10} textAnchor="middle" fontSize={ctrlText} fill="#e2e8f0">−</text>
        </g>
        <g transform="translate(0 72)">
          <rect
            x={-ctrlSize}
            y={0}
            width={ctrlSize}
            height={ctrlSize}
            rx={6}
            fill="#0b1220CC"
            stroke="#334155"
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
          <text x={-ctrlSize/2} y={ctrlSize - 12} textAnchor="middle" fontSize={ctrlTextSmall} fill="#e2e8f0">⟲</text>
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
                if (t.lon == null || t.lat == null) return null
                const xy = projection([t.lon, t.lat]) as [number, number]
                const p = toMinimap(xy[0], xy[1])
                return <circle key={t.id} cx={p.x} cy={p.y} r={1.5} fill="#64748b" opacity={0.8} />
              })}
              {/* Viewport rectangle */}
              <rect x={vx} y={vy} width={vw} height={vh} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
            </g>
          </g>
        )
      })()}

      {/* Help button and panel (top-left) */}
      <g transform="translate(16 16)" style={{ cursor: 'pointer' }}>
        <g onClick={() => setShowHelp(v => !v)}>
          <rect x={0} y={0} width={28} height={28} rx={6} fill="#0b1220CC" stroke="#334155" />
          <text x={14} y={18} textAnchor="middle" fontSize={14} fill="#e2e8f0">?</text>
        </g>
        {showHelp && (
          <g transform="translate(36 0)">
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
    </svg>
  )
}
