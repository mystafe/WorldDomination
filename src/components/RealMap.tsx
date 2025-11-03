import { useMemo, useRef } from "react"
import { feature } from "topojson-client"
import { geoMercator, geoPath, geoBounds } from "d3-geo"
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
  suggestedId?: string
}

export default function RealMap({ mapId, mapDefinition, territories, players, selected, onTerritoryClick, onTerritoryMouseDown, onTerritoryMouseUp, currentPlayerId = -1, phase, suggestedId }: RealMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { countryFeature, projection, path, canvas, isMobile } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const world = world110 as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = feature(world, world.objects.countries) as any

    // Build a feature for current map
    let f: any = null

    if (mapId === 'world') {
      f = { type: 'Sphere' }
    } else if (mapId === 'turkey') {
      f = countries.features.find((cf: any) => String(cf.id) === '792')
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
      } else {
        f = { type: 'Sphere' }
      }
    }

    const mobile = typeof window !== 'undefined' && window.innerWidth < 768
    const canvas = mapId === 'world'
      ? (mobile ? { w: 1100, h: 360 } : { w: 1000, h: 600 })
      : (mobile ? { w: 1100, h: 420 } : { w: 900, h: 600 })

    let projection = geoMercator().fitSize([canvas.w, canvas.h], f as any)
    if (mapId === 'europe') {
      const currentTranslate = projection.translate()
      const currentScale = projection.scale()
      projection = projection
        .translate([currentTranslate[0] + 60, currentTranslate[1] + 180])
        .scale(currentScale * 2.0)
    }
    const path = geoPath(projection)
    return { countryFeature: f, projection, path, canvas, isMobile: mobile }
  }, [mapId])

  const ownerOf = (territoryId: string) => {
    const t = territories.find(tt => tt.id === territoryId)
    if (!t || t.ownerId === -1) return null
    return players.find(p => p.id === t.ownerId) || null
  }

  const selectedFrom = selected?.from || undefined
  const fromDef = selectedFrom ? mapDefinition.territories.find(t => t.id === selectedFrom) : undefined
  const lang = (typeof document !== 'undefined' && document.documentElement.lang?.toLowerCase().startsWith('en')) ? 'en' : 'tr'

  return (
    <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${canvas.w} ${canvas.h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <defs>
        <filter id="bg-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
        </filter>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Countries backdrop */}
      <g style={{ pointerEvents: 'none' }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <path d={path(countryFeature as any)!} fill="#0b1220" stroke="#1e293b" strokeWidth={1.5} />
      </g>

      {/* Soft continent background overlays (stronger for world to increase separation) */}
      <g opacity={mapId === 'world' ? 0.28 : 0.22} filter="url(#bg-blur)" style={{ pointerEvents: 'none' }}>
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
            const w = isMobile ? 1.6 : 1.2
            return (
              <line key={`${a.id}-${b.id}`} x1={aXY[0]} y1={aXY[1]} x2={bXY[0]} y2={bXY[1]} stroke={stroke} strokeWidth={w} strokeDasharray={dash} opacity={sameCont?0.55:0.8} />
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
          const nameSmall = lang === 'en' ? 'Land' : 'Toprak'
          const nameBig = lang === 'en' ? 'Area' : 'Alan'
          const nameFont = isMobile ? (big ? 10 : 9) : (mapId === 'europe' ? (big ? 11 : 9) : (big ? 12 : 10))
          const armyFont = isMobile ? 9 : (mapId === 'europe' ? 9 : 10)

          return (
            <g key={t.id}
               onClick={() => onTerritoryClick?.(t.id)}
               onMouseDown={() => onTerritoryMouseDown?.(t.id)}
               onMouseUp={() => onTerritoryMouseUp?.(t.id)}
               onTouchStart={() => onTerritoryMouseDown?.(t.id)}
               onTouchEnd={() => onTerritoryMouseUp?.(t.id)}
               style={{ cursor: 'pointer' }}>
              {/* invisible larger hit area */}
              <circle cx={xy[0]} cy={xy[1]} r={isMobile ? 14 : 16} fill="transparent" />
              {isCurrentPlayers && (
                <circle cx={xy[0]} cy={xy[1]} r={radius + 5} fill="none" stroke={(owner?.color || '#22c55e')} strokeOpacity={0.4} strokeWidth={4} />
              )}
              {isSuggested && (
                <circle cx={xy[0]} cy={xy[1]} r={radius + 8} fill="none" stroke="#fbbf24" strokeWidth={3} strokeDasharray="4 2" />
              )}
              {selectable && (
                <circle cx={xy[0]} cy={xy[1]} r={radius + 6} fill="none" stroke={phase === 'attack' ? '#ef4444' : '#60a5fa'} strokeOpacity={0.5} strokeWidth={2} className="animate-pulse" />
              )}
              <circle cx={xy[0]} cy={xy[1]} r={radius} fill={(owner?.color || '#64748b') + 'CC'} stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#shadow)" />
              <text x={xy[0]} y={xy[1] - 12} textAnchor="middle" fontSize={nameFont} fontWeight={big ? 700 : 500} fill="#e2e8f0">{t.name}</text>
              <text x={xy[0]} y={xy[1] + (isMobile ? 3 : 4)} textAnchor="middle" fontSize={armyFont} fill="#ffffff">{state?.armies ?? 0}</text>
              <title>{big ? nameBig : nameSmall}</title>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
