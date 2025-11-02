import { create } from "zustand"
import { createRng } from "../lib/random"
import { getMapById, type MapDefinition } from "../data/territories"

export type GamePhase = "setup" | "draft" | "attack" | "fortify"

export interface Player {
  id: number
  name: string
  color: string
  isHuman: boolean
  alive: boolean
  cards: TerritoryCard[]
}

export interface TerritoryCard {
  territory: string
  type: "infantry" | "cavalry" | "artillery" | "wild"
}

export interface TerritoryState {
  id: string
  ownerId: number // player id, -1 for neutral
  armies: number
}

export interface GameState {
  // Map selection
  selectedMap: string // 'world', 'turkey', or 'europe'
  mapDefinition: MapDefinition | null
  
  // Game setup
  players: Player[]
  territories: TerritoryState[]
  
  // Game flow
  phase: GamePhase
  currentPlayerIndex: number
  turn: number
  
  // Draft phase
  draftArmies: number // armies to place in current turn
  
  // Attack phase
  attackFrom: string | null
  attackTo: string | null
  lastBattleResult: {
    attackerLosses: number
    defenderLosses: number
    conquered: boolean
  } | null
  
  // Fortify phase
  fortifyFrom: string | null
  fortifyTo: string | null
  
  // History
  history: HistoryEntry[]
  
  // Actions
  setMap: (mapId: string) => void
  initGame: (playerNames: string[], humanPlayers: number) => void
  
  // Draft phase
  calculateDraftArmies: () => number
  placeDraftArmy: (territoryId: string) => boolean
  
  // Attack phase
  selectAttackFrom: (territoryId: string) => void
  selectAttackTo: (territoryId: string) => void
  executeAttack: (attackerDice: number, defenderDice: number) => void
  conquestMove: (armies: number) => void
  endAttackPhase: () => void
  
  // Fortify phase
  selectFortifyFrom: (territoryId: string) => void
  selectFortifyTo: (territoryId: string) => void
  executeFortify: (armies: number) => void
  
  // Utility
  getTerritoryState: (territoryId: string) => TerritoryState | undefined
  getPlayerTerritories: (playerId: number) => TerritoryState[]
  getAdjacentEnemyTerritories: (territoryId: string) => TerritoryState[]
  checkWinCondition: () => boolean
  
  // Reset
  reset: () => void
}

export interface HistoryEntry {
  turn: number
  playerId: number
  action: "draft" | "attack" | "fortify" | "conquered"
  from?: string
  to?: string
  armies?: number
  result?: string
}

