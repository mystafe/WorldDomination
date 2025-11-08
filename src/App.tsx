import "./App.css"
import { useState, useMemo, useEffect, useRef, type CSSProperties } from "react"
import { useGameStore } from "./store/game"
import { loadConfig, saveConfig, type GameConfig } from "./config/game"
import { getMapById } from "./data/territories"
import { motion } from "framer-motion"
import RealMap from "./components/RealMap"

function App() {
  const [config, setConfig] = useState<GameConfig>(loadConfig())
  const [setupComplete, setSetupComplete] = useState(false)
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2", "Player 3"])
  const defaultColorsNormal = ["#EF4444","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899"]
  const defaultColorsCB = ["#0072B2","#E69F00","#009E73","#CC79A7","#D55E00","#56B4E9"]
  const [playerColors, setPlayerColors] = useState<string[]>(defaultColorsNormal)
  const [conquestArmies, setConquestArmies] = useState(1)
  const [fortifyArmies, setFortifyArmies] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const holdActiveRef = useRef<string | null>(null)
  const holdDelayRef = useRef<number>(200)
  const holdCountRef = useRef<number>(0)
  const holdFiredRef = useRef<boolean>(false)
  const [isMobile, setIsMobile] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicOn, setMusicOn] = useState(true)
  const [logoOk, setLogoOk] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [battleBanner, setBattleBanner] = useState<{ a: number; d: number; conquered?: boolean } | null>(null)

  useEffect(() => {
    const chk = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    chk()
    window.addEventListener('resize', chk)
    return () => window.removeEventListener('resize', chk)
  }, [])
  // Update default palette if colorblind mode toggles before start
  useEffect(() => {
    setPlayerColors(config.colorblindMode ? defaultColorsCB : defaultColorsNormal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.colorblindMode])
  // Ensure store reflects default selected map on landing
  useEffect(() => {
    try { setMap(loadConfig().selectedMap) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const mapHeightClass = isMobile ? 'h-[50vh]' : 'h-[90vh]'
  useEffect(() => {
    // Background music only during game
    try {
      if (setupComplete) {
        if (!audioRef.current) {
          audioRef.current = new Audio('/assets/champions.mp3')
          audioRef.current.loop = true
          audioRef.current.volume = 0.18
        }
        if (musicOn) {
          audioRef.current.play().catch(() => {})
        } else {
          audioRef.current.pause()
        }
      } else {
        audioRef.current?.pause()
      }
    } catch {}
    return () => {
      audioRef.current?.pause()
    }
  }, [setupComplete, musicOn])
  useEffect(() => {
    // Onboarding once on game screen
    if (setupComplete) {
      try {
        const done = localStorage.getItem('risk-onboarding-dismissed')
        if (!done) setShowOnboarding(true)
      } catch {}
    }
  }, [setupComplete])
  
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
    playAITurn,
    setSettings,
    redeemCards,
    canRedeem,
    placementStage,
    placementReserves
  } = useGameStore()
  
  const currentPlayer = players[currentPlayerIndex]
  const turnColor = currentPlayer?.color || '#10B981'
  const turnCardStyle: CSSProperties = {
    backgroundColor: `${turnColor}33`,
    borderColor: `${turnColor}66`,
    boxShadow: `0 8px 30px ${turnColor}22`
  }
  
  // Auto-play AI turns
  useEffect(() => {
    if (!currentPlayer) return
    if (currentPlayer.isHuman) return
    if (phase === 'setup') return
    
    const timer = setTimeout(() => {
      playAITurn()
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [currentPlayerIndex, phase])

  // Phase info message (persistent during phase)
  const phaseInfo = useMemo(() => {
    if (phase === 'placement') {
      if (placementStage === 'claim') return config.language==='tr' ? 'Reinforcement: Boş bölge seçip sahiplenin' : 'Reinforcement: Claim a neutral territory'
      return config.language==='tr' ? 'Reinforcement: Rezervleri bölgelerinize sırayla dağıtın' : 'Reinforcement: Distribute reserves to your territories'
    }
    if (phase === 'draft') {
      return config.language==='tr' ? 'Draft: Bölgelerinize takviye asker yerleştirin' : 'Draft: Place reinforcements on your territories'
    }
    return null
  }, [phase, placementStage, config.language])
  
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
        credit: "Geliştirici: Mustafa Evleksiz",
        playerCount: "Oyuncu Sayısı",
        humanPlayers: "İnsan Oyuncu",
        playerName: "Oyuncu Adı",
        startGame: "Oyunu Başlat",
        currentPlayer: "Sıradaki Oyuncu",
        turn: "Tur",
        phase: "Faz",
        reinforcementPhase: "Reinforcement",
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
        moveOne: "1 Taşı",
        moveAll: "Tümünü Taşı",
        attackerDice: "Saldıran Zar",
        defenderDice: "Savunan Zar",
        roll: "Zar At",
        settings: "Ayarlar",
        placement: "Yerleşim",
        speed: "Savaş Hızı",
        model: "Savaş Modeli",
        resources: "Kaynak Seviyesi",
        random: "Rastgele",
        sequential: "Sıra ile",
        instant: "Anlık",
        normal: "Normal",
        realistic: "Gerçekçi",
        low: "Az",
        medium: "Orta",
        high: "Bol",
        cards: "Kartlar",
        redeem3: "3 kartı bozdur (6 ordu)",
        need3: "En az 3 kart gerek",
        loadingMap: "Harita yükleniyor...",
        noMap: "Harita seçilmedi",
        go: "Git",
        clear: "Temizle",
        allIn: "All‑in",
        territoriesWord: "bölge",
        attacker: "Saldıran",
        defender: "Savunan",
        resultLabel: "Sonuç"
      },
      en: {
        title: "RISK - World Domination",
        setupTitle: "Game Setup",
        selectMap: "Select Map",
        world: "World",
        turkey: "Türkiye",
        europe: "Europe",
        credit: "Developed by Mustafa Evleksiz",
        playerCount: "Player Count",
        humanPlayers: "Human Players",
        playerName: "Player Name",
        startGame: "Start Game",
        currentPlayer: "Current Player",
        turn: "Turn",
        phase: "Phase",
        reinforcementPhase: "Reinforcement",
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
        moveOne: "Move 1",
        moveAll: "Move All",
        attackerDice: "Attacker Dice",
        defenderDice: "Defender Dice",
        roll: "Roll",
        settings: "Settings",
        placement: "Placement",
        speed: "Battle Speed",
        model: "Battle Model",
        resources: "Resources",
        random: "Random",
        sequential: "Sequential",
        instant: "Instant",
        normal: "Normal",
        realistic: "Realistic",
        low: "Low",
        medium: "Medium",
        high: "High",
        cards: "Cards",
        redeem3: "Redeem 3 cards (6 armies)",
        need3: "Need at least 3 cards",
        loadingMap: "Loading map...",
        noMap: "No map selected",
        go: "Go",
        clear: "Clear",
        allIn: "All‑in",
        territoriesWord: "territories",
        attacker: "Attacker",
        defender: "Defender",
        resultLabel: "Result"
      }
    }
    return (lang: 'tr' | 'en') => (key: string) => {
      return (translations[lang] as any)[key] || key
    }
  }, [])
  
  const tr = t(config.language)
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentPlayer) return
      if (e.key.toLowerCase() === 'r') {
        // redeem if allowed
        try { (useGameStore.getState() as any).canRedeem && (useGameStore.getState() as any).canRedeem() && redeemCards() } catch {}
      }
      if (e.key.toLowerCase() === 'e' && phase === 'attack') {
        endAttackPhase()
      }
      if (e.key.toLowerCase() === 'f' && phase === 'fortify' && fortifyFrom && fortifyTo) {
        const maxMove = Math.max(1, (getTerritoryState(fortifyFrom)?.armies || 1) - 1)
        executeFortify(maxMove)
      }
      if (e.key.toLowerCase() === 'a' && attackFrom && attackTo && !lastBattleResult) {
        const fromState = getTerritoryState(attackFrom)
        const toState = getTerritoryState(attackTo)
        if (fromState && toState) {
          const attackerDice = Math.min(3, fromState.armies - 1)
          const defenderDice = Math.min(2, toState.armies)
          executeAttack(attackerDice, defenderDice)
        }
      }
      if (e.key.toLowerCase() === 'i' && attackFrom && attackTo && !lastBattleResult) {
        // trigger the same all-in handler as button
        const click = document.querySelector('button:contains("All‑in")') as HTMLButtonElement | null
        if (click) click.click()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentPlayer, phase, attackFrom, attackTo, lastBattleResult, fortifyFrom, fortifyTo])

  // SFX for battle events
  const playSfx = (type: 'attack' | 'conquer') => {
    if (!config.sfx) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = type === 'conquer' ? 880 : 440
      g.gain.value = 0.001
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      // simple envelope
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + (type === 'conquer' ? 0.35 : 0.18))
      o.stop(ctx.currentTime + (type === 'conquer' ? 0.4 : 0.2))
      setTimeout(() => ctx.close(), 500)
    } catch {}
  }
  useEffect(() => {
    if (!lastBattleResult) return
    playSfx(lastBattleResult.conquered ? 'conquer' : 'attack')
    setBattleBanner({ a: lastBattleResult.attackerLosses || 0, d: lastBattleResult.defenderLosses || 0, conquered: !!lastBattleResult.conquered })
    const t = setTimeout(() => setBattleBanner(null), lastBattleResult.conquered ? 1600 : 1200)
    return () => clearTimeout(t)
  }, [lastBattleResult])
  
  const suggestedTerritoryId = useMemo(() => {
    if (!mapDefinition || !currentPlayer) return undefined
    if (phase === 'placement' && placementStage === 'claim') {
      const neutrals = territories.filter(t => t.ownerId === -1)
      if (neutrals.length === 0) return undefined
      const mine = territories.filter(t => t.ownerId === currentPlayer.id)
      if (mine.length > 0) {
        // prefer neutral neighbors to my owned
        for (const mt of mine) {
          const def = mapDefinition.territories.find(tt => tt.id === mt.id)
          if (!def) continue
          const cand = def.neighbors.find(nId => territories.find(tt => tt.id === nId)?.ownerId === -1)
          if (cand) return cand
        }
      }
      return neutrals[0]?.id
    }
    if ((phase === 'placement' && placementStage === 'distribute') || phase === 'draft') {
      const mine = territories.filter(t => t.ownerId === currentPlayer.id)
      if (mine.length === 0) return undefined
      // prefer enemy-adjacent with lowest armies
      const enemyAdj = mine
        .map(t => ({
          t,
          enemyNeighbor: mapDefinition.territories
            .find(tt => tt.id === t.id)?.neighbors.some(nId => {
              const st = territories.find(x => x.id === nId)
              return st && st.ownerId !== currentPlayer.id
            })
        }))
        .filter(x => x.enemyNeighbor)
        .map(x => x.t)
        .sort((a,b) => a.armies - b.armies)
      if (enemyAdj.length > 0) return enemyAdj[0].id
      // else strictly lowest armies
      return mine.sort((a,b) => a.armies - b.armies)[0].id
    }
    return undefined
  }, [mapDefinition, territories, currentPlayer, phase, placementStage])
  
  // Handle player count change
  const updatePlayerCount = (count: number) => {
    const newConfig = { ...config, playerCount: count }
    setConfig(newConfig)
    saveConfig(newConfig)
    
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
  
  // Generic settings setter (keeps both store + config in sync)
  const applySetting = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) => {
    const next = { ...config, [key]: value }
    setConfig(next)
    saveConfig(next)
    // Map GameConfig keys to store settings keys when applicable
    if (key === 'placementMode' || key === 'resourceLevel' || key === 'attackMode' || key === 'instantMode' || key === 'mapVariant' || key === 'lowEffects' || key === 'colorblindMode' || key === 'sfx') {
      setSettings({ [key]: value } as any)
    }
    if (key === 'mapVariant') {
      // reload map definition to reflect variant
      setMap((next.selectedMap as any))
    }
  }
  
  // Start game
  const handleStartGame = () => {
    // Sync settings from persisted config
    setSettings({
      placementMode: (config.placementMode || 'random') as any,
      resourceLevel: (config.resourceLevel || 'medium') as any,
      attackMode: (config.attackMode || 'single') as any,
      instantMode: !!config.instantMode,
      lowEffects: !!config.lowEffects,
      colorblindMode: !!config.colorblindMode,
      sfx: !!config.sfx,
      mapVariant: (config.mapVariant || 'standard') as any,
      customColors: playerColors.slice(0, config.playerCount)
    })
    setMap(config.selectedMap)
    setTimeout(() => {
      initGame(playerNames.slice(0, config.playerCount), config.humanPlayers, (config.placementMode || 'random') as any)
      setSetupComplete(true)
    }, 250)
  }
  
  // Setup screen
  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center px-3 pt-3 pb-2 relative overflow-hidden">
        {/* Decorative background */}
        <img
          src="/start-bg.svg"
          alt=""
          className="pointer-events-none select-none absolute -top-20 right-0 opacity-20 w-[900px] max-w-none animate-float"
        />
        {/* Top spacing (controls moved) */}
        <div className="absolute top-4 left-0 right-0 px-4"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-3 animate-fade-in-up">
              🌍 {config.language==='tr' ? 'Strateji • Çok oyunculu • Yapay Zekâ' : 'Strategy • Multiplayer • AI'}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold gradient-text tracking-tight mb-1">{tr('title')}</h1>
            <p className="text-slate-300 text-sm md:text-base">{tr('setupTitle')}</p>
          </div>
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto mb-3">
            <div className="glass rounded-xl px-3 py-2 text-center border border-emerald-500/20">
              <div className="text-lg">⚡</div>
              <div className="text-[11px] text-slate-300">{config.language==='tr' ? 'Hızlı Oyna' : 'Quick Play'}</div>
            </div>
            <div className="glass rounded-xl px-3 py-2 text-center border border-blue-500/20">
              <div className="text-lg">🗺️</div>
              <div className="text-[11px] text-slate-300">{config.language==='tr' ? 'Çoklu Harita' : 'Multi‑Map'}</div>
            </div>
            <div className="glass rounded-xl px-3 py-2 text-center border border-purple-500/20">
              <div className="text-lg">🤖</div>
              <div className="text-[11px] text-slate-300">{config.language==='tr' ? 'Yapay Zekâ' : 'Smart AI'}</div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 space-y-5 card">
            {/* Map Selection */}
            <div>
              <label className="block text-sm font-semibold text-emerald-300 mb-3 uppercase tracking-wide">
                🗺️ {tr('selectMap')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['world', 'turkey', 'europe'] as const).map((mapId) => (
                  <button
                    key={mapId}
                    onClick={() => handleMapChange(mapId)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      config.selectedMap === mapId
                        ? 'bg-emerald-500 text-white shadow-lg scale-105'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tr(mapId)}
                  </button>
                ))}
              </div>
              {/* Map size */}
              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">{config.language==='tr' ? 'Harita Boyutu' : 'Map Size'}</div>
                <select
                  value={config.mapVariant || 'standard'}
                  onChange={(e)=> applySetting('mapVariant', e.target.value as any)}
                  className="w-full rounded-md bg-slate-800/70 border border-slate-600/50 px-3 py-2 text-white text-sm"
                >
                  <option value="standard">{config.language==='tr' ? 'Standart' : 'Standard'}</option>
                  <option value="mini">{config.language==='tr' ? 'Mini (daha az bölge)' : 'Mini (fewer territories)'}</option>
                  <option value="midi">{config.language==='tr' ? 'Midi (orta ölçek)' : 'Midi (medium scale)'}</option>
                </select>
                {config.selectedMap==='turkey' && (config.mapVariant==='mini') && (
                  <div className="text-xs text-slate-500 mt-1">
                    {config.language==='tr' ? 'Türkiye mini: 25 bölge' : 'Turkey mini: 25 territories'}
                  </div>
                )}
                {config.selectedMap==='turkey' && (config.mapVariant==='midi') && (
                  <div className="text-xs text-slate-500 mt-1">
                    {config.language==='tr' ? 'Türkiye midi: 40 bölge' : 'Turkey midi: 40 territories'}
                  </div>
                )}
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

            {/* Player Names + Colors */}
            <div>
              <label className="block text-sm font-semibold text-amber-300 mb-3 uppercase tracking-wide">
                ✏️ {tr('playerName')}
                          </label>
                          <div className="space-y-2">
                {Array.from({ length: config.playerCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerNames[i] || `Player ${i + 1}`}
                      onChange={(e) => {
                        const newNames = [...playerNames]
                        newNames[i] = e.target.value
                        setPlayerNames(newNames)
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none"
                      placeholder={`Player ${i + 1}`}
                    />
                    <input
                      type="color"
                      value={playerColors[i] || (config.colorblindMode ? defaultColorsCB[i % defaultColorsCB.length] : defaultColorsNormal[i % defaultColorsNormal.length])}
                      onChange={(e) => {
                        const next = [...playerColors]
                        next[i] = e.target.value
                        setPlayerColors(next)
                      }}
                      className="w-10 h-10 rounded-lg border border-slate-600 bg-transparent p-0 cursor-pointer"
                      aria-label={`Player ${i + 1} color`}
                      title={`Player ${i + 1} color`}
                    />
                  </div>
                ))}
                          </div>
                    </div>

            {/* Settings (setup) */}
            <div>
              <label className="block text-sm font-semibold text-emerald-300 mb-3 uppercase tracking-wide">
                ⚙️ {tr('settings')}
                  </label>
              <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                  <div className="text-xs text-slate-400 mb-1">{tr('placement')}</div>
                  <select
                    value={config.placementMode || 'random'}
                    onChange={(e)=> applySetting('placementMode', e.target.value as any)}
                    className="w-full rounded-md bg-slate-800/70 border border-slate-600/50 px-3 py-2 text-white"
                  >
                    <option value="random">{tr('random')}</option>
                    <option value="sequential">{tr('sequential')}</option>
                  </select>
                </div>
                      <div>
                  <div className="text-xs text-slate-400 mb-1">{tr('resources')}</div>
                        <select
                    value={config.resourceLevel || 'medium'}
                    onChange={(e)=> applySetting('resourceLevel', e.target.value as any)}
                    className="w-full rounded-md bg-slate-800/70 border border-slate-600/50 px-3 py-2 text-white"
                  >
                    <option value="low">{tr('low')}</option>
                    <option value="medium">{tr('medium')}</option>
                    <option value="high">{tr('high')}</option>
                        </select>
                      </div>
                      <div>
                  <div className="text-xs text-slate-400 mb-1">{config.language==='tr' ? 'Dil' : 'Language'}</div>
                  <select
                    value={config.language}
                    onChange={(e) => {
                      const next = { ...config, language: e.target.value as 'tr'|'en' }
                      setConfig(next); saveConfig(next)
                      try { document.documentElement.lang = next.language } catch {}
                    }}
                    className="w-full rounded-md bg-slate-800/70 border border-slate-600/50 px-3 py-2 text-white"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
                      <div>
                  <div className="text-xs text-slate-400 mb-1">Instant Mode</div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!config.instantMode}
                      onChange={(e)=> {
                        const next = { ...config, instantMode: e.target.checked }
                        setConfig(next)
                        saveConfig(next)
                        setSettings({ instantMode: e.target.checked })
                      }}
                    />
                    <span>{config.language==='tr' ? 'Saldırı anında sonuçlansın' : 'Resolve battles instantly'}</span>
                  </label>
                      </div>
                      </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!config.colorblindMode}
                    onChange={(e)=> {
                      const next = { ...config, colorblindMode: e.target.checked }
                      setConfig(next); saveConfig(next)
                      setSettings({ colorblindMode: e.target.checked })
                    }}
                  />
                  <span>{config.language==='tr' ? 'Renk körlüğü paleti' : 'Colorblind palette'}</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!config.lowEffects}
                    onChange={(e)=> {
                      const next = { ...config, lowEffects: e.target.checked }
                      setConfig(next); saveConfig(next)
                      setSettings({ lowEffects: e.target.checked })
                    }}
                  />
                  <span>{config.language==='tr' ? 'Performans modu (az efekt)' : 'Performance mode (low effects)'}</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!config.sfx}
                    onChange={(e)=> {
                      const next = { ...config, sfx: e.target.checked }
                      setConfig(next); saveConfig(next)
                      setSettings({ sfx: e.target.checked })
                    }}
                  />
                  <span>{config.language==='tr' ? 'Ses efektleri' : 'Sound effects'}</span>
                </label>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {config.language==='tr' ? 'Not: Yerleşim modu yeni oyunda etkili olur.' : 'Note: Placement mode applies on new game.'}
              </div>
                </div>
            {/* Quick tips */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-2">{config.language==='tr' ? 'İpuçları' : 'Tips'}</div>
              <ul className="text-sm text-slate-300 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <li>• {config.language==='tr' ? 'Z/A ile yakınlaştır/uzaklaştır (haritada)' : 'Use +/- to zoom (on the map)'}</li>
                <li>• {config.language==='tr' ? 'Saldırıda A tuşu: tek tur' : 'In attack, A key: one round'}</li>
                <li>• {config.language==='tr' ? 'Saldırıda All‑in ile hızlandır' : 'Use All‑in to fast‑resolve'}</li>
                <li>• {config.language==='tr' ? 'Dokun ve basılı tut: hızlı yerleştir' : 'Press & hold to place faster'}</li>
              </ul>
            </div>

            {/* Start Button */}
                      <button
              onClick={handleStartGame}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xl font-bold rounded-xl hover:from-emerald-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 btn btn-primary"
            >
              🎯 {tr('startGame')}
                      </button>
                    </div>
          {/* Subtle footer credit */}
          <div className="text-center text-[10px] text-slate-400/40 mt-4 select-none">
            {tr('credit')} • {(config.language==='tr' ? 'Sürüm' : 'Version')} 1.1.8
          </div>
        </motion.div>
                  </div>
    )
  }
  
  // Check for game over
  const winner = players.find(p => p.alive && players.filter(pl => pl.alive).length === 1)
  
  if (winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12">
            <div className="relative">
              <div className="text-6xl mb-4 animate-fade-in-scale">🏆</div>
              {/* Confetti overlay */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 36 }).map((_, i) => {
                  const left = Math.random() * 100
                  const delay = Math.random() * 0.8
                  const duration = 2.5 + Math.random() * 1.8
                  const colors = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899']
                  const color = colors[i % colors.length]
                  return (
                    <span
                      key={i}
                      className="confetti-piece"
                      style={{
                        left: `${left}%`,
                        top: '-10%',
                        backgroundColor: color,
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {config.language === 'tr' ? 'Oyun Bitti!' : 'Game Over!'}
            </h1>
            <div className="text-2xl text-emerald-400 mb-8">
              {config.language === 'tr' ? 'Kazanan:' : 'Winner:'} {winner.name}
            </div>
                <button
                  onClick={() => {
                setSetupComplete(false)
                useGameStore.getState().reset()
              }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-xl font-bold rounded-xl hover:from-emerald-600 hover:to-blue-600"
            >
              {config.language === 'tr' ? 'Yeni Oyun' : 'New Game'}
                </button>
                </div>
        </motion.div>
              </div>
    )
  }
  
  // Game screen
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 md:p-4">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-3 md:p-4 mb-3 md:mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl font-bold text-white cursor-pointer hover:underline"
                onClick={() => {
                  setSetupComplete(false)
                  try { useGameStore.getState().reset() } catch {}
                }}
                title={config.language==='tr' ? 'Anasayfa' : 'Home'}
              >
                {tr('title')}
              </h1>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-slate-400">
                    {getMapById(selectedMap)?.name} • {tr('turn')} {turn}
                  </p>
                  {/* Phase chip */}
                  <span
                    className="text-xs px-2.5 py-1 rounded-xl shadow border backdrop-blur"
                    style={{
                      borderColor: (currentPlayer?.color || '#64748b') + '66',
                      background: `linear-gradient(135deg, ${(currentPlayer?.color || '#64748b')}22, #0b1220aa)`,
                      color: currentPlayer?.color || '#94a3b8'
                    }}
                  >
                    {phase === 'placement' ? '🧭 ' + tr('reinforcementPhase') : phase === 'draft' ? '➕ ' + tr('draftPhase') : phase === 'attack' ? '⚔️ ' + tr('attackPhase') : '🛡️ ' + tr('fortifyPhase')}
                  </span>
                </div>
                {/* Phase progress bar */}
                {(() => {
                  const order: Array<'placement'|'draft'|'attack'|'fortify'> = ['placement','draft','attack','fortify']
                  const idx = Math.max(0, order.indexOf((phase as any) || 'placement'))
                  const pct = ((idx + 1) / order.length) * 100
                  return (
                    <div className="h-1 w-56 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${(currentPlayer?.color || '#22c55e')} 0%, #3B82F6 100%)` }}
                      />
                    </div>
                  )
                })()}
              </div>
            </div>

            {currentPlayer && (
              <div className="flex items-center gap-4">
                {/* Current player deluxe card */}
                <div className="relative">
                  <div
                    className="absolute -inset-1 rounded-2xl blur-lg opacity-70"
                    style={{ background: `linear-gradient(135deg, ${turnColor}44, #0ea5e944)` }}
                    aria-hidden
                  />
                  <div className="relative bg-slate-900/60 border border-slate-700/70 rounded-2xl px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-3 sm:gap-4">
                    {/* Avatar with animated ring */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ backgroundColor: (currentPlayer.color || '#22c55e') + '22' }}
                        aria-hidden
                      />
                      <div
                        className="relative w-full h-full rounded-full border-4 grid place-items-center shadow-lg"
                        style={{ borderColor: currentPlayer.color, backgroundColor: (currentPlayer.color || '#22c55e') + '26' }}
                      >
                        <span className="text-white font-extrabold text-lg sm:text-xl">
                          {(currentPlayer.name || 'P').slice(0,1).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="min-w-[160px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">{tr('currentPlayer')}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: (turnColor) + '66', color: turnColor, backgroundColor: (turnColor) + '14' }}>
                          {tr('turn')} {turn}
                        </span>
                      </div>
                      <div className="text-white font-extrabold leading-tight text-lg sm:text-xl">
                        {currentPlayer.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: (currentPlayer.color || '#64748b') + '26', color: currentPlayer.color }}>
                          {(currentPlayer.cards?.length || 0)} {tr('cards')}
                        </span>
                        {!currentPlayer.isHuman && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            🤖 AI
                          </span>
                        )}
                        {(() => {
                          const tc = territories.filter(t => t.ownerId === currentPlayer.id).length
                          const ac = territories.filter(t => t.ownerId === currentPlayer.id).reduce((s, t) => s + t.armies, 0)
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-200">
                              {tc} {config.language==='tr' ? 'bölge' : 'terr.'} • {ac} {config.language==='tr' ? 'asker' : 'armies'}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Quick actions */}
                <div className="hidden sm:flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const ok = (useGameStore.getState().saveGame?.() || false)
                        setToast(ok ? (config.language==='tr' ? 'Oyun kaydedildi' : 'Game saved') : (config.language==='tr' ? 'Kaydetme başarısız' : 'Save failed'))
                        setTimeout(()=> setToast(null), 2000)
                      }}
                      className="px-3 py-2 text-xs rounded bg-slate-700 text-white hover:bg-slate-600"
                    >
                      💾 {config.language==='tr' ? 'Kaydet' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        const ok = (useGameStore.getState().loadGame?.() || false)
                        setToast(ok ? (config.language==='tr' ? 'Oyun yüklendi' : 'Game loaded') : (config.language==='tr' ? 'Kayıt bulunamadı' : 'No save found'))
                        setTimeout(()=> setToast(null), 2000)
                      }}
                      className="px-3 py-2 text-xs rounded bg-slate-700 text-white hover:bg-slate-600"
                    >
                      📂 {config.language==='tr' ? 'Yükle' : 'Load'}
                    </button>
                    <button
                      onClick={() => setMusicOn(v => !v)}
                      className="px-3 py-2 text-xs rounded bg-slate-700 text-white hover:bg-slate-600"
                      aria-label="Toggle music"
                      title={musicOn ? (config.language==='tr' ? 'Müziği kapat' : 'Turn off music') : (config.language==='tr' ? 'Müziği aç' : 'Turn on music')}
                    >
                      {musicOn ? '🔊' : '🔈'}
                    </button>
                    <select
                      value={config.language}
                      onChange={(e) => {
                        const next = { ...config, language: e.target.value as 'tr'|'en' }
                        setConfig(next); saveConfig(next)
                        try { document.documentElement.lang = next.language } catch {}
                      }}
                      className="px-2 py-2 text-xs rounded bg-slate-700 text-white hover:bg-slate-600"
                      aria-label="Language"
                      title={config.language==='tr' ? 'Dil' : 'Language'}
                    >
                      <option value="tr">TR</option>
                      <option value="en">EN</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        
        <div className="grid lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Map */}
          <div className="lg:col-span-4 xl:col-span-5">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-3 md:p-4">
              <h2 className="text-xl font-bold text-white mb-4">
                {getMapById(selectedMap)?.name} • {territories.length} {tr('territoriesWord')}
              </h2>
              {/* Territory search */}
              {mapDefinition && (
                <div className="mb-3 flex items-center gap-2">
                  <input
                    value={searchTerm}
                    onChange={(e)=> setSearchTerm(e.target.value)}
                    list="territories"
                    placeholder={config.language==='tr' ? 'Bölge ara...' : 'Search territory...'}
                    className="px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white w-full max-w-xs"
                  />
                  <datalist id="territories">
                    {mapDefinition.territories.map(t => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => {
                      if (!mapDefinition) return
                      const term = searchTerm.trim().toLowerCase()
                      const t = mapDefinition.territories.find(tt => tt.name.toLowerCase().includes(term))
                      if (t) {
                        setFocusId(t.id)
                        setTimeout(()=> setFocusId(null), 3000)
                      } else {
                        setToast(config.language==='tr' ? 'Bölge bulunamadı' : 'Territory not found')
                        setTimeout(()=> setToast(null), 1500)
                      }
                    }}
                    className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {tr('go')}
                  </button>
                  {focusId && (
                    <button
                      onClick={() => setFocusId(null)}
                      className="px-3 py-2 text-sm rounded bg-slate-700 text-white hover:bg-slate-600"
                    >
                      {tr('clear')}
                    </button>
                  )}
                </div>
              )}
              
              <div className={`relative ${mapHeightClass}`}>
              {/* Battle banner overlay */}
              {battleBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-max"
                >
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-xl text-sm flex items-center gap-3">
                    <span className="text-red-300">⚔️ -{battleBanner.a}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-blue-300">🛡️ -{battleBanner.d}</span>
                    {battleBanner.conquered && (
                      <span className="ml-1 text-emerald-300 font-semibold">✓ {config.language==='tr' ? 'Fethedildi' : 'Conquered'}</span>
                    )}
                  </div>
                </motion.div>
              )}
              
              {mapDefinition ? (
                territories.length > 0 ? (
                  <RealMap
                    mapId={selectedMap as 'world' | 'turkey' | 'europe'}
                    mapDefinition={mapDefinition}
                    territories={territories}
                    players={players}
                    selected={{ from: attackFrom || undefined, to: attackTo || undefined }}
                    onAttackOnce={() => {
                      if (!(attackFrom && attackTo)) return
                      const fs = getTerritoryState(attackFrom)
                      const ts = getTerritoryState(attackTo)
                      if (!fs || !ts) return
                      const a = Math.min(3, Math.max(1, (fs.armies || 1) - 1))
                      const d = Math.min(2, Math.max(1, (ts.armies || 1)))
                      executeAttack(a, d)
                    }}
                    onAllIn={() => {
                      if (!(attackFrom && attackTo)) return
                      let loopGuard = 0, totalA = 0, totalD = 0, conquered = false
                      while (loopGuard < 200) {
                        loopGuard++
                        const fs = getTerritoryState(attackFrom!)
                        const ts = getTerritoryState(attackTo!)
                        if (!fs || !ts) break
                        if (fs.armies <= 1) break
                        const a = Math.min(3, fs.armies - 1)
                        const d = Math.min(2, ts.armies)
                        executeAttack(a, d)
                        const lr = useGameStore.getState().lastBattleResult
                        if (lr) { totalA += lr.attackerLosses||0; totalD += lr.defenderLosses||0; if (lr.conquered) { conquered = true; break } } else { break }
                      }
                      if (!conquered) { useGameStore.setState({ lastBattleResult: { attackerLosses: totalA, defenderLosses: totalD, conquered: false } as any }) }
                    }}
                    onEndAttack={() => endAttackPhase()}
                    lastBattleResult={lastBattleResult}
                    onTerritoryClick={(territoryId) => {
                      // Avoid placement/draft double placement via click; handled by hold/mouseup
                      if (phase === 'placement' || phase === 'draft') {
                        return
                      }
                      
                      if (phase === 'attack') {
                        if (lastBattleResult && !lastBattleResult.conquered) {
                          useGameStore.setState({ 
                            lastBattleResult: null,
                            attackFrom: null,
                            attackTo: null 
                          })
                          return
                        }
                        if (!attackFrom) {
                          selectAttackFrom(territoryId)
                        } else if (attackFrom === territoryId) {
                          useGameStore.setState({ attackFrom: null, attackTo: null })
                        } else {
                          selectAttackTo(territoryId)
                        }
                      } 
                      else if (phase === 'fortify') {
                        if (!fortifyFrom) {
                          selectFortifyFrom(territoryId)
                        } else if (fortifyFrom === territoryId) {
                          useGameStore.setState({ fortifyFrom: null, fortifyTo: null })
                        } else {
                          selectFortifyTo(territoryId)
                        }
                      }
                    }}
                    onTerritoryMouseDown={(territoryId) => {
                      // Only enable hold in draft; in sequential reinforcement place exactly 1 per step
                      const canPlace = () => {
                        const st = getTerritoryState(territoryId)
                        if (phase === 'placement') return false
                        if (phase === 'draft') return st?.ownerId === currentPlayer?.id
                        return false
                      }
                      if (!canPlace()) return
                      holdActiveRef.current = territoryId
                      holdDelayRef.current = 220
                      holdCountRef.current = 0
                      ;(holdFiredRef as any).current = false
                      const tick = () => {
                        if (holdActiveRef.current !== territoryId) return
                        placeDraftArmy(territoryId)
                        holdCountRef.current += 1
                        ;(holdFiredRef as any).current = true
                        const stillCan = canPlace()
                        if (!stillCan) { holdActiveRef.current = null; return }
                        // accelerate
                        if (holdCountRef.current > 20) holdDelayRef.current = 80
                        if (holdCountRef.current > 40) holdDelayRef.current = 60
                        holdTimerRef.current = window.setTimeout(tick, holdDelayRef.current)
                      }
                      tick()
                    }}
                    onTerritoryMouseUp={(territoryId) => {
                      const stop = () => {
                        if (holdTimerRef.current) {
                          window.clearTimeout(holdTimerRef.current)
                          holdTimerRef.current = null
                        }
                        holdActiveRef.current = null
                      }
                      const fired = (holdFiredRef as any).current === true
                      stop()
                      if (phase === 'placement') {
                        const st = getTerritoryState(territoryId)
                        if (placementStage === 'claim' && st?.ownerId === -1) placeDraftArmy(territoryId)
                        else if (placementStage === 'distribute' && st?.ownerId === currentPlayer?.id) placeDraftArmy(territoryId)
                      } else if (!fired && phase === 'draft') {
                        const st = getTerritoryState(territoryId)
                        if (st?.ownerId === currentPlayer?.id) placeDraftArmy(territoryId)
                      }
                      ;(holdFiredRef as any).current = false
                    }}
                    currentPlayerId={currentPlayer ? currentPlayer.id : -1}
                    phase={phase}
                    placementStage={placementStage}
                    suggestedId={suggestedTerritoryId || focusId || undefined}
                    focusTerritoryId={focusId || undefined}
                    lowEffects={!!config.lowEffects}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-slate-400">{tr('loadingMap')}</div>
            </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-400">{tr('noMap')}</div>
                    </div>
              )}

              {/* Mobile floating actions (top overlay) - do not block map taps */}
              {isMobile && (
                <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center md:hidden">
                  {/* Attack phase (moved to on-map bubble; keep disabled here to avoid duplication) */}
                  {false && phase === 'attack' && attackFrom && attackTo && !lastBattleResult && (
                    <div className="pointer-events-auto bg-slate-900/70 backdrop-blur border border-slate-700/60 rounded-xl shadow-xl flex gap-2 px-3 py-2">
                      {config.instantMode ? (
                        <motion.button
                          onClick={() => {
                            let loopGuard = 0
                            let totalA = 0
                            let totalD = 0
                            let conquered = false
                            while (loopGuard < 200) {
                              loopGuard++
                              const fs = getTerritoryState(attackFrom!)
                              const ts = getTerritoryState(attackTo!)
                              if (!fs || !ts) break
                              if (fs.armies <= 1) break
                              const a = Math.min(3, fs.armies - 1)
                              const d = Math.min(2, ts.armies)
                              executeAttack(a, d)
                              const lr = useGameStore.getState().lastBattleResult
                              if (lr) { totalA += lr.attackerLosses||0; totalD += lr.defenderLosses||0; if (lr.conquered) { conquered = true; break } } else { break }
                            }
                            if (!conquered) { useGameStore.setState({ lastBattleResult: { attackerLosses: totalA, defenderLosses: totalD, conquered: false } as any }) }
                          }}
                          className="px-3 py-2 text-xs bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600"
                          whileTap={{ scale: 0.96 }}
                        >
                          ⚔️ {tr('attack')}
                        </motion.button>
                      ) : (
                        <>
                          <motion.button
                            onClick={() => {
                              const fs = getTerritoryState(attackFrom!)
                              const ts = getTerritoryState(attackTo!)
                              if (!fs || !ts) return
                              executeAttack(Math.min(3, fs.armies - 1), Math.min(2, ts.armies))
                            }}
                            className="px-3 py-2 text-xs bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
                            whileTap={{ scale: 0.96 }}
                          >
                            ⚔️ {tr('attack')}
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              let loopGuard = 0, totalA = 0, totalD = 0, conquered = false
                              while (loopGuard < 200) {
                                loopGuard++
                                const fs = getTerritoryState(attackFrom!)
                                const ts = getTerritoryState(attackTo!)
                                if (!fs || !ts) break
                                if (fs.armies <= 1) break
                                executeAttack(Math.min(3, fs.armies - 1), Math.min(2, ts.armies))
                                const lr = useGameStore.getState().lastBattleResult
                                if (lr) { totalA += lr.attackerLosses||0; totalD += lr.defenderLosses||0; if (lr.conquered) { conquered = true; break } } else { break }
                              }
                              if (!conquered) { useGameStore.setState({ lastBattleResult: { attackerLosses: totalA, defenderLosses: totalD, conquered: false } as any }) }
                            }}
                            className="px-3 py-2 text-xs bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600"
                            whileTap={{ scale: 0.96 }}
                          >
                            ⚡ {tr('allIn')}
                          </motion.button>
                        </>
                      )}
                      <motion.button onClick={endAttackPhase} className="px-3 py-2 text-xs bg-slate-600 text-white rounded-lg shadow hover:bg-slate-700" whileTap={{ scale: 0.96 }}>{tr('endAttack')}</motion.button>
                    </div>
                  )}
                  {/* Conquest move */}
                  {phase === 'attack' && lastBattleResult?.conquered && attackFrom && (
                    <div className="pointer-events-auto bg-slate-900/70 backdrop-blur border border-slate-700/60 rounded-xl shadow-xl flex gap-2 px-3 py-2">
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => { conquestMove(1); setConquestArmies(1) }} className="px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700">{tr('moveOne')}</motion.button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => { const maxMove = Math.max(1, (getTerritoryState(attackFrom!)?.armies || 1) - 1); conquestMove(maxMove); setConquestArmies(1) }} className="px-3 py-2 text-xs bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800">{tr('moveAll')}</motion.button>
                    </div>
                  )}
                  {/* Fortify */}
                  {phase === 'fortify' && (
                    <div className="pointer-events-auto bg-slate-900/70 backdrop-blur border border-slate-700/60 rounded-xl shadow-xl flex gap-2 px-3 py-2">
                      {fortifyFrom && fortifyTo && (
                        <>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { executeFortify(fortifyArmies); setFortifyArmies(1) }} className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600">{tr('fortify')}</motion.button>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { const maxMove = Math.max(1, (getTerritoryState(fortifyFrom!)?.armies || 1) - 1); executeFortify(maxMove); setFortifyArmies(1) }} className="px-3 py-2 text-xs bg-blue-700 text-white rounded-lg shadow hover:bg-blue-800">{tr('fortify')} All</motion.button>
                        </>
                      )}
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => executeFortify(0)} className="px-3 py-2 text-xs bg-slate-600 text-white rounded-lg shadow hover:bg-slate-700">{tr('endTurn')}</motion.button>
                    </div>
                  )}
                </div>
              )}
              {/* Onboarding overlay */}
              {showOnboarding && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                  <div className="card p-6 max-w-md w-full border border-slate-700/60">
                    <div className="text-lg font-bold text-white mb-2">{config.language==='tr' ? 'Hoş geldin!' : 'Welcome!'}</div>
                    <div className="text-sm text-slate-300 space-y-1 mb-4">
                      <div>• {config.language==='tr' ? 'Haritayı sürükleyerek gez, fare tekeri ile yakınlaştır.' : 'Drag to pan, mouse wheel to zoom.'}</div>
                      <div>• {config.language==='tr' ? 'A/E/F/R ile saldır/bitir/takviye/kart.' : 'A/E/F/R for attack/end/fortify/redeem.'}</div>
                      <div>• {config.language==='tr' ? 'Alt soldaki minimap ile hızlı odaklan.' : 'Use the bottom-left minimap to focus quickly.'}</div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowOnboarding(false)
                        }}
                        className="btn btn-secondary !px-4 !py-2 text-sm"
                      >
                        {config.language==='tr' ? 'Kapat' : 'Close'}
                      </button>
                      <button
                        onClick={() => {
                          setShowOnboarding(false)
                          try { localStorage.setItem('risk-onboarding-dismissed', '1') } catch {}
                        }}
                        className="btn btn-primary !px-4 !py-2 text-sm"
                      >
                        {config.language==='tr' ? 'Bir daha gösterme' : "Don't show again"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
                        </div>
            </div>
          </div>
          {/* Control Panel */}
          <div className="lg:col-span-1 xl:col-span-1 space-y-4">
            {toast && (
              <div className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 p-3 rounded-lg text-sm">
                {toast}
                      </div>
                    )}
            {phaseInfo && (
              <div className="bg-slate-700/40 text-slate-200 border border-slate-600/50 p-3 rounded-lg text-xs">
                {phaseInfo}
                  </div>
                )}
            {/* Phase Info */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-3 md:p-4">
              <h3 className="text-lg font-bold text-white mb-3">{tr('phase')}</h3>

              {phase === 'placement' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                    <div className="text-xl font-bold text-white">{tr('reinforcementPhase')}</div>
                  </div>
                  {placementStage === 'claim' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-4 bg-sky-500/20 border border-sky-500/40 rounded-lg">
                        <div className="text-xs text-sky-300">Kalan Nötr Bölge</div>
                        <div className="text-2xl font-bold text-white">
                          {territories.filter(t => t.ownerId === -1).length}
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg border" style={turnCardStyle}>
                        <div className="text-xs" style={{ color: turnColor }}>Sıradaki</div>
                        <div className="text-2xl font-bold text-white">{currentPlayer?.name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 rounded-lg border" style={turnCardStyle}>
                      <div className="text-sm" style={{ color: turnColor }}>{tr('armiesToPlace')}</div>
                      <div className="text-3xl font-bold text-white">{draftArmies}</div>
                    </div>
                  )}
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-slate-400 text-center">
                      {placementStage === 'claim' 
                        ? (config.language === 'tr' ? 'Boş bölgeye tıklayıp sahiplenin' : 'Click a neutral territory to claim it')
                        : (config.language === 'tr' ? 'Sırayla kendi bölgelerinize asker yerleştirin' : 'Place armies on your territories in turns')}
                    </p>
                    </div>
                  {placementReserves && (
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                      <div className="text-xs text-slate-400 mb-2">Kalan Rezervler</div>
                      <div className="space-y-1">
                        {players.map((p, idx) => (
                          <div key={p.id} className="grid grid-cols-12 items-center gap-2">
                            <div className="col-span-6 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <div className="text-sm text-white">{p.name}</div>
                            </div>
                            <div className="col-span-3 text-xs text-slate-300">Rezerv: {placementReserves[idx] || 0}</div>
                            <div className="col-span-3 text-xs text-slate-300 text-right">
                              Bölge: {territories.filter(t => t.ownerId === p.id).length}
                            </div>
                            <div className="col-span-12 flex-1 h-1 bg-slate-700 rounded">
                              <div className="h-1 rounded" style={{ width: `${Math.min(100, ((placementReserves[idx]||0)/10)*100)}%`, backgroundColor: p.color }} />
                            </div>
                          </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {suggestedTerritoryId && (
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                      <div className="text-xs text-amber-300">Öneri</div>
                      <div className="text-sm text-white">
                        {mapDefinition?.territories.find(t => t.id === suggestedTerritoryId)?.name}
                  </div>
                      <button
                        onClick={() => placeDraftArmy(suggestedTerritoryId)}
                        className="text-xs px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded"
                      >
                        Uygula
                      </button>
                    </div>
                  )}
                  </div>
                )}

              {phase === 'draft' && (
                <div className="space-y-3">
                  <div className="text-center p-4 rounded-lg border" style={turnCardStyle}>
                    <div className="text-sm" style={{ color: turnColor }}>{tr('armiesToPlace')}</div>
                    <div className="text-3xl font-bold text-white">{draftArmies}</div>
                      </div>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-slate-400 text-center">
                      {config.language === 'tr' 
                        ? `Bu tur takviye: +${useGameStore.getState().calculateDraftArmies()}`
                        : `This turn reinforcement: +${useGameStore.getState().calculateDraftArmies()}`}
                    </p>
                      </div>
                        </div>
                      )}
                
              {phase === 'attack' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="text-xl font-bold text-white">{tr('attackPhase')}</div>
                  </div>
                  
                  {!attackFrom && !attackTo && (
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 text-center">
                        {config.language === 'tr' 
                          ? '1. Saldıracak bölgenizi seçin (en az 2 asker olmalı)' 
                          : '1. Select your attacking territory (min 2 armies)'}
                      </p>
                  </div>
                )}

                  {attackFrom && !attackTo && (
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 text-center">
                        {config.language === 'tr' 
                          ? '2. Saldırılacak düşman bölgesini seçin (kırmızı yanıp sönen)' 
                          : '2. Select enemy territory to attack (pulsing red)'}
                      </p>
                        </div>
                      )}
                
                  {attackFrom && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <div className="text-xs text-red-300">{tr('selectAttackFrom')}</div>
                      <div className="font-bold text-white flex items-center justify-between" />
                  </div>
                )}

                  {attackTo && (
                    <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                      <div className="text-xs text-blue-300">{tr('selectAttackTo')}</div>
                      <div className="font-bold text-white"></div>
                  </div>
                )}
                
                  {attackFrom && attackTo && !lastBattleResult && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div>
                          Saldıran: {Math.min(3, (getTerritoryState(attackFrom)?.armies || 1) - 1)} zar
                        </div>
                        <div>
                          Savunan: {Math.min(2, getTerritoryState(attackTo)?.armies || 1)} zar
                        </div>
                      </div>
                      {config.instantMode ? (
                        <div>
                          <button
                            onClick={() => {
                              let loopGuard = 0
                              let totalA = 0
                              let totalD = 0
                              let conquered = false
                              while (loopGuard < 200) {
                                loopGuard++
                                const fromStateNow = getTerritoryState(attackFrom!)
                                const toStateNow = getTerritoryState(attackTo!)
                                if (!fromStateNow || !toStateNow) break
                                if (fromStateNow.armies <= 1) break
                                const attackerDice = Math.min(3, fromStateNow.armies - 1)
                                const defenderDice = Math.min(2, toStateNow.armies)
                                executeAttack(attackerDice, defenderDice)
                                const lr = useGameStore.getState().lastBattleResult
                                if (lr) {
                                  totalA += lr.attackerLosses || 0
                                  totalD += lr.defenderLosses || 0
                                  if (lr.conquered) { conquered = true; break }
                                } else {
                                  break
                                }
                              }
                              if (!conquered) {
                                useGameStore.setState({ lastBattleResult: { attackerLosses: totalA, defenderLosses: totalD, conquered: false } as any })
                              }
                            }}
                            className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600"
                          >
                            ⚡ Attack (Instant)
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
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
                          <button
                            onClick={() => {
                              let loopGuard = 0
                              let totalA = 0
                              let totalD = 0
                              let conquered = false
                              while (loopGuard < 200) {
                                loopGuard++
                                const fromStateNow = getTerritoryState(attackFrom!)
                                const toStateNow = getTerritoryState(attackTo!)
                                if (!fromStateNow || !toStateNow) break
                                if (fromStateNow.armies <= 1) break
                                const attackerDice = Math.min(3, fromStateNow.armies - 1)
                                const defenderDice = Math.min(2, toStateNow.armies)
                                executeAttack(attackerDice, defenderDice)
                                const lr = useGameStore.getState().lastBattleResult
                                if (lr) {
                                  totalA += lr.attackerLosses || 0
                                  totalD += lr.defenderLosses || 0
                                  if (lr.conquered) { conquered = true; break }
                                } else {
                                  break
                                }
                              }
                              if (!conquered) {
                                useGameStore.setState({ lastBattleResult: { attackerLosses: totalA, defenderLosses: totalD, conquered: false } as any })
                              }
                            }}
                            className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600"
                          >
                            ⚡ All‑in
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                
                  {lastBattleResult && !lastBattleResult.conquered && (
                    <div className="p-3 bg-slate-700/50 rounded-lg text-center space-y-2">
                      <div className="text-xs text-slate-400">{tr('resultLabel')}</div>
                      <div className="flex items-center justify-center gap-4">
                        <div>
                          <div className="text-[10px] text-slate-400">{tr('attacker')}</div>
                          <div className="flex gap-1 justify-center">
                            {(lastBattleResult.attackerRolls || []).map((r, i) => (
                              <span key={i} className="px-2 py-1 rounded bg-red-600/30 border border-red-400/40 text-white text-xs">{r}</span>
                            ))}
                    </div>
                    </div>
                        <div>
                          <div className="text-[10px] text-slate-400">{tr('defender')}</div>
                          <div className="flex gap-1 justify-center">
                            {(lastBattleResult.defenderRolls || []).map((r, i) => (
                              <span key={i} className="px-2 py-1 rounded bg-blue-600/30 border border-blue-400/40 text-white text-xs">{r}</span>
                            ))}
                  </div>
                        </div>
                      </div>
                      <div className="text-sm text-red-300">Saldıran: -{lastBattleResult.attackerLosses}</div>
                      <div className="text-sm text-blue-300">Savunan: -{lastBattleResult.defenderLosses}</div>
                    <button
                      onClick={() => {
                          useGameStore.setState({ 
                            lastBattleResult: null,
                            attackFrom: null,
                            attackTo: null 
                          })
                        }}
                        className="mt-2 w-full py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700"
                      >
                        Devam Et
                    </button>
                  </div>
                )}

                  {lastBattleResult?.conquered && attackFrom && (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-center">
                        <div className="text-emerald-300 font-bold">{tr('conquered')}</div>
            </div>

                      <div className="space-y-2">
                        <label className="text-sm text-slate-300">
                          {tr('moveArmies')}: {conquestArmies}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max={Math.max(1, (getTerritoryState(attackFrom)?.armies || 1) - 1)}
                          value={conquestArmies}
                          onChange={(e) => setConquestArmies(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-slate-400">
                          Kaynakta {(getTerritoryState(attackFrom)?.armies || 1) - conquestArmies} asker kalacak
                        </div>
                      </div>
                      
                    <button
                      onClick={() => {
                          conquestMove(conquestArmies)
                          setConquestArmies(1)
                        }}
                        className="w-full py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600"
                      >
                        ✓ Taşı
                    </button>
                    <button
                      onClick={() => {
                          const maxMove = Math.max(1, (getTerritoryState(attackFrom!)?.armies || 1) - 1)
                          setConquestArmies(maxMove)
                          conquestMove(maxMove)
                          setConquestArmies(1)
                        }}
                        className="w-full mt-2 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800"
                      >
                        ➤ Tamamını Taşı
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
                  
                  {!fortifyFrom && !fortifyTo && (
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 text-center">
                        {config.language === 'tr' 
                          ? 'Komşu bölgeleriniz arasında asker taşıyabilirsiniz veya turu atlayın' 
                          : 'Move armies between your adjacent territories or skip turn'}
                      </p>
                    </div>
                  )}

                  {fortifyFrom && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-400">Kaynak</div>
                      <div className="font-bold text-white">
                        {mapDefinition?.territories.find(t => t.id === fortifyFrom)?.name}
                </div>
              </div>
                )}
                
                  {fortifyTo && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-400">Hedef</div>
                      <div className="font-bold text-white">
                        {mapDefinition?.territories.find(t => t.id === fortifyTo)?.name}
                            </div>
                      </div>
                  )}

                  {fortifyFrom && fortifyTo && (
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">
                        Taşınacak Asker: {fortifyArmies}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max={Math.max(1, (getTerritoryState(fortifyFrom)?.armies || 1) - 1)}
                        value={fortifyArmies}
                        onChange={(e) => setFortifyArmies(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-slate-400">
                        Kaynakta {(getTerritoryState(fortifyFrom)?.armies || 1) - fortifyArmies} asker kalacak
            </div>
                      <div className="grid grid-cols-2 gap-2">
          <button
                          onClick={() => {
                            executeFortify(fortifyArmies)
                            setFortifyArmies(1)
                          }}
                          className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600"
                        >
                          ✓ {tr('fortify')}
                        </button>
                        <button
                          onClick={() => {
                            const maxMove = Math.max(1, (getTerritoryState(fortifyFrom!)?.armies || 1) - 1)
                            setFortifyArmies(maxMove)
                            executeFortify(maxMove)
                            setFortifyArmies(1)
                          }}
                          className="w-full py-3 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800"
                        >
                          ➤ Fortify All
                        </button>
                    </div>
                  </div>
                )}
                  
          <button
            onClick={() => {
                      // End turn -> next draft; show hint for next player's reinforcement
                      const nextIdx = (currentPlayerIndex + 1) % players.length
                      const nextName = players[nextIdx]?.name || ''
                      // compute after store updates; slight delay
                      setTimeout(() => {
                        const armies = useGameStore.getState().calculateDraftArmies()
                        setToast(`${nextName}: +${armies} ${tr('armies')}`)
                        setTimeout(()=> setToast(null), 2500)
                      }, 150)
                      executeFortify(0)
                    }}
                    className="w-full py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    {tr('endTurn')}
          </button>
        </div>
                )}
      </div>

            {/* Cards Panel */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-3 md:p-4">
              <h3 className="text-lg font-bold text-white mb-3">{tr('cards')}</h3>
              {currentPlayer ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {(currentPlayer.cards || []).map((c, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded border text-white ${
                          c.type === 'infantry'
                            ? 'bg-emerald-600/30 border-emerald-400/40'
                            : c.type === 'cavalry'
                            ? 'bg-blue-600/30 border-blue-400/40'
                            : c.type === 'artillery'
                            ? 'bg-red-600/30 border-red-400/40'
                            : 'bg-purple-600/30 border-purple-400/40'
                        }`}
                      >
                        {c.type}
                      </span>
                    ))}
                    {(!currentPlayer.cards || currentPlayer.cards.length === 0) && (
                      <span className="text-slate-400 text-xs">
                        {config.language === 'tr' ? 'Kart yok' : 'No cards'}
                      </span>
        )}
      </div>
              <button
                    disabled={!canRedeem()}
                    onClick={() => redeemCards()}
                    className={`px-3 py-2 rounded text-sm font-semibold ${
                      canRedeem()
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canRedeem() ? tr('redeem3') : tr('need3')}
              </button>
      </div>
              ) : (
                <div className="text-xs text-slate-400">
                  {config.language === 'tr' ? 'Oyuncu yok' : 'No player'}
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
                  
                  // Calculate continent bonuses for this player
                  const continentBonuses: string[] = []
                  mapDefinition?.continents.forEach(continent => {
                    const continentTerritories = mapDefinition.territories.filter(
                      t => t.continent === continent.id
                    )
                    const ownedInContinent = continentTerritories.filter(ct =>
                      territories.find(ts => ts.id === ct.id)?.ownerId === player.id
                    )
                    
                    if (ownedInContinent.length === continentTerritories.length) {
                      continentBonuses.push(`${continent.name} (+${continent.bonus})`)
                    }
                  })
                      
                      return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        player.id === currentPlayer?.id
                          ? 'border-amber-400 bg-amber-500/10 shadow-md'
                          : 'border-slate-600'
                      }`}
                      style={{ borderLeftWidth: '4px', borderLeftColor: player.color }}
                    >
                      <div className="font-bold text-white flex items-center gap-2">
                        {player.name}
                        {!player.isHuman && (
                          <span className="text-xs text-purple-400">🤖</span>
                        )}
            </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {territoryCount} bölge • {armyCount} asker
          </div>
                      {continentBonuses.length > 0 && (
                        <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                          <span>👑</span>
                          {continentBonuses.join(', ')}
        </div>
      )}
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
