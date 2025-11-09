import { create } from "zustand"
import { createRng } from "../lib/random"
import { getMapById, type MapDefinition } from "../data/territories"

export type GamePhase = "setup" | "placement" | "draft" | "attack" | "fortify"

export interface Player {
  id: number
  name: string
  color: string
  isHuman: boolean
  alive: boolean
  cards: TerritoryCard[]
}

export interface TerritoryCard {
  territory?: string
  type: "infantry" | "cavalry" | "artillery" | "wild"
}

export interface TerritoryState {
  id: string
  ownerId: number // player id, -1 for neutral
  armies: number
}

export interface GameSettings {
  placementMode: 'random' | 'sequential'
  battleSpeed?: 'instant' | 'normal'
  battleModel?: 'realistic' | 'random'
  resourceLevel: 'low' | 'medium' | 'high'
  attackMode: 'single' | 'all-in'
  instantMode?: boolean
  lowEffects?: boolean
  colorblindMode?: boolean
  sfx?: boolean
  mapVariant?: 'standard' | 'mini' | 'midi'
  customColors?: string[]
}

export interface GameState {
  // Map selection
  selectedMap: 'world' | 'turkey' | 'europe'
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
    attackerRolls?: number[]
    defenderRolls?: number[]
  } | null
  
  // Fortify phase
  fortifyFrom: string | null
  fortifyTo: string | null
  
  // Cards and bonuses
  cardsDeck: TerritoryCard[]
  conquestMadeThisTurn?: boolean
  // Flags
  draftHasPlaced?: boolean
  
  // Settings
  settings: GameSettings
  setSettings: (s: Partial<GameSettings>) => void
  redeemCards: () => { success: boolean }
  canRedeem: () => boolean
  
  // History
  history: HistoryEntry[]
  
  // Actions
  setMap: (mapId: 'world' | 'turkey' | 'europe') => void
  initGame: (playerNames: string[], humanPlayers: number, placementModeOverride?: 'random' | 'sequential') => void
  
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
  
  // AI
  playAITurn: () => void
  
  // Reset
  reset: () => void
  // placement reserves for sequential mode
  placementReserves?: number[]
  placementStage?: 'claim' | 'distribute'
  // Persistence
  saveGame?: () => boolean
  loadGame?: () => boolean
  saveGameToSlot?: (slot: number) => boolean
  loadGameFromSlot?: (slot: number) => boolean
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

const getInitialState = (): GameState => ({
  selectedMap: "turkey",
  mapDefinition: getMapById("turkey") || null,
  players: [],
  territories: [],
  phase: "setup",
  currentPlayerIndex: 0,
        turn: 0,
  draftArmies: 0,
  attackFrom: null,
  attackTo: null,
  lastBattleResult: null,
  fortifyFrom: null,
  fortifyTo: null,
        history: [],
  cardsDeck: [],
  conquestMadeThisTurn: false,
  // Flags
  draftHasPlaced: false,
  settings: {
    placementMode: 'random',
    battleSpeed: 'normal',
    battleModel: 'realistic',
    resourceLevel: 'medium',
    attackMode: 'single',
    instantMode: false,
    lowEffects: false,
    colorblindMode: false,
    sfx: true,
    mapVariant: 'standard'
  },
  setSettings: () => {},
  redeemCards: () => ({ success: false }),
  canRedeem: () => false,
  setMap: () => {},
  initGame: () => {},
  calculateDraftArmies: () => 3,
  placeDraftArmy: () => false,
  selectAttackFrom: () => {},
  selectAttackTo: () => {},
  executeAttack: () => {},
  conquestMove: () => {},
  endAttackPhase: () => {},
  selectFortifyFrom: () => {},
  selectFortifyTo: () => {},
  executeFortify: () => {},
  getTerritoryState: () => undefined,
  getPlayerTerritories: () => [],
  getAdjacentEnemyTerritories: () => [],
  checkWinCondition: () => false,
  playAITurn: () => {},
  reset: () => {},
  // placement reserves for sequential mode
  placementReserves: undefined,
  placementStage: undefined
})