const initialState = {
  selectedMap: "world",
  mapDefinition: getMapById("world") || null,
  players: [],
  territories: [],
  phase: "setup" as GamePhase,
  currentPlayerIndex: 0,
        turn: 0,
  draftArmies: 0,
  attackFrom: null,
  attackTo: null,
  lastBattleResult: null,
  fortifyFrom: null,
  fortifyTo: null,
            history: []
          }

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  setMap: (mapId: string) => {
    const mapDef = getMapById(mapId)
    if (!mapDef) return
    
    set({
      selectedMap: mapId,
      mapDefinition: mapDef,
      territories: [],
      players: [],
      phase: "setup"
    })
  },
  
  initGame: (playerNames: string[], humanPlayers: number) => {
    const state = get()
    if (!state.mapDefinition) return
    
    const playerColors = [
      "#EF4444", // red
      "#3B82F6", // blue
      "#10B981", // green
      "#F59E0B", // yellow
      "#8B5CF6", // purple
      "#EC4899"  // pink
    ]
    
    const players: Player[] = playerNames.map((name, i) => ({
      id: i,
      name,
      color: playerColors[i % playerColors.length],
      isHuman: i < humanPlayers,
      alive: true,
      cards: []
    }))
    
    // Initialize all territories as neutral
    const territories: TerritoryState[] = state.mapDefinition.territories.map(t => ({
      id: t.id,
      ownerId: -1,
      armies: 0
    }))
    
    // Distribute territories randomly among players
    const rng = createRng(Date.now().toString())
    const shuffledTerritories = [...territories].sort(() => rng() - 0.5)
    
    shuffledTerritories.forEach((territory, index) => {
      territory.ownerId = index % players.length
      territory.armies = 1 // Start with 1 army on each territory
    })
    
    // Calculate initial armies based on player count (RISK rules)
    const initialArmies: Record<number, number> = {
      2: 40,
      3: 35,
      4: 30,
      5: 25,
      6: 20
    }
    
    const armiesPerPlayer = initialArmies[players.length] || 20
    const armiesUsed = Math.ceil(state.mapDefinition.territories.length / players.length)
    const remainingArmies = armiesPerPlayer - armiesUsed
    
    set({
      players,
      territories: shuffledTerritories,
      phase: "draft",
      currentPlayerIndex: 0,
      turn: 1,
      draftArmies: remainingArmies,
      history: [{
        turn: 0,
        playerId: -1,
        action: "draft",
        result: "Game initialized"
      }]
    })
  },
  
  calculateDraftArmies: () => {
    const state = get()
    const currentPlayer = state.players[state.currentPlayerIndex]
    if (!currentPlayer || !state.mapDefinition) return 3
    
    const playerTerritories = state.territories.filter(t => t.ownerId === currentPlayer.id)
    
    // Base armies: territories / 3 (minimum 3)
    let armies = Math.max(3, Math.floor(playerTerritories.length / 3))
    
    // Continent bonuses
    state.mapDefinition.continents.forEach(continent => {
      const continentTerritories = state.mapDefinition!.territories.filter(
        t => t.continent === continent.id
      )
      const ownedInContinent = playerTerritories.filter(pt =>
        continentTerritories.some(ct => ct.id === pt.id)
      )
      
      if (ownedInContinent.length === continentTerritories.length) {
        armies += continent.bonus
      }
    })
    
    return armies
  },
  
  placeDraftArmy: (territoryId: string) => {
    const state = get()
    const territory = state.territories.find(t => t.id === territoryId)
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    if (!territory || !currentPlayer) return false
    if (territory.ownerId !== currentPlayer.id) return false
    if (state.draftArmies <= 0) return false
    
    set(s => ({
      territories: s.territories.map(t =>
        t.id === territoryId ? { ...t, armies: t.armies + 1 } : t
      ),
      draftArmies: s.draftArmies - 1,
      history: [...s.history, {
        turn: s.turn,
        playerId: currentPlayer.id,
        action: "draft",
        to: territoryId,
        armies: 1
      }]
    }))
    
    // If all draft armies placed, move to attack phase
    if (get().draftArmies === 0) {
      set({ phase: "attack" })
    }
    
    return true
  },
  
  selectAttackFrom: (territoryId: string) => {
    const state = get()
    const territory = state.territories.find(t => t.id === territoryId)
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    if (!territory || !currentPlayer) return
    if (territory.ownerId !== currentPlayer.id) return
    if (territory.armies <= 1) return // Need at least 2 armies to attack
    
    set({ attackFrom: territoryId, attackTo: null })
  },
  
  selectAttackTo: (territoryId: string) => {
    const state = get()
    if (!state.attackFrom || !state.mapDefinition) return
    
    const fromTerritory = state.mapDefinition.territories.find(t => t.id === state.attackFrom)
    const toTerritoryState = state.territories.find(t => t.id === territoryId)
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    if (!fromTerritory || !toTerritoryState || !currentPlayer) return
    if (toTerritoryState.ownerId === currentPlayer.id) return // Can't attack own territory
    if (!fromTerritory.neighbors.includes(territoryId)) return // Must be adjacent
    
    set({ attackTo: territoryId })
  },
  
  executeAttack: (attackerDice: number, defenderDice: number) => {
    const state = get()
    if (!state.attackFrom || !state.attackTo) return
    
    const fromState = state.territories.find(t => t.id === state.attackFrom)
    const toState = state.territories.find(t => t.id === state.attackTo)
    
    if (!fromState || !toState) return
    
    // Roll dice
    const rng = createRng(Date.now().toString())
    const attackerRolls = Array.from({ length: attackerDice }, () => Math.floor(rng() * 6) + 1).sort((a, b) => b - a)
    const defenderRolls = Array.from({ length: defenderDice }, () => Math.floor(rng() * 6) + 1).sort((a, b) => b - a)
    
    let attackerLosses = 0
    let defenderLosses = 0
    
    // Compare dice (RISK rules)
    const comparisons = Math.min(attackerRolls.length, defenderRolls.length)
    for (let i = 0; i < comparisons; i++) {
      if (attackerRolls[i] > defenderRolls[i]) {
        defenderLosses++
      } else {
        attackerLosses++
      }
    }
    
    const newDefenderArmies = toState.armies - defenderLosses
    const conquered = newDefenderArmies <= 0
    
    set(s => ({
      territories: s.territories.map(t => {
        if (t.id === s.attackFrom) {
          return { ...t, armies: t.armies - attackerLosses }
        }
        if (t.id === s.attackTo) {
          return { ...t, armies: conquered ? 0 : newDefenderArmies }
        }
        return t
      }),
      lastBattleResult: { attackerLosses, defenderLosses, conquered },
      history: [...s.history, {
        turn: s.turn,
        playerId: s.players[s.currentPlayerIndex].id,
        action: conquered ? "conquered" : "attack",
        from: s.attackFrom!,
        to: s.attackTo!,
        result: `Lost ${attackerLosses}, enemy lost ${defenderLosses}`
      }]
    }))
    
    // If conquered, wait for user to move armies
    if (!conquered) {
      // Reset attack selection if not conquered
      set({ attackFrom: null, attackTo: null })
    }
  },
  
  conquestMove: (armies: number) => {
    const state = get()
    if (!state.attackFrom || !state.attackTo || !state.lastBattleResult?.conquered) return
    
    const fromState = state.territories.find(t => t.id === state.attackFrom)
    if (!fromState || armies >= fromState.armies || armies < 1) return
    
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    set(s => ({
      territories: s.territories.map(t => {
        if (t.id === s.attackFrom) {
          return { ...t, armies: t.armies - armies }
        }
        if (t.id === s.attackTo) {
          return { ...t, ownerId: currentPlayer.id, armies }
        }
        return t
      }),
      attackFrom: null,
      attackTo: null,
      lastBattleResult: null
    }))
    
    // Check if defender is eliminated
    get().checkWinCondition()
  },
  
  endAttackPhase: () => {
    set({
      phase: "fortify",
      attackFrom: null,
      attackTo: null,
      lastBattleResult: null
    })
  },
  
  selectFortifyFrom: (territoryId: string) => {
    const state = get()
    const territory = state.territories.find(t => t.id === territoryId)
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    if (!territory || !currentPlayer) return
    if (territory.ownerId !== currentPlayer.id) return
    if (territory.armies <= 1) return
    
    set({ fortifyFrom: territoryId, fortifyTo: null })
  },
  
  selectFortifyTo: (territoryId: string) => {
    const state = get()
    if (!state.fortifyFrom || !state.mapDefinition) return
    
    const fromTerritory = state.mapDefinition.territories.find(t => t.id === state.fortifyFrom)
    const toTerritoryState = state.territories.find(t => t.id === territoryId)
    const currentPlayer = state.players[state.currentPlayerIndex]
    
    if (!fromTerritory || !toTerritoryState || !currentPlayer) return
    if (toTerritoryState.ownerId !== currentPlayer.id) return
    if (!fromTerritory.neighbors.includes(territoryId)) return
    
    set({ fortifyTo: territoryId })
  },
  
  executeFortify: (armies: number) => {
    const state = get()
    if (!state.fortifyFrom || !state.fortifyTo) return
    
    const fromState = state.territories.find(t => t.id === state.fortifyFrom)
    if (!fromState || armies >= fromState.armies || armies < 1) return
    
    set(s => ({
      territories: s.territories.map(t => {
        if (t.id === s.fortifyFrom) {
          return { ...t, armies: t.armies - armies }
        }
        if (t.id === s.fortifyTo) {
          return { ...t, armies: t.armies + armies }
        }
        return t
      }),
      fortifyFrom: null,
      fortifyTo: null,
      history: [...s.history, {
        turn: s.turn,
        playerId: s.players[s.currentPlayerIndex].id,
        action: "fortify",
        from: s.fortifyFrom!,
        to: s.fortifyTo!,
        armies
      }]
    }))
    
    // End turn and move to next player
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.filter(p => p.alive).length
    const newTurn = nextPlayerIndex === 0 ? state.turn + 1 : state.turn
    
    set({
      currentPlayerIndex: nextPlayerIndex,
      turn: newTurn,
      phase: "draft",
      draftArmies: get().calculateDraftArmies()
    })
  },
  
  getTerritoryState: (territoryId: string) => {
    return get().territories.find(t => t.id === territoryId)
  },
  
  getPlayerTerritories: (playerId: number) => {
    return get().territories.filter(t => t.ownerId === playerId)
  },
  
  getAdjacentEnemyTerritories: (territoryId: string) => {
    const state = get()
    if (!state.mapDefinition) return []
    
    const territory = state.mapDefinition.territories.find(t => t.id === territoryId)
    const territoryState = state.territories.find(t => t.id === territoryId)
    
    if (!territory || !territoryState) return []
    
    return territory.neighbors
      .map(nId => state.territories.find(t => t.id === nId))
      .filter((t): t is TerritoryState => 
        t !== undefined && t.ownerId !== territoryState.ownerId
      )
  },
  
  checkWinCondition: () => {
    const state = get()
    const ownerIds = new Set(state.territories.map(t => t.ownerId))
    
    if (ownerIds.size === 1) {
      const winnerId = Array.from(ownerIds)[0]
      set(s => ({
        players: s.players.map(p => ({ ...p, alive: p.id === winnerId }))
      }))
      return true
    }
    
    // Update player alive status
    set(s => ({
      players: s.players.map(p => ({
        ...p,
        alive: s.territories.some(t => t.ownerId === p.id)
      }))
    }))
    
    return false
  },
  
  reset: () => {
    set(initialState)
  }
}))
