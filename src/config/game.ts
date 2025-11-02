export interface GameConfig {
  selectedMap: 'world' | 'turkey' | 'europe'
  playerCount: number
  humanPlayers: number
  language: 'tr' | 'en'
  placementMode?: 'random' | 'sequential'
  battleSpeed?: 'instant' | 'normal'
  battleModel?: 'realistic' | 'random'
  resourceLevel?: 'low' | 'medium' | 'high'
  attackMode?: 'single' | 'all-in'
}

export const defaultConfig: GameConfig = {
  selectedMap: 'world',
  playerCount: 3,
  humanPlayers: 1,
  language: 'tr',
  placementMode: 'random',
  battleSpeed: 'normal',
  battleModel: 'realistic',
  resourceLevel: 'medium',
  attackMode: 'single'
}

const CONFIG_KEY = "risk-game-config"

export const loadConfig = (): GameConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...defaultConfig, ...parsed }
    }
  } catch (error) {
    console.warn("Failed to load config:", error)
  }
  
  const base = { ...defaultConfig }
  if (typeof navigator !== 'undefined') {
    base.language = navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  }
  return base
}

export const saveConfig = (config: GameConfig): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn("Failed to save config:", error)
  }
}