const initialState = getInitialState()

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  saveGame: () => {
    try {
      const s = get()
      const snapshot = {
        selectedMap: s.selectedMap,
        players: s.players,
        territories: s.territories,
        phase: s.phase,
        currentPlayerIndex: s.currentPlayerIndex,
        turn: s.turn,
        draftArmies: s.draftArmies,
        attackFrom: s.attackFrom,
        attackTo: s.attackTo,
        lastBattleResult: s.lastBattleResult,
        fortifyFrom: s.fortifyFrom,
        fortifyTo: s.fortifyTo,
        cardsDeck: s.cardsDeck,
        conquestMadeThisTurn: s.conquestMadeThisTurn,
        draftHasPlaced: s.draftHasPlaced,
        settings: s.settings,
        history: s.history,
        placementReserves: s.placementReserves,
        placementStage: s.placementStage
      }
      localStorage.setItem('risk-save', JSON.stringify(snapshot))
      return true
    } catch {
      return false
    }
  },
  saveGameToSlot: (slot: number) => {
    try {
      const s = get()
      const snapshot = {
        selectedMap: s.selectedMap,
        players: s.players,
        territories: s.territories,
        phase: s.phase,
        currentPlayerIndex: s.currentPlayerIndex,
        turn: s.turn,
        draftArmies: s.draftArmies,
        attackFrom: s.attackFrom,
        attackTo: s.attackTo,
        lastBattleResult: s.lastBattleResult,
        fortifyFrom: s.fortifyFrom,
        fortifyTo: s.fortifyTo,
        cardsDeck: s.cardsDeck,
        conquestMadeThisTurn: s.conquestMadeThisTurn,
        draftHasPlaced: s.draftHasPlaced,
        settings: s.settings,
        history: s.history,
        placementReserves: s.placementReserves,
        placementStage: s.placementStage,
        savedAt: Date.now()
      }
      localStorage.setItem(`risk-save-${Math.max(1, Math.min(5, slot))}`, JSON.stringify(snapshot))
      return true
    } catch {
      return false
    }
  },
  loadGame: () => {
    try {
      const raw = localStorage.getItem('risk-save')
      if (!raw) return false
      const snap = JSON.parse(raw)
      const mapDef = getMapById(snap.selectedMap)
      if (!mapDef) return false
      set({
        selectedMap: snap.selectedMap,
        mapDefinition: mapDef,
        players: snap.players || [],
        territories: snap.territories || [],
        phase: snap.phase || 'draft',
        currentPlayerIndex: snap.currentPlayerIndex || 0,
        turn: snap.turn || 1,
        draftArmies: snap.draftArmies || 0,
        attackFrom: snap.attackFrom || null,
        attackTo: snap.attackTo || null,
        lastBattleResult: snap.lastBattleResult || null,
        fortifyFrom: snap.fortifyFrom || null,
        fortifyTo: snap.fortifyTo || null,
        cardsDeck: snap.cardsDeck || [],
        conquestMadeThisTurn: !!snap.conquestMadeThisTurn,
        draftHasPlaced: !!snap.draftHasPlaced,
        settings: { ...initialState.settings, ...(snap.settings || {}) },
        history: snap.history || [],
        placementReserves: snap.placementReserves,
        placementStage: snap.placementStage
      })
      return true
    } catch {
      return false
    }
  },
  loadGameFromSlot: (slot: number) => {
    try {
      const raw = localStorage.getItem(`risk-save-${Math.max(1, Math.min(5, slot))}`)
      if (!raw) return false
      const snap = JSON.parse(raw)
      const mapDef = getMapById(snap.selectedMap)
      if (!mapDef) return false
      set({
        selectedMap: snap.selectedMap,
        mapDefinition: mapDef,
        players: snap.players || [],
        territories: snap.territories || [],
        phase: snap.phase || 'draft',
        currentPlayerIndex: snap.currentPlayerIndex || 0,
        turn: snap.turn || 1,
        draftArmies: snap.draftArmies || 0,
        attackFrom: snap.attackFrom || null,
        attackTo: snap.attackTo || null,
        lastBattleResult: snap.lastBattleResult || null,
        fortifyFrom: snap.fortifyFrom || null,
        fortifyTo: snap.fortifyTo || null,
        cardsDeck: snap.cardsDeck || [],
        conquestMadeThisTurn: !!snap.conquestMadeThisTurn,
        draftHasPlaced: !!snap.draftHasPlaced,
        settings: { ...initialState.settings, ...(snap.settings || {}) },
        history: snap.history || [],
        placementReserves: snap.placementReserves,
        placementStage: snap.placementStage
      })
      return true
    } catch {
      return false
    }
  },
  redeemCards: () => {
    const state = get()
    const currentPlayer = state.players[state.currentPlayerIndex]
    if (!currentPlayer) return { success: false }
    // Only during draft and before placing armies this turn
    if (state.phase !== 'draft' || state.draftHasPlaced) return { success: false }
    if ((currentPlayer.cards?.length || 0) < 3) return { success: false }

    // Evaluate best set: one-of-each (10) > three artillery (8) > three cavalry (6) > three infantry (4)
    const types = (currentPlayer.cards || []).map(c => c.type)
    const count = (t: TerritoryCard['type']) => types.filter(x => x === t).length
    const wilds = types.filter(t => t === 'wild').length

    const removeSet = (needed: Record<string, number>) => {
      const toRemoveIdx: number[] = []
      const need: Record<string, number> = { ...needed }
      currentPlayer.cards.forEach((c, i) => {
        if (need[c.type] && need[c.type]! > 0) {
          need[c.type]! -= 1
          toRemoveIdx.push(i)
        }
      })
      // use wilds
      let wildLeft = wilds - toRemoveIdx.filter(i => currentPlayer.cards[i].type === 'wild').length
      Object.keys(need).forEach(k => {
        while (need[k]! > 0 && wildLeft > 0) {
          // remove a wild index not already chosen
          const wi = currentPlayer.cards.findIndex((c, idx) => c.type === 'wild' && !toRemoveIdx.includes(idx))
          if (wi >= 0) {
            toRemoveIdx.push(wi)
            need[k]! -= 1
            wildLeft -= 1
          } else {
            wildLeft = 0
          }
        }
      })
      const ok = Object.values(need).every(v => (v || 0) <= 0)
      if (!ok) return null
      // remove highest indices first
      toRemoveIdx.sort((a,b)=> b-a)
      const newCards = [...currentPlayer.cards]
      toRemoveIdx.forEach(i => newCards.splice(i,1))
      return newCards
    }

    let award = 0
    let newCards: TerritoryCard[] | null = null
    // one of each
    if ((count('infantry') + wilds) >= 1 && (count('cavalry') + wilds) >= 1 && (count('artillery') + wilds) >= 1) {
      newCards = removeSet({ infantry: 1, cavalry: 1, artillery: 1 })
      award = 10
    } else if ((count('artillery') + wilds) >= 3) {
      newCards = removeSet({ artillery: 3 })
      award = 8
    } else if ((count('cavalry') + wilds) >= 3) {
      newCards = removeSet({ cavalry: 3 })
      award = 6
    } else if ((count('infantry') + wilds) >= 3) {
      newCards = removeSet({ infantry: 3 })
      award = 4
    }

    if (!newCards) return { success: false }

    set((s) => ({
      players: s.players.map(p => p.id === currentPlayer.id ? { ...p, cards: newCards! } : p),
      draftArmies: (s.draftArmies || 0) + award,
      history: [...s.history, { turn: s.turn, playerId: currentPlayer.id, action: 'draft', result: `Redeemed cards for ${award} armies` }]
    }))
    return { success: true }
  },
  canRedeem: () => {
    const s = get()
    const p = s.players[s.currentPlayerIndex]
    if (!p) return false
    if (s.phase !== 'draft' || s.draftHasPlaced) return false
    return (p.cards?.length || 0) >= 3
  },
  
  setMap: (mapId) => {
    const variant = get().settings.mapVariant || 'standard'
    let targetId: string = mapId
    if (variant === 'midi') {
      const alt = `${mapId}_midi`
      if (getMapById(alt)) targetId = alt
    } else if (variant === 'mini') {
      const alt = `${mapId}_mini`
      if (getMapById(alt)) targetId = alt
    }
    const mapDef = getMapById(targetId)
    if (!mapDef) {
      console.error('Map not found:', mapId)
      return
    }
    
    console.log('Setting map:', targetId, 'territories:', mapDef.territories.length)
    
    set({
      selectedMap: mapId,
      mapDefinition: mapDef,
      territories: [],
      players: [],
      phase: "setup",
      placementReserves: undefined
    })
  },
  
  initGame: (playerNames: string[], humanPlayers: number, placementModeOverride?: 'random' | 'sequential') => {
    const state = get()
    if (!state.mapDefinition) {
      console.error('No map definition loaded!')
      return
    }

    const placementMode = placementModeOverride || state.settings.placementMode

    const defaultColors = ["#EF4444","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899"]
    const colorblindColors = ["#0072B2","#E69F00","#009E73","#CC79A7","#D55E00","#56B4E9"]
    let playerColors = state.settings.colorblindMode ? colorblindColors : defaultColors
    const requested = (state.settings.customColors || []).filter(Boolean)
    if (requested.length >= playerNames.length) {
      playerColors = requested
    }

    const players: Player[] = playerNames.map((name, i) => ({
      id: i,
      name,
      color: playerColors[i % playerColors.length],
      isHuman: i < humanPlayers,
      alive: true,
      cards: []
    }))

    // Start with all territories neutral
    const neutralTerritories: TerritoryState[] = state.mapDefinition.territories.map(t => ({ id: t.id, ownerId: -1, armies: 0 }))

    if (placementMode === 'sequential') {
      set({
        players,
        territories: neutralTerritories,
        phase: 'placement',
        placementStage: 'claim',
        currentPlayerIndex: 0,
        turn: 0,
        draftArmies: 0,
        history: [{ turn: 0, playerId: -1, action: 'draft', result: 'Placement claim started' }],
        cardsDeck: [],
        conquestMadeThisTurn: false,
        placementReserves: players.map(()=> 6),
        draftHasPlaced: false
      })
      return
    }

    // Random placement: assign 1 per territory and give remaining as reserves
    const rng = createRng(Date.now().toString())
    const order = [...neutralTerritories].sort(() => rng() - 0.5)
    order.forEach((territory, idx) => { territory.ownerId = idx % players.length; territory.armies = 1 })

    set({
      players,
      territories: order,
      phase: 'draft',
      currentPlayerIndex: 0,
      turn: 1,
      draftArmies: 6,
      history: [{ turn: 0, playerId: -1, action: 'draft', result: 'Game initialized' }],
      cardsDeck: [],
      conquestMadeThisTurn: false,
      placementReserves: undefined,
      placementStage: undefined,
      draftHasPlaced: false
    })
    // Enforce forced redemption at draft start if player has 5+ cards
    setTimeout(() => {
      const p = get().players[get().currentPlayerIndex]
      if (p && (p.cards?.length || 0) >= 5) {
        let safety = 0
        while ((get().players[get().currentPlayerIndex].cards?.length || 0) >= 5 && safety < 5) {
          const res = get().redeemCards()
          if (!res.success) break
          safety++
        }
      }
    }, 0)
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

    if (state.phase === 'placement') {
      // Claim stage
      if (state.placementStage === 'claim') {
        if (territory.ownerId !== -1) return false
        set(s => {
          const nextTerritories = s.territories.map(t => t.id === territoryId ? { ...t, ownerId: currentPlayer.id, armies: 1 } : t)
          const neutralsLeft = nextTerritories.filter(t => t.ownerId === -1).length
          const nextIdx = (s.currentPlayerIndex + 1) % s.players.length
          const moveToDistribute = neutralsLeft === 0
          return {
            territories: nextTerritories,
            currentPlayerIndex: moveToDistribute ? 0 : nextIdx,
            placementStage: moveToDistribute ? 'distribute' : 'claim',
            draftArmies: moveToDistribute ? (s.placementReserves?.[0] || 0) : 0,
            phase: 'placement',
            turn: 0
          }
        })
        // Kick AI if needed
        setTimeout(() => {
          const player = get().players[get().currentPlayerIndex]
          if (player && !player.isHuman) get().playAITurn()
        }, 200)
        return true
      }
      // Distribute stage
      const reserves = (state.placementReserves || [])
      const left = reserves[state.currentPlayerIndex] || 0
      if (left <= 0) {
        // advance to next player with reserves or move to draft
        let nextIdx = state.currentPlayerIndex
        for (let i = 0; i < state.players.length; i++) {
          nextIdx = (nextIdx + 1) % state.players.length
          if ((reserves[nextIdx] || 0) > 0) break
        }
        const allDone = reserves.every(x => (x || 0) === 0)
        set({
          currentPlayerIndex: allDone ? 0 : nextIdx,
          draftArmies: allDone ? 0 : (reserves[nextIdx] || 0),
          phase: allDone ? 'draft' : 'placement',
          turn: allDone ? 1 : state.turn
        })
        if (get().phase === 'draft' && get().turn === 1) {
          set({ draftArmies: get().calculateDraftArmies() })
          // If first draft player is AI, trigger AI
          setTimeout(() => {
            const player = get().players[get().currentPlayerIndex]
            if (player && !player.isHuman) get().playAITurn()
          }, 200)
        } else {
          setTimeout(() => {
            const player = get().players[get().currentPlayerIndex]
            if (player && !player.isHuman) get().playAITurn()
          }, 200)
        }
        return false
      }
      if (territory.ownerId !== currentPlayer.id) return false
      set(s => {
        const nextRes = [...(s.placementReserves || [])]
        nextRes[s.currentPlayerIndex] = Math.max(0, (nextRes[s.currentPlayerIndex] || 0) - 1)
        // move to next player with reserves
        let nextIdx = s.currentPlayerIndex
        for (let i = 0; i < s.players.length; i++) {
          nextIdx = (nextIdx + 1) % s.players.length
          if ((nextRes[nextIdx] || 0) > 0) break
        }
        const allDone = nextRes.every(x => (x || 0) === 0)
        return {
          territories: s.territories.map(t => t.id === territoryId ? { ...t, armies: t.armies + 1 } : t),
          placementReserves: nextRes,
          currentPlayerIndex: allDone ? 0 : nextIdx,
          draftArmies: allDone ? 0 : (nextRes[nextIdx] || 0),
          phase: allDone ? 'draft' : 'placement',
          turn: allDone ? 1 : s.turn
        }
      })
      if (get().phase === 'draft' && get().turn === 1) {
        set({ draftArmies: get().calculateDraftArmies() })
      }
      // Kick AI if needed
      setTimeout(() => {
        const player = get().players[get().currentPlayerIndex]
        if (player && !player.isHuman) get().playAITurn()
      }, 200)
      return true
    }

    // Draft placement (normal turn)
    if (state.phase !== 'draft') return false
    if (territory.ownerId !== currentPlayer.id) return false
    // Forced redemption: if player holds 5+ cards at start of draft (before placing), auto-redeem
    if (!state.draftHasPlaced && (currentPlayer.cards?.length || 0) >= 5) {
      let safety = 0
      while ((get().players[get().currentPlayerIndex].cards?.length || 0) >= 5 && safety < 5) {
        const res = get().redeemCards()
        if (!res.success) break
        safety++
      }
      // If still 5+, block placement until a valid set exists
      const pNow = get().players[get().currentPlayerIndex]
      if ((pNow.cards?.length || 0) >= 5) return false
    }
    if (state.draftArmies <= 0) return false
    set(s => ({
      territories: s.territories.map(t => t.id === territoryId ? { ...t, armies: t.armies + 1 } : t),
      draftArmies: s.draftArmies - 1,
      draftHasPlaced: true,
      history: [...s.history, { turn: s.turn, playerId: currentPlayer.id, action: 'draft', to: territoryId, armies: 1 }]
    }))
    
    // If all draft armies placed, move phase
    const after = get()
    if (after.draftArmies === 0) {
      if (after.turn === 1) {
        // Skip fortify on first round: immediately end turn
        setTimeout(() => get().executeFortify(0), 50)
      } else {
        set({ phase: 'attack' })
      }
      const player = get().players[get().currentPlayerIndex]
      if (player && !player.isHuman) setTimeout(() => get().playAITurn(), 300)
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
    
    const singleRound = () => {
      const fromState = get().territories.find(t => t.id === get().attackFrom)
      const toState = get().territories.find(t => t.id === get().attackTo)
      if (!fromState || !toState) return { conquered: false }
      const rng = createRng(Date.now().toString())
      const aDice = Math.max(1, Math.min(3, attackerDice))
      const dDice = Math.max(1, Math.min(2, defenderDice))
      const attackerRolls = Array.from({ length: aDice }, () => Math.floor(rng() * 6) + 1).sort((a, b) => b - a)
      const defenderRolls = Array.from({ length: dDice }, () => Math.floor(rng() * 6) + 1).sort((a, b) => b - a)
      let attackerLosses = 0
      let defenderLosses = 0
      const comparisons = Math.min(attackerRolls.length, defenderRolls.length)
      for (let i = 0; i < comparisons; i++) {
        const ar = attackerRolls[i]
        const dr = defenderRolls[i]
        if (ar > dr) defenderLosses++
        else attackerLosses++
      }
      const newDefenderArmies = toState.armies - defenderLosses
      const conquered = newDefenderArmies <= 0
      set(s => ({
        territories: s.territories.map(t => {
          if (t.id === s.attackFrom) {
            return { ...t, armies: Math.max(1, t.armies - attackerLosses) }
          }
          if (t.id === s.attackTo) {
            return { ...t, armies: conquered ? 0 : Math.max(0, newDefenderArmies) }
          }
          return t
        }),
        lastBattleResult: { attackerLosses, defenderLosses, conquered, attackerRolls, defenderRolls },
        history: [...s.history, { turn: s.turn, playerId: s.players[s.currentPlayerIndex].id, action: conquered ? 'conquered' : 'attack', from: s.attackFrom!, to: s.attackTo!, result: `Lost ${attackerLosses}, enemy lost ${defenderLosses}` }],
        conquestMadeThisTurn: s.conquestMadeThisTurn || conquered
      }))
      return { conquered }
    }

    if (get().settings.instantMode) {
      // Repeat rounds until end of battle
      let safety = 0
      while (safety < 200) {
        const fromNow = get().territories.find(t => t.id === get().attackFrom)
        const toNow = get().territories.find(t => t.id === get().attackTo)
        if (!fromNow || !toNow) break
        if (fromNow.armies <= 1) break
        const result = singleRound()
        if (result.conquered) break
        safety++
      }
      return
    }

    singleRound()
  },
  
  conquestMove: (armies: number) => {
    const state = get()
    if (!state.attackFrom || !state.attackTo || !state.lastBattleResult?.conquered) return
    
    const fromState = state.territories.find(t => t.id === state.attackFrom)
    const toBefore = state.territories.find(t => t.id === state.attackTo)
    if (!fromState || armies >= fromState.armies || armies < 1) return
    
    const currentPlayer = state.players[state.currentPlayerIndex]
    const defeatedPlayerId = toBefore?.ownerId ?? -1
    
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
    
    // Check if defender is eliminated; transfer cards if so
    const territoriesLeft = get().territories.some(t => t.ownerId === defeatedPlayerId)
    if (!territoriesLeft && defeatedPlayerId >= 0) {
      set(s => ({
        players: s.players.map(p => {
          if (p.id === currentPlayer.id) {
            const defeated = s.players.find(pp => pp.id === defeatedPlayerId)
            const gained = defeated?.cards || []
            return { ...p, cards: [...(p.cards || []), ...gained] }
          }
          if (p.id === defeatedPlayerId) {
            return { ...p, cards: [] }
          }
          return p
        }),
        history: [...s.history, { turn: s.turn, playerId: currentPlayer.id, action: 'attack', result: 'Captured all cards from eliminated player' }]
      }))
    }
    get().checkWinCondition()
  },
  
  endAttackPhase: () => {
    // Award card if conquest happened this turn
    const state = get()
    if (state.conquestMadeThisTurn) {
      set((s) => {
        const deck = [...s.cardsDeck]
        const card = deck.pop() || { type: 'wild' }
        const players = s.players.map((p, i) => i === s.currentPlayerIndex ? { ...p, cards: [...(p.cards||[]), card] } : p)
        return { players, cardsDeck: deck, conquestMadeThisTurn: false }
      })
    }
    
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
    
    // Allow skipping fortify by passing 0
    if (armies === 0 || !state.fortifyFrom || !state.fortifyTo) {
      // End turn
      const alivePlayers = state.players.filter(p => p.alive)
      const currentIndex = alivePlayers.findIndex(p => p.id === state.players[state.currentPlayerIndex].id)
      const nextIndex = (currentIndex + 1) % alivePlayers.length
      const nextPlayerId = alivePlayers[nextIndex].id
      const nextPlayerIndex = state.players.findIndex(p => p.id === nextPlayerId)
      const newTurn = nextIndex === 0 ? state.turn + 1 : state.turn
      
      set({
        currentPlayerIndex: nextPlayerIndex,
        turn: newTurn,
        phase: "draft",
        draftArmies: 0,
        fortifyFrom: null,
        fortifyTo: null,
        draftHasPlaced: false
      })
      
      // Calculate draft armies for next player
      setTimeout(() => {
        set({ draftArmies: get().calculateDraftArmies() })
        // Auto-play AI turn
        const nextPlayer = get().players[get().currentPlayerIndex]
        if (nextPlayer && !nextPlayer.isHuman) {
          setTimeout(() => get().playAITurn(), 500)
        }
      }, 100)
      
      return
    }
    
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
    const alivePlayers = state.players.filter(p => p.alive)
    const currentIndex = alivePlayers.findIndex(p => p.id === state.players[state.currentPlayerIndex].id)
    const nextIndex = (currentIndex + 1) % alivePlayers.length
    const nextPlayerId = alivePlayers[nextIndex].id
    const nextPlayerIndex = state.players.findIndex(p => p.id === nextPlayerId)
    const newTurn = nextIndex === 0 ? state.turn + 1 : state.turn
    
    set({
      currentPlayerIndex: nextPlayerIndex,
      turn: newTurn,
      phase: "draft",
      draftArmies: 0,
      draftHasPlaced: false
    })
    
    // Calculate draft armies for next player and enforce forced redemption at >=5 cards
    setTimeout(() => {
      set({ draftArmies: get().calculateDraftArmies() })
      const p = get().players[get().currentPlayerIndex]
      // force redeem while 5+ cards
      if (p && (p.cards?.length || 0) >= 5) {
        let safety = 0
        while ((get().players[get().currentPlayerIndex].cards?.length || 0) >= 5 && safety < 5) {
          const res = get().redeemCards()
          if (!res.success) break
          safety++
        }
      }
      const nextPlayer = get().players[get().currentPlayerIndex]
      if (nextPlayer && !nextPlayer.isHuman) {
        setTimeout(() => get().playAITurn(), 500)
      }
    }, 100)
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
  
  // AI
  playAITurn: () => {
    const state = get()
    const currentPlayer = state.players[state.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.isHuman) {
      return
    }

    const pickFirst = <T,>(arr: T[]): T | undefined => arr[0]
    const pickRandom = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)]
    const chooser = state.settings.placementMode === 'sequential' ? pickFirst : pickRandom

    // Placement phases
    if (state.phase === 'placement') {
      if (state.placementStage === 'claim') {
        const neutrals = state.territories.filter(t => t.ownerId === -1)
        if (neutrals.length === 0) return
        const ordered = neutrals.sort((a,b)=> a.id.localeCompare(b.id))
        const pick = chooser(ordered)
        if (pick) get().placeDraftArmy(pick.id)
        return
      } else {
        const myTerritories = state.territories.filter(t => t.ownerId === currentPlayer.id)
        if (myTerritories.length === 0) return
        const ordered = myTerritories.sort((a,b)=> a.id.localeCompare(b.id))
        const pick = chooser(ordered)
        if (pick) get().placeDraftArmy(pick.id)
        return
      }
    }

    // Draft phase - place all armies
    if (state.phase === 'draft') {
      const myTerritories = state.territories.filter(t => t.ownerId === currentPlayer.id)
      const ordered = myTerritories.sort((a,b)=> a.id.localeCompare(b.id))
      let safetyCounter = 0
      while (get().draftArmies > 0 && safetyCounter < 200) {
        const pick = chooser(ordered)
        if (!pick) break
        const success = get().placeDraftArmy(pick.id)
        if (!success) break
        safetyCounter++
      }
      return
    }

    // Attack phase - only if not first round
    if (state.phase === 'attack' && state.turn > 1) {
      const myAttackers = state.territories.filter(t => t.ownerId === currentPlayer.id && t.armies > 1)
      const attackersOrdered = myAttackers.sort((a,b)=> a.id.localeCompare(b.id))
      let attacksMade = 0
      const maxAttacks = Math.min(3, myAttackers.length)
      while (attacksMade < maxAttacks) {
        const fromTerritory = chooser(attackersOrdered)!
        if (!fromTerritory) break
        const fromDef = state.mapDefinition?.territories.find(t => t.id === fromTerritory.id)
        if (!fromDef) break
        const enemyNeighbors = fromDef.neighbors
          .map(nId => state.territories.find(t => t.id === nId))
          .filter(t => t && t.ownerId !== currentPlayer.id) as TerritoryState[]
        const targetOrdered = enemyNeighbors.sort((a,b)=> a.id.localeCompare(b.id))
        const target = chooser(targetOrdered)
        if (!target) { attacksMade++; continue }
        get().selectAttackFrom(fromTerritory.id)
        get().selectAttackTo(target.id)
        const fromState = get().getTerritoryState(fromTerritory.id)
        const toState = get().getTerritoryState(target.id)
        if (fromState && toState) {
          const attackerDice = Math.min(3, fromState.armies - 1)
          const defenderDice = Math.min(2, toState.armies)
          get().executeAttack(attackerDice, defenderDice)
          if (get().lastBattleResult?.conquered) {
            const updatedFrom = get().getTerritoryState(fromTerritory.id)
            if (updatedFrom) {
              const armiesToMove = Math.max(1, Math.floor(updatedFrom.armies / 2))
              get().conquestMove(armiesToMove)
            }
          }
        }
        attacksMade++
      }
      setTimeout(() => get().endAttackPhase(), 300)
      return
    }

    // Fortify phase - skip
    if (state.phase === 'fortify') {
      setTimeout(() => get().executeFortify(0), 200)
      return
    }
  },
  
  reset: () => {
    set(getInitialState())
  }
}))
