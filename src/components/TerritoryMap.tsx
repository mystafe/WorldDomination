import { useMemo } from "react"
import type { MapDefinition, Territory } from "../data/territories"
import type { TerritoryState, Player } from "../store/game"

interface TerritoryMapProps {
  mapDefinition: MapDefinition
  territories: TerritoryState[]
  players: Player[]
  selectedTerritories?: string[]
  onTerritoryClick?: (territoryId: string) => void
  highlightNeighbors?: boolean
  attackMode?: boolean
}

export default function TerritoryMap({
  mapDefinition,
  territories,
  players,
  selectedTerritories = [],
  onTerritoryClick,
  highlightNeighbors = false,
  attackMode = false
}: TerritoryMapProps) {
  
  // Create a simple grid layout for territories
  const layout = useMemo(() => {
    const continents = mapDefinition.continents
    const terrs = mapDefinition.territories
    
    // Group territories by continent
    const grouped: Record<string, Territory[]> = {}
    continents.forEach(c => {
      grouped[c.id] = terrs.filter(t => t.continent === c.id)
    })
    
    return { continents, grouped }
  }, [mapDefinition])
  
  const getTerritoryState = (territoryId: string) => {
    return territories.find(t => t.id === territoryId)
  }
  
  const getOwner = (territoryId: string) => {
    const state = getTerritoryState(territoryId)
    if (!state || state.ownerId === -1) return null
    return players.find(p => p.id === state.ownerId)
  }
  
  return (
    <div className="w-full h-full overflow-auto p-4 bg-slate-900/50 rounded-xl">
      <div className="space-y-4">
        {layout.continents.map((continent) => {
          const continentTerritories = layout.grouped[continent.id] || []
          
          // Check if a single player owns all territories in this continent
          const owners = new Set(
            continentTerritories
              .map(t => getTerritoryState(t.id)?.ownerId)
              .filter(id => id !== undefined && id !== -1)
          )
          const continentOwner = owners.size === 1 ? players.find(p => p.id === Array.from(owners)[0]) : null
          
          return (
            <div 
              key={continent.id} 
              className={`rounded-lg p-3 border-2 transition-all ${
                continentOwner 
                  ? 'border-amber-400/60 bg-slate-800/50 shadow-lg' 
                  : 'border-slate-700/50 bg-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: continent.color }}
                />
                <h3 className="text-lg font-bold text-white">
                  {continent.name}
                </h3>
                <span className="text-sm px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                  +{continent.bonus} 🎖️
                </span>
                <span className="text-xs text-slate-500">
                  ({continentTerritories.length} bölge)
                </span>
                {continentOwner && (
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{ 
                      backgroundColor: continentOwner.color,
                      color: 'white'
                    }}
                  >
                    👑 {continentOwner.name}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                {continentTerritories.map((territory) => {
                  const state = getTerritoryState(territory.id)
                  const owner = getOwner(territory.id)
                  const isSelected = selectedTerritories.includes(territory.id)
                  
                  // Highlight neighbors if first territory is selected (in attack/fortify)
                  const firstSelected = selectedTerritories[0]
                  const isNeighbor = highlightNeighbors && firstSelected && 
                    mapDefinition.territories.find(t => t.id === firstSelected)?.neighbors.includes(territory.id)
                  
                  // In attack mode, only highlight enemy neighbors
                  const canAttack = attackMode && isNeighbor && owner && 
                    selectedTerritories[0] && 
                    getTerritoryState(selectedTerritories[0])?.ownerId !== owner.id
                  
                  return (
                    <button
                      key={territory.id}
                      onClick={() => onTerritoryClick?.(territory.id)}
                      className={`
                        relative p-2 rounded-md border-2 transition-all text-left text-xs
                        ${isSelected 
                          ? 'border-amber-400 shadow-lg scale-105 ring-2 ring-amber-400/50' 
                          : canAttack
                          ? 'border-red-400 shadow-md ring-1 ring-red-400/30 animate-pulse'
                          : isNeighbor
                          ? 'border-blue-400/50 shadow-sm'
                          : 'border-slate-600 hover:border-slate-500 hover:scale-102'
                        }
                        ${owner ? 'hover:shadow-md' : 'bg-slate-900/50'}
                      `}
                      style={{
                        backgroundColor: owner ? owner.color + '40' : undefined,
                        borderColor: isSelected ? '#fbbf24' : (owner?.color || '#475569')
                      }}
                    >
                      {/* Territory Name */}
                      <div className="text-xs font-semibold text-white truncate mb-1">
                        {territory.name}
                      </div>
                      
                      {/* Owner & Armies */}
                      {state && (
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: owner?.color || '#64748b',
                              color: 'white'
                            }}
                          >
                            {owner?.name.substring(0, 3) || '?'}
                          </span>
                          <span className="text-sm font-bold text-white flex items-center gap-1">
                            {state.armies}
                            <span className="text-xs">🎖️</span>
                          </span>
                        </div>
                      )}
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

