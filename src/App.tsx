import "./App.css"
import { useState, useMemo } from "react"
import { useGameStore } from "./store/game"
import { loadConfig, saveConfig, type GameConfig } from "./config/game"
import { getMapById } from "./data/territories"
import { motion } from "framer-motion"

function App() {
  const [config, setConfig] = useState<GameConfig>(loadConfig())
  const [setupComplete, setSetupComplete] = useState(false)
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2", "Player 3"])
  
  const {
    selectedMap,
    mapDefinition,
    players,
    territories,
    phase,
    currentPlayerIndex,
    turn,
    draftArmies,
    attackFrom,
    attackTo,
    lastBattleResult,
    fortifyFrom,
    fortifyTo,
    setMap,
    initGame,
    placeDraftArmy,
    selectAttackFrom,
    selectAttackTo,
    executeAttack,
    conquestMove,
    endAttackPhase,
    selectFortifyFrom,
    selectFortifyTo,
    executeFortify,
    getTerritoryState,
  } = useGameStore()
  
  const currentPlayer = players[currentPlayerIndex]
  
  // Translations
  const t = useMemo(() => {
    const translations = {
      tr: {
        title: "RISK - Dünya Hakimiyeti",
        setupTitle: "Oyun Kurulumu",
        selectMap: "Harita Seç",
        world: "Dünya",
        turkey: "Türkiye",
        europe: "Avrupa",
        playerCount: "Oyuncu Sayısı",
        humanPlayers: "İnsan Oyuncu",
        playerName: "Oyuncu Adı",
        startGame: "Oyunu Başlat",
        currentPlayer: "Sıradaki Oyuncu",
        turn: "Tur",
        phase: "Faz",
        draftPhase: "Ordu Yerleştirme",
        attackPhase: "Saldırı",
        fortifyPhase: "Takviye",
        armiesToPlace: "Yerleştirilecek Ordu",
        selectTerritory: "Bölge seç",
        selectAttackFrom: "Saldırı yapılacak bölge",
        selectAttackTo: "Hedef bölge",
        attack: "Saldır",
        endAttack: "Saldırıyı Bitir",
        fortify: "Takviye Yap",
        endTurn: "Turu Bitir",
        armies: "Ordu",
        conquered: "Fethedildi!",
        moveArmies: "Ordu Taşı",
        attackerDice: "Saldıran Zar",
        defenderDice: "Savunan Zar",
        roll: "Zar At"
    },
    en: {
        title: "RISK - World Domination",
        setupTitle: "Game Setup",
        selectMap: "Select Map",
        world: "World",
        turkey: "Turkey",
        europe: "Europe",
        playerCount: "Player Count",
        humanPlayers: "Human Players",
        playerName: "Player Name",
        startGame: "Start Game",
        currentPlayer: "Current Player",
        turn: "Turn",
        phase: "Phase",
        draftPhase: "Draft",
        attackPhase: "Attack",
        fortifyPhase: "Fortify",
        armiesToPlace: "Armies to Place",
        selectTerritory: "Select territory",
        selectAttackFrom: "Attack from",
        selectAttackTo: "Attack to",
        attack: "Attack",
        endAttack: "End Attack",
        fortify: "Fortify",
        endTurn: "End Turn",
        armies: "Armies",
        conquered: "Conquered!",
        moveArmies: "Move Armies",
        attackerDice: "Attacker Dice",
        defenderDice: "Defender Dice",
        roll: "Roll"
      }
    }
    return (lang: 'tr' | 'en') => (key: string) => {
      return (translations[lang] as any)[key] || key
    }
  }, [])
  
  const tr = t(config.language)
  
  // Handle player count change
  const updatePlayerCount = (count: number) => {
    const newConfig = { ...config, playerCount: count }
    setConfig(newConfig)
    saveConfig(newConfig)
    
    // Update player names array
    const newNames = Array.from({ length: count }, (_, i) => 
      playerNames[i] || `Player ${i + 1}`
    )
    setPlayerNames(newNames)
  }
  
  // Handle human players change
  const updateHumanPlayers = (count: number) => {
    const newConfig = { ...config, humanPlayers: Math.min(count, config.playerCount) }
    setConfig(newConfig)
    saveConfig(newConfig)
  }
  
  // Handle map selection
  const handleMapChange = (mapId: 'world' | 'turkey' | 'europe') => {
    const newConfig = { ...config, selectedMap: mapId }
    setConfig(newConfig)
    saveConfig(newConfig)
    setMap(mapId)
  }
  
  // Start game
  const handleStartGame = () => {
    initGame(playerNames.slice(0, config.playerCount), config.humanPlayers)
    setSetupComplete(true)
  }
  
  // Setup screen
  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">{tr('title')}</h1>
            <p className="text-slate-400 text-lg">{tr('setupTitle')}</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 space-y-6">
            {/* Map Selection */}
            <div>
              <label className="block text-sm font-semibold text-emerald-300 mb-3 uppercase tracking-wide">
                🗺️ {tr('selectMap')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['world', 'turkey', 'europe'] as const).map((mapId) => (
                  <button
                    key={mapId}
                    onClick={() => handleMapChange(mapId)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      config.selectedMap === mapId
                        ? 'bg-emerald-500 text-white shadow-lg scale-105'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr(mapId)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Player Count */}
    <div>
              <label className="block text-sm font-semibold text-blue-300 mb-3 uppercase tracking-wide">
                👥 {tr('playerCount')}
              </label>
              <input
                type="range"
                min="2"
                max="6"
                value={config.playerCount}
                onChange={(e) => updatePlayerCount(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-white text-2xl font-bold mt-2">
                {config.playerCount}
              </div>
              </div>
            
            {/* Human Players */}
            <div>
              <label className="block text-sm font-semibold text-purple-300 mb-3 uppercase tracking-wide">
                🎮 {tr('humanPlayers')}
                  </label>
                  <input
                type="range"
                min="1"
                max={config.playerCount}
                value={config.humanPlayers}
                onChange={(e) => updateHumanPlayers(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-white text-2xl font-bold mt-2">
                {config.humanPlayers}
              </div>
                </div>

            {/* Player Names */}
            <div>
              <label className="block text-sm font-semibold text-amber-300 mb-3 uppercase tracking-wide">
                ✏️ {tr('playerName')}
                          </label>
                          <div className="space-y-2">
                {playerNames.slice(0, config.playerCount).map((name, i) => (
                  <input
                    key={i}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...playerNames]
                      newNames[i] = e.target.value
                      setPlayerNames(newNames)
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none"
                    placeholder={`Player ${i + 1}`}
                  />
                            ))}
                          </div>
                    </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xl font-bold rounded-xl hover:from-emerald-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🎯 {tr('startGame')}
            </button>
                </div>
        </motion.div>
                  </div>
    )
  }
  
  // Game screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 mb-4">
          <div className="flex justify-between items-center">
                    <div>
              <h1 className="text-2xl font-bold text-white">{tr('title')}</h1>
              <p className="text-slate-400">
                {getMapById(selectedMap)?.name} • {tr('turn')} {turn}
              </p>
                </div>

            {currentPlayer && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-400">{tr('currentPlayer')}</div>
                  <div className="text-xl font-bold text-white">{currentPlayer.name}</div>
                    </div>
                <div
                  className="w-16 h-16 rounded-full border-4"
                  style={{ borderColor: currentPlayer.color, backgroundColor: currentPlayer.color + '40' }}
                />
                  </div>
            )}
              </div>
                </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {getMapById(selectedMap)?.name}
              </h2>
              
              {/* Simple territory list for now */}
              <div className="grid grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
                {mapDefinition?.territories.map((territory) => {
                  const state = getTerritoryState(territory.id)
                  const owner = state ? players[state.ownerId] : null
                  const isSelected = 
                    (phase === 'attack' && (attackFrom === territory.id || attackTo === territory.id)) ||
                    (phase === 'fortify' && (fortifyFrom === territory.id || fortifyTo === territory.id))
                  
                  return (
                <button
                      key={territory.id}
                  onClick={() => {
                        if (phase === 'draft' && state && state.ownerId === currentPlayer?.id) {
                          placeDraftArmy(territory.id)
                        } else if (phase === 'attack') {
                          if (!attackFrom) {
                            selectAttackFrom(territory.id)
                          } else {
                            selectAttackTo(territory.id)
                          }
                        } else if (phase === 'fortify') {
                          if (!fortifyFrom) {
                            selectFortifyFrom(territory.id)
                          } else {
                            selectFortifyTo(territory.id)
                          }
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-amber-400 shadow-lg scale-105'
                          : owner
                          ? 'border-slate-600 hover:border-slate-500'
                          : 'border-slate-700 bg-slate-900/50'
                      }`}
                      style={{
                        backgroundColor: owner ? owner.color + '30' : undefined,
                        borderColor: isSelected ? '#fbbf24' : (owner?.color || '#475569')
                      }}
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        {territory.name}
                      </div>
                      {state && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-300">{owner?.name.substring(0, 8)}</span>
                          <span className="text-sm font-bold text-white">
                            {state.armies} 🎖️
                    </span>
                        </div>
                      )}
                </button>
                  )
                })}
                </div>
              </div>
            </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Phase Info */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-lg font-bold text-white mb-3">{tr('phase')}</h3>
              
              {phase === 'draft' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                    <div className="text-sm text-emerald-300">{tr('armiesToPlace')}</div>
                    <div className="text-3xl font-bold text-white">{draftArmies}</div>
              </div>
                  <p className="text-sm text-slate-400 text-center">
                    {tr('selectTerritory')}
                  </p>
          </div>
        )}

              {phase === 'attack' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="text-xl font-bold text-white">{tr('attackPhase')}</div>
            </div>

                  {attackFrom && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-400">{tr('selectAttackFrom')}</div>
                      <div className="font-bold text-white">
                        {mapDefinition?.territories.find(t => t.id === attackFrom)?.name}
                    </div>
                    </div>
                  )}
                  
                  {attackTo && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-400">{tr('selectAttackTo')}</div>
                      <div className="font-bold text-white">
                        {mapDefinition?.territories.find(t => t.id === attackTo)?.name}
                      </div>
                  </div>
                )}
                  
                  {attackFrom && attackTo && !lastBattleResult && (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const fromState = getTerritoryState(attackFrom)
                          const toState = getTerritoryState(attackTo)
                          if (fromState && toState) {
                            const attackerDice = Math.min(3, fromState.armies - 1)
                            const defenderDice = Math.min(2, toState.armies)
                            executeAttack(attackerDice, defenderDice)
                          }
                        }}
                        className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600"
                      >
                        ⚔️ {tr('attack')}
                      </button>
                  </div>
                )}

                  {lastBattleResult?.conquered && (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-center">
                        <div className="text-emerald-300 font-bold">{tr('conquered')}</div>
                      </div>
                    <button
                      onClick={() => {
                          const fromState = getTerritoryState(attackFrom!)
                          if (fromState) {
                            conquestMove(Math.max(1, fromState.armies - 1))
                          }
                        }}
                        className="w-full py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600"
                      >
                        {tr('moveArmies')}
                    </button>
                  </div>
                )}
                
                  <button
                    onClick={endAttackPhase}
                    className="w-full py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    {tr('endAttack')}
                  </button>
                  </div>
                )}

              {phase === 'fortify' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <div className="text-xl font-bold text-white">{tr('fortifyPhase')}</div>
                  </div>
                  
                  {fortifyFrom && fortifyTo && (
                    <button
                      onClick={() => {
                        const fromState = getTerritoryState(fortifyFrom)
                        if (fromState) {
                          executeFortify(Math.max(1, fromState.armies - 1))
                        }
                      }}
                      className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
                    >
                      {tr('fortify')}
                    </button>
                )}
                  
                    <button
                    onClick={() => executeFortify(0)}
                    className="w-full py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    {tr('endTurn')}
                    </button>
                  </div>
                )}
                          </div>
            
            {/* Players */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-lg font-bold text-white mb-3">Oyuncular</h3>
              <div className="space-y-2">
                {players.filter(p => p.alive).map((player) => {
                  const territoryCount = territories.filter(t => t.ownerId === player.id).length
                  const armyCount = territories
                    .filter(t => t.ownerId === player.id)
                    .reduce((sum, t) => sum + t.armies, 0)
                      
                      return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border-2 ${
                        player.id === currentPlayer?.id
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-slate-600'
                      }`}
                      style={{ borderLeftWidth: '4px', borderLeftColor: player.color }}
                    >
                      <div className="font-bold text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">
                        {territoryCount} bölge • {armyCount} asker
              </div>
                        </div>
                      )
                    })}
                  </div>
                            </div>
                      </div>
                  </div>
                </div>
    </div>
  )
}

export default App
