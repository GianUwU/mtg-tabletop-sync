import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import { useSession, normalizePlayerSides } from './useSession'
import AddSideModal from './components/AddSideModal'
import CustomDialogModal from './components/CustomDialogModal'

const MTG_COLORS = [
  { name: 'Green', border: '#22c55e' },
  { name: 'Blue', border: '#38bdf8' },
  { name: 'Yellow', border: '#fef08a' },
  { name: 'Purple', border: '#c084fc' },
  { name: 'Red', border: '#f87171' },
  { name: 'Gold', border: '#fbbf24' },
  { name: 'Crimson', border: '#e11d48' },
  { name: 'Emerald', border: '#10b981' },
  { name: 'Cyan', border: '#06b6d4' },
  { name: 'Silver', border: '#cbd5e1' },
  { name: 'Violet', border: '#a855f7' },
  { name: 'Orange', border: '#f97316' },
]

const UI_THEMES = [
  {
    id: 'forest',
    name: 'Green',
    color: '#22c55e',
    tableRadial1: 'rgba(34, 197, 94, 0.12)',
    tableRadial2: '#1b3d2f',
    tableRadial3: '#10291e',
    tableRadial4: '#07150e',
    hubBorder: '#fbbf24',
    hubBorderOpen: '#86efac',
    hubBgStart: '#234334',
    hubBgEnd: '#0f241a',
    hubBgOpenStart: '#166534',
    hubBgOpenEnd: '#052e16',
    hubGlow: 'rgba(34, 197, 94, 0.35)',
    hubGlowOpen: 'rgba(34, 197, 94, 0.8)',
    hubGem: '#22c55e',
    ambient1: 'rgba(251, 191, 36, 0.05)',
    ambient2: 'rgba(34, 197, 94, 0.03)',
  },
  {
    id: 'island',
    name: 'Blue',
    color: '#38bdf8',
    tableRadial1: 'rgba(56, 189, 248, 0.15)',
    tableRadial2: '#0f2b48',
    tableRadial3: '#091c30',
    tableRadial4: '#040d18',
    hubBorder: '#38bdf8',
    hubBorderOpen: '#7dd3fc',
    hubBgStart: '#1e3a5f',
    hubBgEnd: '#0f233a',
    hubBgOpenStart: '#0284c7',
    hubBgOpenEnd: '#0369a1',
    hubGlow: 'rgba(56, 189, 248, 0.45)',
    hubGlowOpen: 'rgba(56, 189, 248, 0.85)',
    hubGem: '#38bdf8',
    ambient1: 'rgba(56, 189, 248, 0.08)',
    ambient2: 'rgba(14, 165, 233, 0.04)',
  },
  {
    id: 'swamp',
    name: 'Purple',
    color: '#c084fc',
    tableRadial1: 'rgba(168, 85, 247, 0.14)',
    tableRadial2: '#2d1b46',
    tableRadial3: '#1c102c',
    tableRadial4: '#0c0714',
    hubBorder: '#c084fc',
    hubBorderOpen: '#e9d5ff',
    hubBgStart: '#3b1d5c',
    hubBgEnd: '#1e0e30',
    hubBgOpenStart: '#7e22ce',
    hubBgOpenEnd: '#581c87',
    hubGlow: 'rgba(168, 85, 247, 0.45)',
    hubGlowOpen: 'rgba(168, 85, 247, 0.85)',
    hubGem: '#c084fc',
    ambient1: 'rgba(192, 132, 252, 0.07)',
    ambient2: 'rgba(147, 51, 234, 0.04)',
  },
  {
    id: 'mountain',
    name: 'Red',
    color: '#f87171',
    tableRadial1: 'rgba(239, 68, 68, 0.15)',
    tableRadial2: '#451717',
    tableRadial3: '#2c0d0d',
    tableRadial4: '#130505',
    hubBorder: '#f87171',
    hubBorderOpen: '#fca5a5',
    hubBgStart: '#541d1d',
    hubBgEnd: '#2e0e0e',
    hubBgOpenStart: '#b91c1c',
    hubBgOpenEnd: '#7f1d1d',
    hubGlow: 'rgba(239, 68, 68, 0.45)',
    hubGlowOpen: 'rgba(239, 68, 68, 0.85)',
    hubGem: '#ef4444',
    ambient1: 'rgba(248, 113, 113, 0.08)',
    ambient2: 'rgba(220, 38, 38, 0.04)',
  },
  {
    id: 'plains',
    name: 'Yellow',
    color: '#fbbf24',
    tableRadial1: 'rgba(251, 191, 36, 0.15)',
    tableRadial2: '#3d3012',
    tableRadial3: '#271f0a',
    tableRadial4: '#120e04',
    hubBorder: '#fbbf24',
    hubBorderOpen: '#fef08a',
    hubBgStart: '#4a3b16',
    hubBgEnd: '#281f0b',
    hubBgOpenStart: '#b45309',
    hubBgOpenEnd: '#78350f',
    hubGlow: 'rgba(251, 191, 36, 0.45)',
    hubGlowOpen: 'rgba(251, 191, 36, 0.85)',
    hubGem: '#fbbf24',
    ambient1: 'rgba(251, 191, 36, 0.08)',
    ambient2: 'rgba(245, 158, 11, 0.04)',
  },
  {
    id: 'phyrexian',
    name: 'Gray',
    color: '#94a3b8',
    tableRadial1: 'rgba(148, 163, 184, 0.12)',
    tableRadial2: '#1e293b',
    tableRadial3: '#0f172a',
    tableRadial4: '#020617',
    hubBorder: '#cbd5e1',
    hubBorderOpen: '#f1f5f9',
    hubBgStart: '#334155',
    hubBgEnd: '#1e293b',
    hubBgOpenStart: '#475569',
    hubBgOpenEnd: '#1e293b',
    hubGlow: 'rgba(148, 163, 184, 0.4)',
    hubGlowOpen: 'rgba(148, 163, 184, 0.8)',
    hubGem: '#94a3b8',
    ambient1: 'rgba(148, 163, 184, 0.06)',
    ambient2: 'rgba(71, 85, 105, 0.04)',
  },
  {
    id: 'arcane',
    name: 'Indigo',
    color: '#818cf8',
    tableRadial1: 'rgba(99, 102, 241, 0.15)',
    tableRadial2: '#1e1e4a',
    tableRadial3: '#121230',
    tableRadial4: '#060616',
    hubBorder: '#a5b4fc',
    hubBorderOpen: '#c7d2fe',
    hubBgStart: '#2d2d66',
    hubBgEnd: '#161638',
    hubBgOpenStart: '#4f46e5',
    hubBgOpenEnd: '#3730a3',
    hubGlow: 'rgba(99, 102, 241, 0.45)',
    hubGlowOpen: 'rgba(99, 102, 241, 0.85)',
    hubGem: '#818cf8',
    ambient1: 'rgba(129, 140, 248, 0.08)',
    ambient2: 'rgba(99, 102, 241, 0.04)',
  },
  {
    id: 'lotus',
    name: 'Teal',
    color: '#14b8a6',
    tableRadial1: 'rgba(20, 184, 166, 0.15)',
    tableRadial2: '#0e3a35',
    tableRadial3: '#092522',
    tableRadial4: '#03100e',
    hubBorder: '#2dd4bf',
    hubBorderOpen: '#99f6e4',
    hubBgStart: '#15524b',
    hubBgEnd: '#0b2e2a',
    hubBgOpenStart: '#0d9488',
    hubBgOpenEnd: '#115e59',
    hubGlow: 'rgba(20, 184, 166, 0.45)',
    hubGlowOpen: 'rgba(20, 184, 166, 0.85)',
    hubGem: '#14b8a6',
    ambient1: 'rgba(20, 184, 166, 0.08)',
    ambient2: 'rgba(13, 148, 136, 0.04)',
  },
]

const GAME_MODES = [
  {
    id: 'commander',
    name: 'Commander / EDH',
    icon: '👑',
    desc: '40 HP Solo / 60 HP Team',
    soloLife: 40,
    teamLife: 60,
  },
  {
    id: 'standard',
    name: 'Standard / 60-Card',
    icon: '⚔️',
    desc: '20 HP Solo / 30 HP Team',
    soloLife: 20,
    teamLife: 30,
  },
  {
    id: '2hg',
    name: 'Two-Headed Giant',
    icon: '👥',
    desc: '30 HP Solo / 60 HP Team',
    soloLife: 30,
    teamLife: 60,
  },
  {
    id: 'brawl',
    name: 'Brawl',
    icon: '⚡',
    desc: '25 HP Solo / 30 HP Team',
    soloLife: 25,
    teamLife: 30,
  },
]

function checkCardDeath(player) {
  if (!player) return { isDead: false, reason: '' }
  const sides = normalizePlayerSides(player)
  const mainLife = player.life ?? sides.find((s) => s.index === 0)?.value ?? 20
  if (mainLife <= 0) {
    return { isDead: true, reason: `${mainLife} Life Remaining` }
  }
  const cmdSide = sides.find(
    (s) => s.type === 'commander' || (s.label && s.label.toLowerCase().includes('commander'))
  )
  if (cmdSide && typeof cmdSide.value === 'number' && cmdSide.value > 20) {
    return { isDead: true, reason: `${cmdSide.value} Commander Damage (Lethal)` }
  }
  const poisonSide = sides.find(
    (s) => s.type === 'poison' || (s.label && s.label.toLowerCase().includes('poison'))
  )
  if (poisonSide && typeof poisonSide.value === 'number' && poisonSide.value >= 10) {
    return { isDead: true, reason: `${poisonSide.value} Poison (Lethal)` }
  }
  return { isDead: false, reason: '' }
}

function getLifeFontSize(val, width, numberScale, isMerged = false) {
  const len = String(val ?? 0).length
  let baseFactor = isMerged ? 0.32 : 0.38
  if (len === 3) {
    baseFactor = isMerged ? 0.27 : 0.31
  } else if (len >= 4) {
    baseFactor = isMerged ? 0.21 : 0.24
  }
  return `${Math.round(width * baseFactor * numberScale)}px`
}

const COUNTER_TEMPLATES = [
  {
    type: 'commander',
    name: 'Commander Damage',
    label: 'Commander',
    color: '#f87171',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/0/5/0548fb60-c843-4f8f-a029-6f10efc63a41.jpg?1783903206',
    icon: '⚔️',
  },
  {
    type: 'energy',
    name: 'Energy Counters',
    label: 'Energy',
    color: '#38bdf8',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/2/5/25ea04d8-5d85-49d3-8d8d-7fe123d0ed6c.jpg?1783937144',
    icon: '⚡',
  },
  {
    type: 'experience',
    name: 'Experience Counters',
    label: 'Experience',
    color: '#a855f7',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/8/2/82f949d0-41a0-4491-9057-bfb2bb20bdb3.jpg?1783915612',
    icon: '🔮',
  },
  {
    type: 'rad',
    name: 'Rad Counters',
    label: 'Rad',
    color: '#22c55e',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/a/1/a1e36b92-aa88-4536-aebc-7e84a10d73fe.jpg?1783912398',
    icon: '☢️',
  },
  {
    type: 'tickets',
    name: 'Tickets',
    label: 'Tickets',
    color: '#fbbf24',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/f/7/f7c29dab-5cd4-4158-9a12-f14004e08484.jpg?1783920571',
    icon: '🎟️',
  },
  {
    type: 'poison',
    name: 'Poison Counters',
    label: 'Poison',
    color: '#10b981',
    defaultVal: 0,
    bgImage: 'https://cards.scryfall.io/art_crop/front/d/0/d0f82007-99f6-4c6c-8182-ee631c33531f.jpg?1783941727',
    icon: '☠️',
  },
]

const CARD_BORDER_STYLES = [
  { id: 'rivets-studs', name: 'Metal Rivets', icon: '🔩', desc: 'Studded metallic ball rivets & heavy steel rails' },
  { id: 'arcane-runes', name: 'Elder Runes', icon: '🔮', desc: 'Glowing mystic runic inscriptions & corner sigils' },
  { id: 'dragon-plate', name: 'Dragonplate', icon: '🐲', desc: 'Scalloped dragon scales & armored horned crests' },
  { id: 'iron-chains', name: 'Iron Chains', icon: '⛓️', desc: 'Forged dark iron chains & battle-hardened corner brackets' },
  { id: 'neon-cyber', name: 'Neon Surge', icon: '⚡', desc: 'Dynamic electric neon glow halo matching border color' },
  { id: 'mythic-foil', name: 'Mythic Foil', icon: '✨', desc: 'Rainbow holographic prism sheen' },
  { id: 'galaxy-foil', name: 'Galaxy Foil', icon: '🌌', desc: 'Cosmic stardust & diamond star shimmer' },
  { id: 'gilded-foil', name: 'Gilded Gold', icon: '🏆', desc: 'Luxurious etched gold metallic luster' },
  { id: 'oil-slick-foil', name: 'Oil Slick Foil', icon: '🧪', desc: 'Phyrexian iridescent pearlescent chromatic ripple' },
]

const MENU_ICONS = [
  { id: 'deck', name: '3D Deck', icon: '🎴', desc: 'Fantasy 3-card stack with glowing center gem' },
  { id: 'd20', name: 'D20 Die', icon: '🎲', desc: 'Spindown D20 counter die' },
  { id: 'lotus', name: 'Lotus', icon: '🪷', desc: 'Black Lotus mystical flower' },
  { id: 'skull', name: 'Phyrexian', icon: '💀', desc: 'Skeletal death skull' },
  { id: 'custom', name: 'Custom', icon: '✏️', desc: 'Choose your own emoji' },
]

const FONT_OPTIONS = [
  { id: 'default', name: 'System Clean', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", preview: 'Standard UI' },
  { id: 'inter', name: 'Inter Neo', family: "'Inter', sans-serif", preview: 'Modern Clean' },
  { id: 'cinzel', name: 'Cinzel Fantasy', family: "'Cinzel', serif", preview: 'Magic & Lore' },
  { id: 'cinzel-decorative', name: 'Cinzel Archon', family: "'Cinzel Decorative', serif", preview: 'Mythic Relic' },
  { id: 'medieval', name: 'Medieval Sharp', family: "'MedievalSharp', cursive", preview: 'Tavern & Quest' },
  { id: 'outfit', name: 'Outfit Gaming', family: "'Outfit', sans-serif", preview: 'Punchy Esports' },
  { id: 'spectral', name: 'Spectral Grimoire', family: "'Spectral', serif", preview: 'Ancient Tome' },
  { id: 'orbitron', name: 'Orbitron Cyber', family: "'Orbitron', sans-serif", preview: 'Neon Sci-Fi' },
]

const NUMBER_COLORS = [
  { id: 'sky', name: 'Blue', color: '#38bdf8', gradient: 'linear-gradient(180deg, #ffffff 0%, #38bdf8 100%)', glow: 'rgba(56, 189, 248, 0.4)' },
  { id: 'gold', name: 'Gold', color: '#fbbf24', gradient: 'linear-gradient(180deg, #fffbeb 0%, #f59e0b 100%)', glow: 'rgba(251, 191, 36, 0.4)' },
  { id: 'white', name: 'White', color: '#ffffff', gradient: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)', glow: 'rgba(255, 255, 255, 0.4)' },
  { id: 'emerald', name: 'Green', color: '#4ade80', gradient: 'linear-gradient(180deg, #f0fdf4 0%, #22c55e 100%)', glow: 'rgba(74, 222, 128, 0.4)' },
  { id: 'crimson', name: 'Red', color: '#f87171', gradient: 'linear-gradient(180deg, #fef2f2 0%, #ef4444 100%)', glow: 'rgba(248, 113, 113, 0.4)' },
  { id: 'amethyst', name: 'Purple', color: '#c084fc', gradient: 'linear-gradient(180deg, #faf5ff 0%, #a855f7 100%)', glow: 'rgba(192, 132, 252, 0.4)' },
  { id: 'rose', name: 'Pink', color: '#f472b6', gradient: 'linear-gradient(180deg, #fdf2f8 0%, #ec4899 100%)', glow: 'rgba(244, 114, 182, 0.4)' },
  { id: 'amber', name: 'Orange', color: '#fb923c', gradient: 'linear-gradient(180deg, #fff7ed 0%, #ea580c 100%)', glow: 'rgba(251, 146, 60, 0.4)' },
]

const NUMBER_SCALES = [
  { value: 0.85, label: '85%' },
  { value: 1.0, label: '100%' },
  { value: 1.15, label: '115%' },
  { value: 1.35, label: '135%' },
]

function getActiveStyles(sideObj, playerObj) {
  if (Array.isArray(sideObj?.borderStyles)) {
    return sideObj.borderStyles
  }
  if (sideObj?.borderStyle && sideObj.borderStyle !== 'standard') {
    return [sideObj.borderStyle]
  }
  if (Array.isArray(playerObj?.borderStyles)) {
    return playerObj.borderStyles
  }
  if (playerObj?.borderStyle && playerObj.borderStyle !== 'standard') {
    return [playerObj.borderStyle]
  }
  return []
}

function CardBorderOrnaments({ activeStyles = [], borderColor = '#fbbf24' }) {
  if (!activeStyles || activeStyles.length === 0) return null

  return (
    <>
      {activeStyles.includes('rivets-studs') && (
        <div className="card-ornament-layer ornament-rivets">
          <span className="corner-stud top-left" />
          <span className="corner-stud top-right" />
          <span className="corner-stud bottom-left" />
          <span className="corner-stud bottom-right" />
          <div className="studs-rail top-rail" />
          <div className="studs-rail bottom-rail" />
          <div className="studs-rail left-rail" />
          <div className="studs-rail right-rail" />
        </div>
      )}

      {activeStyles.includes('arcane-runes') && (
        <div className="card-ornament-layer ornament-runes">
          <span className="corner-rune top-left">ᚦ</span>
          <span className="corner-rune top-right">ᛟ</span>
          <span className="corner-rune bottom-left">ᛗ</span>
          <span className="corner-rune bottom-right">ᚱ</span>
          <div className="rune-rail top-rail" />
          <div className="rune-rail bottom-rail" />
          <div className="rune-rail left-rail" />
          <div className="rune-rail right-rail" />
        </div>
      )}

      {activeStyles.includes('dragon-plate') && (
        <div className="card-ornament-layer ornament-dragon">
          <span className="corner-dragon-crest top-left" />
          <span className="corner-dragon-crest top-right" />
          <span className="corner-dragon-crest bottom-left" />
          <span className="corner-dragon-crest bottom-right" />
          <div className="dragon-scale-rail top-rail" />
          <div className="dragon-scale-rail bottom-rail" />
          <div className="dragon-scale-rail left-rail" />
          <div className="dragon-scale-rail right-rail" />
        </div>
      )}

      {activeStyles.includes('iron-chains') && (
        <div className="card-ornament-layer ornament-chains">
          <span className="corner-chain-bracket top-left" />
          <span className="corner-chain-bracket top-right" />
          <span className="corner-chain-bracket bottom-left" />
          <span className="corner-chain-bracket bottom-right" />
          <div className="chains-rail top-rail" />
          <div className="chains-rail bottom-rail" />
          <div className="chains-rail left-rail" />
          <div className="chains-rail right-rail" />
        </div>
      )}

      {activeStyles.includes('mythic-foil') && (
        <div className="card-border-fx-layer border-fx-mythic-foil" />
      )}

      {activeStyles.includes('galaxy-foil') && (
        <div className="card-border-fx-layer border-fx-galaxy-foil" />
      )}

      {activeStyles.includes('gilded-foil') && (
        <div className="card-border-fx-layer border-fx-gilded-foil" />
      )}

      {activeStyles.includes('oil-slick-foil') && (
        <div className="card-border-fx-layer border-fx-oil-slick" />
      )}

      {(activeStyles.includes('neon-cyber') || activeStyles.includes('neon-glow')) && (
        <div
          className="card-border-fx-layer border-fx-neon"
          style={{ '--card-border-color': borderColor }}
        />
      )}
    </>
  )
}

const BASE_WIDTH = 155
const BASE_HEIGHT = 225

function getShortestAngle(current, target) {
  let diff = (target - current) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return current + diff
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0s'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatClockTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const pad = (n) => String(n).padStart(2, '0')
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

/**
 * Calculates the natural facing angle for a card at (x, y) relative to
 * a rectangular screen's center spine segment instead of a single point.
 */
function getCardFacingAngle(x, y, W = 1000, H = 800) {
  let spineTargetX = 0
  let spineTargetY = 0

  if (W > H) {
    // Landscape screen: horizontal spine line segment along y = 0
    const spineHalfLength = Math.max(0, (W - H) * 0.45)
    spineTargetX = Math.max(-spineHalfLength, Math.min(spineHalfLength, x))
    spineTargetY = 0
  } else if (H > W) {
    // Portrait screen: vertical spine line segment along x = 0
    const spineHalfLength = Math.max(0, (H - W) * 0.45)
    spineTargetX = 0
    spineTargetY = Math.max(-spineHalfLength, Math.min(spineHalfLength, y))
  }

  const dx = spineTargetX - x
  const dy = spineTargetY - y

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return 180
  }

  let angle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI) - 90)
  if (angle < 0) angle += 360
  return angle
}

function FlyingTurnOrbOverlay({ orbs, onOrbFinish }) {
  const [positions, setPositions] = useState({})

  useEffect(() => {
    if (!orbs || orbs.length === 0) return

    let animId
    const update = (now) => {
      const nextPositions = {}
      const finishedIds = []

      for (const orb of orbs) {
        const elapsed = now - orb.startTime
        const rawT = Math.min(1, Math.max(0, elapsed / orb.duration))
        // Smooth cubic easeInOut
        const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2

        const oneMinusT = 1 - t
        const currentX = oneMinusT * oneMinusT * orb.startX + 2 * oneMinusT * t * orb.ctrlX + t * t * orb.endX
        const currentY = oneMinusT * oneMinusT * orb.startY + 2 * oneMinusT * t * orb.ctrlY + t * t * orb.endY

        const trail = []
        for (let i = 1; i <= 3; i++) {
          const trailRawT = Math.max(0, rawT - i * 0.045)
          const trailT = trailRawT < 0.5 ? 4 * trailRawT * trailRawT * trailRawT : 1 - Math.pow(-2 * trailRawT + 2, 3) / 2
          const trail1MinusT = 1 - trailT
          const tx = trail1MinusT * trail1MinusT * orb.startX + 2 * trail1MinusT * trailT * orb.ctrlX + trailT * trailT * orb.endX
          const ty = trail1MinusT * trail1MinusT * orb.startY + 2 * trail1MinusT * trailT * orb.ctrlY + trailT * trailT * orb.endY
          trail.push({ x: tx, y: ty, opacity: 1 - i * 0.28, scale: 1 - i * 0.22 })
        }

        nextPositions[orb.id] = { currentX, currentY, t, trail }

        if (rawT >= 1) {
          finishedIds.push(orb.id)
        }
      }

      setPositions(nextPositions)

      if (finishedIds.length > 0) {
        finishedIds.forEach((id) => onOrbFinish(id))
      }

      if (orbs.length > 0) {
        animId = requestAnimationFrame(update)
      }
    }

    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [orbs, onOrbFinish])

  if (!orbs || orbs.length === 0) return null

  return (
    <div className="flying-orbs-container" aria-hidden="true">
      {orbs.map((orb) => {
        const pos = positions[orb.id]
        if (!pos) return null
        return (
          <div key={orb.id} className="flying-orb-wrapper">
            {pos.trail?.map((tr, idx) => (
              <div
                key={`trail-${idx}`}
                className="flying-orb-tail-particle"
                style={{
                  left: `${tr.x}px`,
                  top: `${tr.y}px`,
                  opacity: tr.opacity,
                  transform: `translate(-50%, -50%) scale(${tr.scale})`,
                }}
              />
            ))}
            <div
              className="flying-orb-head"
              style={{
                left: `${pos.currentX}px`,
                top: `${pos.currentY}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flying-orb-core" />
              <div className="flying-orb-aura" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  const {
    sessionKey,
    roomSettings,
    players,
    highlightedCardId,
    connected,
    addPlayer,
    updateLife,
    addSide,
    removeSide,
    updateSide,
    updatePlayer,
    mergePlayers,
    unmergePlayer,
    removePlayer,
    reorderPlayers,
    switchSession,
    createNewSession,
    resetAllPlayersLife,
    setHighlightedCard,
    updateRoomSettings,
  } = useSession()

  // Track daily visit on initial page load
  useEffect(() => {
    fetch('/api/visit', { method: 'POST' }).catch(() => {})
  }, [])

  // Floating Sequential Delta Micro-Interactions (+1, +2, +3, -1, -2...)
  const [floatingDeltas, setFloatingDeltas] = useState({})
  const floatingDeltaTimersRef = useRef({})

  const triggerFloatingDelta = useCallback((playerId, delta, sideIndex = 0) => {
    const key = `${playerId}_${sideIndex}`
    if (floatingDeltaTimersRef.current[key]) {
      clearTimeout(floatingDeltaTimersRef.current[key])
    }

    // Gentle haptic feedback on mobile if supported
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(Math.abs(delta) >= 10 ? 25 : 10)
      }
    } catch {}

    setFloatingDeltas((prev) => {
      const current = prev[key]
      const newDelta = (current?.delta || 0) + delta
      const seq = (current?.seq || 0) + 1
      return {
        ...prev,
        [key]: {
          delta: newDelta,
          seq,
          sign: newDelta > 0 ? `+${newDelta}` : `${newDelta}`,
        },
      }
    })

    floatingDeltaTimersRef.current[key] = setTimeout(() => {
      setFloatingDeltas((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      delete floatingDeltaTimersRef.current[key]
    }, 1300)
  }, [])

  const handleUpdateLifeWithDelta = useCallback((playerId, delta, sideIndex = 0) => {
    triggerFloatingDelta(playerId, delta, sideIndex)
    updateLife(playerId, delta, sideIndex)
  }, [triggerFloatingDelta, updateLife])

  // Revive player from 0 HP, Commander Damage (>20), or Poison Damage (>=10)
  const handleRevivePlayer = useCallback((playerId) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return

    const sides = normalizePlayerSides(player)
    const mainSide = sides.find((s) => s.index === 0)
    const currentLife = player.life ?? mainSide?.value ?? 0

    // 1. Ensure main life is at least 1
    const newLife = currentLife <= 0 ? 1 : currentLife
    updateSide(playerId, 0, { value: newLife })
    updatePlayer(playerId, { life: newLife })

    // 2. Clear lethal Commander damage (> 20 -> 20)
    sides.forEach((s) => {
      if (
        (s.type === 'commander' || (s.label && s.label.toLowerCase().includes('commander'))) &&
        typeof s.value === 'number' &&
        s.value > 20
      ) {
        updateSide(playerId, s.index, { value: 20 })
      }

      // 3. Clear lethal Poison damage (>= 10 -> 9)
      if (
        (s.type === 'poison' || (s.label && s.label.toLowerCase().includes('poison'))) &&
        typeof s.value === 'number' &&
        s.value >= 10
      ) {
        updateSide(playerId, s.index, { value: 9 })
      }
    })
  }, [players, updateSide, updatePlayer])

  // Room QR Code & Link Sharing
  const [roomQrDataUrl, setRoomQrDataUrl] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href
      QRCode.toDataURL(url, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0a120e',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setRoomQrDataUrl(dataUrl))
        .catch((err) => console.warn('QR generation error:', err))
    }
  }, [sessionKey])

  const handleCopyRoomLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      })
    }
  }, [])
  // Prevent device sleep while the app is active
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };
    requestWakeLock();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        if (wakeLock) {
          try { await wakeLock.release(); } catch {}
          wakeLock = null;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // 1. Individual Card Scale Map (Local per user fallback, roomSettings.cardScale is room-wide default)
  const [cardScaleMap, setCardScaleMap] = useState(() => {
    try {
      const saved = localStorage.getItem('mtg_card_scales')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const cardScaleMapRef = useRef(cardScaleMap)
  cardScaleMapRef.current = cardScaleMap

  const globalCardScale = typeof roomSettings.cardScale === 'number' ? roomSettings.cardScale : 1.0

  const getCardScale = useCallback((cardKey) => {
    const s = cardScaleMap[cardKey] ?? roomSettings.cardScale
    if (typeof s === 'number' && s >= 0.4 && s <= 2.5) return s
    return 1.0
  }, [cardScaleMap, roomSettings.cardScale])

  const handleSelectCardScale = useCallback((newScale) => {
    const clamped = Math.round(Math.min(2.0, Math.max(0.5, newScale)) * 100) / 100
    updateRoomSettings({ cardScale: clamped })
    setCardScaleMap({})
    try {
      localStorage.removeItem('mtg_card_scales')
    } catch {}
  }, [updateRoomSettings])

  const updateCardScale = useCallback((cardKey, newScale) => {
    const clamped = Math.round(Math.min(2.4, Math.max(0.55, newScale)) * 100) / 100
    setCardScaleMap((prev) => {
      const next = { ...prev, [cardKey]: clamped }
      try {
        localStorage.setItem('mtg_card_scales', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Local Tabletop Card Positions (Local per user, not synced)
  const [localCardPositions, setLocalCardPositions] = useState(() => {
    try {
      const saved = localStorage.getItem(`mtg_card_positions_${sessionKey}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mtg_card_positions_${sessionKey}`)
      setLocalCardPositions(saved ? JSON.parse(saved) : {})
    } catch {
      setLocalCardPositions({})
    }
  }, [sessionKey])

  const saveLocalCardPosition = useCallback((cardKey, pos) => {
    setLocalCardPositions((prev) => {
      const next = { ...prev, [cardKey]: pos }
      try {
        localStorage.setItem(`mtg_card_positions_${sessionKey}`, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [sessionKey])

  const resetAllCardScales = useCallback(() => {
    handleSelectCardScale(1.0)
  }, [handleSelectCardScale])

  // 2. View Mode (Auto open Grid View on small screens)
  const [isGridView, setIsGridView] = useState(() => {
    try {
      const saved = localStorage.getItem('mtg_view_mode')
      if (saved) return saved === 'grid'
    } catch {}
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  })

  // Grid hover drop target state
  const [gridHoverTargetId, setGridHoverTargetId] = useState(null)

  const toggleViewMode = useCallback(() => {
    setIsGridView((prev) => {
      const next = !prev
      try {
        localStorage.setItem('mtg_view_mode', next ? 'grid' : 'table')
      } catch {}
      return next
    })
    setMenuOpen(false)
  }, [])

  // 3. Window Size & Responsive auto-grid
  const [windowSize, setWindowSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1000,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      const h = window.innerHeight
      setWindowSize({ w, h })
      try {
        const saved = localStorage.getItem('mtg_view_mode')
        if (!saved && w <= 768) {
          setIsGridView(true)
        }
      } catch {}
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Clamping coordinates so cards are always fully visible on screen
  const clampCoordinates = useCallback((x, y, isWide = false, scale = 1.0) => {
    const W = windowSize.w || 1000
    const H = windowSize.h || 800
    const w = isWide ? Math.round(BASE_WIDTH * scale * 1.95) : Math.round(BASE_WIDTH * scale)
    const h = Math.round(BASE_HEIGHT * scale)

    const padX = w / 2 + 10
    const padY = h / 2 + 10

    const maxX = Math.max(0, W / 2 - padX)
    const minX = -maxX
    const maxY = Math.max(0, H / 2 - padY)
    const minY = -maxY

    const clampedX = Math.round(Math.min(maxX, Math.max(minX, x)))
    const clampedY = Math.round(Math.min(maxY, Math.max(minY, y)))

    // Facing angle pointing to closest point on rectangular center spine line
    const angle = getCardFacingAngle(clampedX, clampedY, W, H)

    return { x: clampedX, y: clampedY, angle }
  }, [windowSize])

  // Default circular / table layout guaranteeing all cards are visible
  const getDefaultLayout = useCallback((count, index) => {
    const W = windowSize.w || 1000
    const H = windowSize.h || 800

    const radX = Math.max(90, Math.min(W / 2 - 160, W * 0.34))
    const radY = Math.max(80, Math.min(H / 2 - 150, H * 0.33))

    if (count <= 1) {
      const y = Math.min(210, Math.max(150, Math.round(H * 0.28)))
      return { x: 0, y, angle: 180 }
    }

    if (count === 2) {
      if (index === 0) {
        const y = -Math.min(210, H * 0.28)
        return { x: 0, y, angle: getCardFacingAngle(0, y, W, H) }
      }
      const y = Math.min(210, H * 0.28)
      return { x: 0, y, angle: getCardFacingAngle(0, y, W, H) }
    }

    if (count === 3) {
      if (W >= H) {
        // Landscape: 1 top, 2 bottom
        if (index === 0) {
          const y = -radY
          return { x: 0, y, angle: getCardFacingAngle(0, y, W, H) }
        }
        const offX = Math.round(radX * 0.65)
        const y = radY
        const x = index === 1 ? offX : -offX
        return { x, y, angle: getCardFacingAngle(x, y, W, H) }
      }
      if (index === 0) return { x: 0, y: -radY, angle: 0 }
      if (index === 1) return { x: radX, y: Math.round(radY * 0.6), angle: 120 }
      return { x: -radX, y: Math.round(radY * 0.6), angle: 240 }
    }

    if (count === 4) {
      if (W >= H && W >= 780) {
        // Rectangular table: 2 seats on top, 2 seats on bottom
        const offX = Math.round(radX * 0.58)
        if (index === 0) return { x: -offX, y: -radY, angle: getCardFacingAngle(-offX, -radY, W, H) }
        if (index === 1) return { x: offX, y: -radY, angle: getCardFacingAngle(offX, -radY, W, H) }
        if (index === 2) return { x: offX, y: radY, angle: getCardFacingAngle(offX, radY, W, H) }
        return { x: -offX, y: radY, angle: getCardFacingAngle(-offX, radY, W, H) }
      }
      // Standard cross
      if (index === 0) return { x: 0, y: -radY, angle: 0 }
      if (index === 1) return { x: radX, y: 0, angle: 90 }
      if (index === 2) return { x: 0, y: radY, angle: 180 }
      return { x: -radX, y: 0, angle: 270 }
    }

    // 5 or more players: distributed on ellipse, facing closest point on center spine
    const theta = (2 * Math.PI * index) / count - Math.PI / 2
    const x = Math.round(radX * Math.cos(theta))
    const y = Math.round(radY * Math.sin(theta))
    const angle = getCardFacingAngle(x, y, W, H)
    return { x, y, angle }
  }, [windowSize])

  // Compute non-overlapping grid layout for all cards (supports seamless vertical scrolling)
  const computeAllGridLayouts = useCallback((cardList) => {
    const W = windowSize.w || 1000
    const H = windowSize.h || 800
    const totalCards = cardList.length
    if (totalCards === 0) return { gridPositions: {}, totalContentHeight: 0 }

    const cardDims = cardList.map((c) => {
      const scale = getCardScale(c.key)
      const w = Math.round((c.isMerged ? BASE_WIDTH * 1.95 : BASE_WIDTH) * scale)
      const h = Math.round(BASE_HEIGHT * scale)
      return { key: c.key, w, h, scale }
    })

    const gapX = Math.max(16, Math.min(32, Math.round(W * 0.025)))
    const gapY = Math.max(16, Math.min(36, Math.round(H * 0.03)))

    // Determine optimal columns
    let cols = 2
    if (totalCards <= 1) {
      cols = 1
    } else if (totalCards === 2) {
      cols = (W >= 640 && W >= H * 0.85) ? 2 : 1
    } else if (totalCards === 3) {
      cols = (W >= 960) ? 3 : (W >= 560 ? 2 : 1)
    } else if (totalCards === 4) {
      cols = 2
    } else if (totalCards <= 6) {
      cols = (W >= 1000) ? 3 : 2
    } else {
      cols = (W >= 1200) ? 4 : (W >= 800 ? 3 : 2)
    }

    const rows = Math.ceil(totalCards / cols)

    // Group cards into row arrays
    const rowGroups = []
    for (let r = 0; r < rows; r++) {
      const start = r * cols
      const end = Math.min(start + cols, totalCards)
      rowGroups.push(cardDims.slice(start, end))
    }

    // Width and height per row
    const rowWidths = rowGroups.map((group) => {
      const sumW = group.reduce((acc, c) => acc + c.w, 0)
      return sumW + (group.length - 1) * gapX
    })
    const rowHeights = rowGroups.map((group) => {
      return Math.max(...group.map((c) => c.h))
    })

    const totalGridHeight = rowHeights.reduce((acc, h) => acc + h, 0) + (rows - 1) * gapY

    // Determine start Y padding
    // If all cards comfortably fit in viewport, vertically center them;
    // otherwise start from top padding (36px) with a bottom margin of 100px so the hub button never covers card contents.
    const topPadding = totalGridHeight < H - 100 ? Math.max(36, Math.round((H - totalGridHeight) / 2)) : 36
    const totalContentHeight = totalGridHeight + topPadding + 100

    const gridPositions = {}
    let currY = topPadding

    rowGroups.forEach((group, rIdx) => {
      const rowW = rowWidths[rIdx]
      const rowH = rowHeights[rIdx]
      let currX = -rowW / 2

      group.forEach((card) => {
        const cx = Math.round(currX + card.w / 2)
        const cy = Math.round(currY + rowH / 2)
        gridPositions[card.key] = { x: cx, y: cy, angle: 0 }
        currX += card.w + gapX
      })

      currY += rowH + gapY
    })

    return { gridPositions, totalContentHeight }
  }, [windowSize, getCardScale])

  // Explicit Auto-fit resetting and saving exact positions
  const resetCardPositions = useCallback(() => {
    const processed = new Set()
    const cardItems = []
    for (const p of players) {
      if (processed.has(p.id)) continue
      if (p.mergedWith) {
        const partner = players.find((o) => o.id === p.mergedWith)
        if (partner && !processed.has(partner.id)) {
          processed.add(p.id)
          processed.add(partner.id)
          cardItems.push({ key: `merged_${p.id}_${partner.id}`, p1Id: p.id, p2Id: partner.id, isMerged: true })
          continue
        }
      }
      processed.add(p.id)
      cardItems.push({ key: p.id, p1Id: p.id, p2Id: null, isMerged: false })
    }

    const total = cardItems.length
    const newPositions = {}
    cardItems.forEach((c, idx) => {
      const scale = cardScaleMapRef.current[c.key] || 1.0
      const def = getDefaultLayout(total, idx)
      const clamped = clampCoordinates(def.x, def.y, c.isMerged, scale)
      const posObj = { x: clamped.x, y: clamped.y, angle: clamped.angle }
      newPositions[c.key] = posObj
      newPositions[c.p1Id] = posObj
      if (c.p2Id) {
        newPositions[c.p2Id] = posObj
        newPositions[`merged_${c.p2Id}_${c.p1Id}`] = posObj
      }
    })

    setLocalCardPositions(newPositions)
    try {
      localStorage.setItem(`mtg_card_positions_${sessionKey}`, JSON.stringify(newPositions))
    } catch {}
  }, [players, getDefaultLayout, clampCoordinates, sessionKey])

  // 4. Disable right clicking globally
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
    }
    window.addEventListener('contextmenu', handleContextMenu)
    return () => window.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // 5. Fullscreen state & toggle
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement
    }
    return false
  })

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err)
    }
  }, [])

  // 6. Mouse Detection
  const [hasMouse, setHasMouse] = useState(false)
  useEffect(() => {
    function detectPointer(e) {
      if (e.pointerType === 'mouse') {
        setHasMouse(true)
      }
    }
    window.addEventListener('pointerdown', detectPointer, { once: false })
    window.addEventListener('pointermove', detectPointer, { once: false })
    return () => {
      window.removeEventListener('pointerdown', detectPointer)
      window.removeEventListener('pointermove', detectPointer)
    }
  }, [])

  // Multi-Touch Hold-to-increment by 10 handling (Map per pointerId)
  const holdStatesRef = useRef(new Map())
  const recentlyFlippedCardRef = useRef(0)

  const cancelHoldForPointer = useCallback((pointerId) => {
    const state = holdStatesRef.current.get(pointerId)
    if (state) {
      if (state.timer) clearTimeout(state.timer)
      if (state.interval) clearInterval(state.interval)
      if (state.targetEl) {
        try { state.targetEl.classList.remove('is-holding') } catch (_) {}
      }
      if (typeof state.setMoved === 'function') state.setMoved()
      holdStatesRef.current.delete(pointerId)
    }
  }, [])

  const cancelAllHoldStates = useCallback(() => {
    for (const [pointerId, state] of holdStatesRef.current.entries()) {
      if (state.timer) clearTimeout(state.timer)
      if (state.interval) clearInterval(state.interval)
      if (state.targetEl) {
        try { state.targetEl.classList.remove('is-holding') } catch (_) {}
      }
      if (typeof state.setMoved === 'function') state.setMoved()
    }
    holdStatesRef.current.clear()
    try {
      document.querySelectorAll('.touch-zone.is-holding').forEach((el) => el.classList.remove('is-holding'))
    } catch (_) {}
  }, [])

  // Global safety listeners: cancel button holds when window blurs or tab becomes hidden
  useEffect(() => {
    const handleGlobalCancel = () => {
      cancelAllHoldStates()
    }
    window.addEventListener('blur', handleGlobalCancel)
    document.addEventListener('visibilitychange', handleGlobalCancel)
    return () => {
      window.removeEventListener('blur', handleGlobalCancel)
      document.removeEventListener('visibilitychange', handleGlobalCancel)
    }
  }, [cancelAllHoldStates])

  // 7. Signed Integer Axis 3D Flipping State: Center=0, Right>0, Left<0
  const [cardFlipState, setCardFlipState] = useState({})

  const getCardFaceState = useCallback((cardKey, sides) => {
    const minIndex = Math.min(0, ...sides.map((s) => s.index))
    const maxIndex = Math.max(0, ...sides.map((s) => s.index))
    const current = cardFlipState[cardKey] || { frontIndex: 0, backIndex: 1, isShowingBack: false, flipAngle: 0 }
    return { ...current, minIndex, maxIndex }
  }, [cardFlipState])

  const flipCardToSide = useCallback((cardKey, sides, direction = 1) => {
    cancelAllHoldStates()
    recentlyFlippedCardRef.current = Date.now()
    const minIndex = Math.min(0, ...sides.map((s) => s.index))
    const maxIndex = Math.max(0, ...sides.map((s) => s.index))

    setCardFlipState((prev) => {
      const current = prev[cardKey] || { frontIndex: 0, backIndex: 1, isShowingBack: false, flipAngle: 0 }
      const currentActiveIndex = current.isShowingBack ? current.backIndex : current.frontIndex
      const targetIndex = currentActiveIndex + direction

      // Bounds: cannot go past (maxIndex + 1) on the right or (minIndex - 1) on the left
      if (targetIndex > maxIndex + 1 || targetIndex < minIndex - 1) {
        return prev
      }

      const nextAngle = current.flipAngle + direction * 180
      const nextShowingBack = !current.isShowingBack

      if (nextShowingBack) {
        return {
          ...prev,
          [cardKey]: {
            frontIndex: current.frontIndex,
            backIndex: targetIndex,
            isShowingBack: true,
            flipAngle: nextAngle,
          },
        }
      } else {
        return {
          ...prev,
          [cardKey]: {
            frontIndex: targetIndex,
            backIndex: current.backIndex,
            isShowingBack: false,
            flipAngle: nextAngle,
          },
        }
      }
    })
  }, [cancelAllHoldStates])

  // 6. Global Hold-to-Align (Table mode only)
  const [globalAlignAngle, setGlobalAlignAngle] = useState(null)

  // 7. Free & Grid Dragging State (Multi-Touch concurrent dragging)
  const [localDragPositions, setLocalDragPositions] = useState({})
  const [draggingPlayerIds, setDraggingPlayerIds] = useState(() => new Set())
  const [hoverMergeTargetId, setHoverMergeTargetId] = useState(null)
  const activelyDraggingCardsRef = useRef(new Set())
  const recentlyDraggedCardRef = useRef(new Map())

  // 9. Custom In-App Modal Dialog (Confirm/Prompt/Alert)
  const [customDialog, setCustomDialog] = useState(null)

  const showConfirm = useCallback(({ title, message, icon, confirmText, cancelText, danger = false, onConfirm, onCancel }) => {
    setCustomDialog({
      type: 'confirm',
      title,
      message,
      icon,
      confirmText,
      cancelText,
      danger,
      onConfirm: () => {
        setCustomDialog(null)
        if (onConfirm) onConfirm()
      },
      onCancel: () => {
        setCustomDialog(null)
        if (onCancel) onCancel()
      },
    })
  }, [])

  const showPrompt = useCallback(({ title, message, icon, defaultValue = '', placeholder = '', confirmText, cancelText, onConfirm, onCancel }) => {
    setCustomDialog({
      type: 'prompt',
      title,
      message,
      icon,
      defaultValue,
      placeholder,
      confirmText,
      cancelText,
      onConfirm: (val) => {
        setCustomDialog(null)
        if (onConfirm) onConfirm(val)
      },
      onCancel: () => {
        setCustomDialog(null)
        if (onCancel) onCancel()
      },
    })
  }, [])

  // 10. Radial Menu & Settings Modal
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [visualsExpanded, setVisualsExpanded] = useState(false)
  const [gameLogModalOpen, setGameLogModalOpen] = useState(false)
  const [gameLogCopied, setGameLogCopied] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')

  // Turn History & Game Duration Tracking State
  const [turnHistory, setTurnHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(`mtg_turnhistory_${sessionKey}`)
      return saved ? JSON.parse(saved) : []
    } catch (_) {
      return []
    }
  })
  const [gameStartTime, setGameStartTime] = useState(() => {
    try {
      const saved = localStorage.getItem(`mtg_gamestart_${sessionKey}`)
      return saved ? parseInt(saved, 10) : Date.now()
    } catch (_) {
      return Date.now()
    }
  })
  const turnStartTimeRef = useRef(Date.now())
  const [liveNow, setLiveNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Derived synced room visual properties with fallback
  const activeThemeId = roomSettings.theme || 'forest'
  const customUiColor = roomSettings.customUiColor || '#22c55e'
  const menuIcon = roomSettings.menuIcon || 'deck'
  const customMenuEmoji = roomSettings.customMenuEmoji || '🎴'
  const numberColor = roomSettings.numberColor || 'sky'
  const customNumberColor = roomSettings.customNumberColor || '#38bdf8'
  const fontFamily = roomSettings.fontFamily || 'default'
  const numberScale = typeof roomSettings.numberScale === 'number' ? roomSettings.numberScale : 1.0
  const enableLeylines = roomSettings.enableLeylines || false

  const [ripples, setRipples] = useState([])

  useEffect(() => {
    if (!enableLeylines) return
    const handlePointerDown = (e) => {
      // Background ripple
      const id = Date.now() + '-' + Math.random()
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id))
      }, 1200)

      // Card-specific ripple
      const cardFace = e.target.closest('.mtg-card-face')
      if (cardFace) {
        const mountPoint = cardFace.querySelector('.ripple-mount-point')
        if (mountPoint) {
          const rect = mountPoint.getBoundingClientRect()
          const ripple = document.createElement('div')
          ripple.className = 'card-ripple-effect'
          mountPoint.appendChild(ripple)
          setTimeout(() => ripple.remove(), 1200)
        }
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [enableLeylines])

  const handleSelectMenuIcon = (iconId) => {
    updateRoomSettings({ menuIcon: iconId })
  }

  const handleCustomMenuEmojiChange = (emoji) => {
    updateRoomSettings({ menuIcon: 'custom', customMenuEmoji: emoji })
  }

  // Game Mode state
  const [activeGameModeId, setActiveGameModeId] = useState(() => {
    try {
      return localStorage.getItem('mtg_game_mode') || 'commander'
    } catch {
      return 'commander'
    }
  })

  const activeGameMode = useMemo(() => {
    return GAME_MODES.find((m) => m.id === activeGameModeId) || GAME_MODES[0]
  }, [activeGameModeId])

  const applyThemeStyle = useCallback((themeId, customHex) => {
    const root = document.documentElement
    if (themeId === 'custom' && customHex) {
      root.style.setProperty('--table-bg-radial-1', `${customHex}25`)
      root.style.setProperty('--table-bg-radial-2', '#14201a')
      root.style.setProperty('--table-bg-radial-3', '#0d1512')
      root.style.setProperty('--table-bg-radial-4', '#050a08')
      root.style.setProperty('--hub-border', customHex)
      root.style.setProperty('--hub-border-open', '#ffffff')
      root.style.setProperty('--hub-bg-start', '#1e2d24')
      root.style.setProperty('--hub-bg-end', '#0f1712')
      root.style.setProperty('--hub-bg-open-start', '#2a4235')
      root.style.setProperty('--hub-bg-open-end', '#14201a')
      root.style.setProperty('--hub-glow', `${customHex}60`)
      root.style.setProperty('--hub-glow-open', `${customHex}aa`)
      root.style.setProperty('--hub-gem', customHex)
      root.style.setProperty('--ambient-glow-1', `${customHex}15`)
      root.style.setProperty('--ambient-glow-2', `${customHex}08`)
      return
    }

    const t = UI_THEMES.find((item) => item.id === themeId) || UI_THEMES[0]
    root.style.setProperty('--table-bg-radial-1', t.tableRadial1)
    root.style.setProperty('--table-bg-radial-2', t.tableRadial2)
    root.style.setProperty('--table-bg-radial-3', t.tableRadial3)
    root.style.setProperty('--table-bg-radial-4', t.tableRadial4)
    root.style.setProperty('--hub-border', t.hubBorder)
    root.style.setProperty('--hub-border-open', t.hubBorderOpen)
    root.style.setProperty('--hub-bg-start', t.hubBgStart)
    root.style.setProperty('--hub-bg-end', t.hubBgEnd)
    root.style.setProperty('--hub-bg-open-start', t.hubBgOpenStart)
    root.style.setProperty('--hub-bg-open-end', t.hubBgOpenEnd)
    root.style.setProperty('--hub-glow', t.hubGlow)
    root.style.setProperty('--hub-glow-open', t.hubGlowOpen)
    root.style.setProperty('--hub-gem', t.hubGem)
    root.style.setProperty('--ambient-glow-1', t.ambient1)
    root.style.setProperty('--ambient-glow-2', t.ambient2)
  }, [])

  const applyFontStyle = useCallback((fontId) => {
    const root = document.documentElement
    const opt = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0]
    root.style.setProperty('--app-font-family', opt.family)
  }, [])

  const applyNumberColorStyle = useCallback((colorId, customHex) => {
    const root = document.documentElement
    if (colorId === 'custom' && customHex) {
      root.style.setProperty('--card-number-gradient', `linear-gradient(180deg, #ffffff 0%, ${customHex} 100%)`)
      root.style.setProperty('--card-number-glow', `${customHex}66`)
      return
    }
    const c = NUMBER_COLORS.find((item) => item.id === colorId) || NUMBER_COLORS[0]
    root.style.setProperty('--card-number-gradient', c.gradient)
    root.style.setProperty('--card-number-glow', c.glow)
  }, [])

  useEffect(() => {
    applyThemeStyle(activeThemeId, customUiColor)
    applyFontStyle(fontFamily)
    applyNumberColorStyle(numberColor, customNumberColor)
  }, [
    activeThemeId,
    customUiColor,
    fontFamily,
    numberColor,
    customNumberColor,
    applyThemeStyle,
    applyFontStyle,
    applyNumberColorStyle,
  ])

  const handleSelectTheme = (themeId) => {
    updateRoomSettings({ theme: themeId })
  }

  const handleCustomColorChange = (hex) => {
    updateRoomSettings({ theme: 'custom', customUiColor: hex })
  }

  const handleSelectFont = (fontId) => {
    updateRoomSettings({ fontFamily: fontId })
  }

  const handleSelectNumberColor = (colorId) => {
    updateRoomSettings({ numberColor: colorId })
  }

  const handleCustomNumberColorChange = (hex) => {
    updateRoomSettings({ numberColor: 'custom', customNumberColor: hex })
  }

  const handleSelectNumberScale = (scale) => {
    updateRoomSettings({ numberScale: scale })
  }

  const handleSelectGameMode = (modeId) => {
    setActiveGameModeId(modeId)
    try {
      localStorage.setItem('mtg_game_mode', modeId)
    } catch {}
  }

  const handleApplyGameModeToAll = (modeId) => {
    const mode = GAME_MODES.find((m) => m.id === modeId) || activeGameMode
    handleSelectGameMode(mode.id)
    resetAllPlayersLife(mode.soloLife, mode.teamLife, mode.id)
  }

  // Highlighting Token Drag State (Grid View & Table Turn Ball)
  const [tokenDragPos, setTokenDragPos] = useState(null)
  const [tokenHoverCardId, setTokenHoverCardId] = useState(null)
  const [centerHubMode, setCenterHubMode] = useState('menu')

  const reverseTurnDirection = !!roomSettings.reverseTurnDirection || roomSettings.turnDirection === 'counter-clockwise'

  const handleStepPointerDown = (playerId, delta, sideIndex, e) => {
    const pointerId = e.pointerId
    cancelHoldForPointer(pointerId)
    if (Date.now() - (recentlyFlippedCardRef.current || 0) < 320) return
    const targetEl = e.currentTarget
    try { targetEl.setPointerCapture(pointerId) } catch (_) {}
    targetEl.classList.add('is-holding')

    const startX = e.clientX
    const startY = e.clientY
    let moved = false
    let isLongPress = false

    const timer = setTimeout(() => {
      if (moved) return
      isLongPress = true
      handleUpdateLifeWithDelta(playerId, delta * 10, sideIndex)

      const interval = setInterval(() => {
        if (moved) return
        handleUpdateLifeWithDelta(playerId, delta * 10, sideIndex)
      }, 600)
      const currentHold = holdStatesRef.current.get(pointerId)
      if (currentHold) {
        currentHold.interval = interval
      }
    }, 380)

    holdStatesRef.current.set(pointerId, {
      playerId,
      delta,
      sideIndex,
      targetEl,
      startX,
      startY,
      timer,
      interval: null,
      isCancelled: () => moved,
      checkLongPress: () => isLongPress,
      setMoved: () => { moved = true },
    })
  }

  const handleStepPointerMove = (e) => {
    const pointerId = e.pointerId
    const hold = holdStatesRef.current.get(pointerId)
    if (!hold) return
    const { startX, startY, timer, interval, targetEl, setMoved } = hold
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
      setMoved()
      clearTimeout(timer)
      if (interval) clearInterval(interval)
      targetEl.classList.remove('is-holding')
    }
  }

  const handleStepPointerUpOrLeave = (playerId, delta, sideIndex, e) => {
    const pointerId = e.pointerId
    const hold = holdStatesRef.current.get(pointerId)
    if (!hold) return
    const { targetEl, timer, interval, checkLongPress, isCancelled } = hold
    clearTimeout(timer)
    if (interval) clearInterval(interval)
    targetEl.classList.remove('is-holding')
    try { targetEl.releasePointerCapture(pointerId) } catch (_) {}

    const recentlyFlipped = Date.now() - (recentlyFlippedCardRef.current || 0) < 350
    if (!isCancelled() && !checkLongPress() && !recentlyFlipped) {
      handleUpdateLifeWithDelta(playerId, delta, sideIndex)
    }

    holdStatesRef.current.delete(pointerId)
  }

  // Highlight token drag & click handler
  const handleTokenPointerDown = (e) => {
    e.stopPropagation()
    const targetEl = e.currentTarget
    const startX = e.clientX
    const startY = e.clientY
    let isDragging = false

    const onPointerMove = (moveEvt) => {
      const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY)
      if (dist > 5) {
        isDragging = true
        setTokenDragPos({ x: moveEvt.clientX, y: moveEvt.clientY })

        const el = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY)
        const cardWrapper = el?.closest('.player-card-wrapper')
        if (cardWrapper && cardWrapper.dataset.cardId) {
          setTokenHoverCardId(cardWrapper.dataset.cardId)
        } else {
          setTokenHoverCardId(null)
        }
      }
    }

    const onPointerUp = (upEvt) => {
      targetEl.removeEventListener('pointermove', onPointerMove)
      targetEl.removeEventListener('pointerup', onPointerUp)
      targetEl.removeEventListener('pointercancel', onPointerUp)
      try { targetEl.releasePointerCapture(upEvt.pointerId) } catch (_) {}

      if (isDragging) {
        const el = document.elementFromPoint(upEvt.clientX, upEvt.clientY)
        const cardWrapper = el?.closest('.player-card-wrapper')
        if (cardWrapper && cardWrapper.dataset.cardId) {
          activeBallCardRef.current = cardWrapper.dataset.cardId
          setVisualHighlightedCardId(cardWrapper.dataset.cardId)
          setHighlightedCard(cardWrapper.dataset.cardId)
        }
      }

      setTokenDragPos(null)
      setTokenHoverCardId(null)
    }

    targetEl.addEventListener('pointermove', onPointerMove)
    targetEl.addEventListener('pointerup', onPointerUp)
    targetEl.addEventListener('pointercancel', onPointerUp)
    try { targetEl.setPointerCapture(e.pointerId) } catch (_) {}
  }

  // 10. Multi-Card Settings Popovers & Inline Rename State
  const [openSettingsCardIds, setOpenSettingsCardIds] = useState(() => new Set())
  const [popoverActiveTabs, setPopoverActiveTabs] = useState({}) // { [cardKey]: 'size' | 'design' | null }
  const [renamingTarget, setRenamingTarget] = useState(null) // { type: 'player', id } or { type: 'side', playerId, sideIndex }
  const [renameValue, setRenameValue] = useState('')

  const toggleCardSettings = useCallback((cardKey) => {
    setOpenSettingsCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardKey)) {
        next.delete(cardKey)
      } else {
        next.add(cardKey)
      }
      return next
    })
  }, [])

  const closeCardSettings = useCallback((cardKey) => {
    setOpenSettingsCardIds((prev) => {
      const next = new Set(prev)
      next.delete(cardKey)
      return next
    })
  }, [])

  const toggleCardPopoverTab = useCallback((cardKey, tabName) => {
    setPopoverActiveTabs((prev) => ({
      ...prev,
      [cardKey]: prev[cardKey] === tabName ? null : tabName,
    }))
  }, [])

  // 11. Add Side Modal State
  const [addSideTarget, setAddSideTarget] = useState(null)
  const [customCounterName, setCustomCounterName] = useState('')
  const [customCounterValue, setCustomCounterValue] = useState(0)
  const [customCounterColor, setCustomCounterColor] = useState('#38bdf8')

  // 12. MTG Card Art Search State
  const [artSearchTarget, setArtSearchTarget] = useState(null)
  const [artQuery, setArtQuery] = useState('')
  const [artSuggestions, setArtSuggestions] = useState([])
  const [artLoading, setArtLoading] = useState(false)

  const centerRef = useRef(null)

  useEffect(() => {
    function handleDocClick(e) {
      if (
        !e.target.closest('.card-settings-btn') &&
        !e.target.closest('.card-settings-popover') &&
        !e.target.closest('.art-search-modal') &&
        !e.target.closest('.add-side-modal') &&
        !e.target.closest('.player-card-wrapper')
      ) {
        setOpenSettingsCardIds(new Set())
        setPopoverActiveTabs({})
      }
    }
    document.addEventListener('pointerdown', handleDocClick)
    return () => document.removeEventListener('pointerdown', handleDocClick)
  }, [])

  // Scryfall Autocomplete search debounce
  useEffect(() => {
    if (!artQuery.trim() || !artSearchTarget) {
      setArtSuggestions([])
      return
    }

    const timer = setTimeout(() => {
      setArtLoading(true)
      fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(artQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.data)) {
            setArtSuggestions(data.data.slice(0, 8))
          }
        })
        .catch(() => {})
        .finally(() => setArtLoading(false))
    }, 180)

    return () => clearTimeout(timer)
  }, [artQuery, artSearchTarget])

  const selectCardArt = useCallback((cardName) => {
    if (!artSearchTarget) return
    const { playerId, sideIndex } = artSearchTarget
    setArtLoading(true)
    fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`)
      .then((res) => res.json())
      .then((data) => {
        let artUrl = data?.image_uris?.art_crop || data?.image_uris?.normal || data?.image_uris?.large
        if (!artUrl && Array.isArray(data?.card_faces)) {
          artUrl = data.card_faces[0]?.image_uris?.art_crop || data.card_faces[0]?.image_uris?.normal
        }

        // Color identity detection from Scryfall
        const colors = data?.colors || data?.card_faces?.[0]?.colors || []
        let detectedColor = null
        if (colors.length === 1) {
          const c = colors[0]
          if (c === 'W') detectedColor = '#fef08a' // Plains / White
          else if (c === 'U') detectedColor = '#38bdf8' // Island / Blue
          else if (c === 'B') detectedColor = '#c084fc' // Swamp / Black
          else if (c === 'R') detectedColor = '#f87171' // Mountain / Red
          else if (c === 'G') detectedColor = '#22c55e' // Forest / Green
        } else if (colors.length >= 2) {
          detectedColor = '#fbbf24' // Multicolor / Gold
        } else {
          const identity = data?.color_identity || []
          if (identity.length === 1) {
            const c = identity[0]
            if (c === 'W') detectedColor = '#fef08a'
            else if (c === 'U') detectedColor = '#38bdf8'
            else if (c === 'B') detectedColor = '#c084fc'
            else if (c === 'R') detectedColor = '#f87171'
            else if (c === 'G') detectedColor = '#22c55e'
          } else if (identity.length >= 2) {
            detectedColor = '#fbbf24'
          } else {
            detectedColor = '#cbd5e1' // Colorless
          }
        }

        const sideUpdates = { bgImage: artUrl }
        if (detectedColor) {
          sideUpdates.color = detectedColor
        }

        if (artUrl) {
          updateSide(playerId, sideIndex, sideUpdates)
          if (detectedColor) {
            updatePlayer(playerId, { color: detectedColor })
          }
        }
      })
      .catch((err) => {
        console.error('Error loading card art:', err)
      })
      .finally(() => {
        setArtLoading(false)
        setArtSearchTarget(null)
        setArtQuery('')
        setArtSuggestions([])
        setActiveSettingsCardId(null)
      })
  }, [artSearchTarget, players, updateSide, updatePlayer])

  // Handle Add Side (Preset or Custom) at specific signed index
  const handleApplySide = useCallback((sideData) => {
    if (!addSideTarget) return
    const { playerId, targetIndex } = addSideTarget

    addSide(playerId, {
      ...sideData,
      index: targetIndex,
    })

    setAddSideTarget(null)
    setCustomCounterName('')
    setCustomCounterValue(0)
  }, [addSideTarget, addSide])

  // Add new player
  const handleAddNewPlayer = (e) => {
    e?.preventDefault()
    const name = newPlayerName.trim() || `Player ${players.length + 1}`
    setNewPlayerName('')
    setMenuOpen(false)

    const count = players.length
    const initialColor = MTG_COLORS[count % MTG_COLORS.length].border
    const startLife = activeGameMode.soloLife || 40

    addPlayer({
      name,
      life: startLife,
      color: initialColor,
      sides: [
        {
          index: 0,
          id: 'main',
          type: 'life',
          label: '',
          value: startLife,
          color: initialColor,
          bgImage: null,
        },
      ],
      mergedWith: null,
    })
  }

  // Save Inline Rename
  const handleSaveRename = () => {
    if (!renamingTarget) return
    const val = renameValue.trim()
    if (renamingTarget.type === 'player') {
      updatePlayer(renamingTarget.id, { name: val || 'Player' })
    } else if (renamingTarget.type === 'side') {
      updateSide(renamingTarget.playerId, renamingTarget.sideIndex, { label: val || 'Counter' })
    }
    setRenamingTarget(null)
    setRenameValue('')
  }

  // Free & Grid Dragging (Local per user, multi-touch concurrent)
  const getRelatedCardKeys = useCallback((player, cardKey) => {
    const keys = new Set()
    if (cardKey) keys.add(cardKey)
    if (player?.id) keys.add(player.id)
    if (player?.mergedWith) {
      keys.add(player.mergedWith)
      keys.add(`merged_${player.id}_${player.mergedWith}`)
      keys.add(`merged_${player.mergedWith}_${player.id}`)
    }
    return Array.from(keys)
  }, [])

  const handleStartCardDrag = (player, cardKey, isMerged, scale, currentX, currentY, currentAngle, e) => {
    if (
      e.target.closest('.card-settings-btn') ||
      e.target.closest('.card-settings-popover') ||
      e.target.closest('.add-side-plus-btn') ||
      e.target.closest('.rename-input') ||
      e.target.closest('.rename-side-badge-input') ||
      renamingTarget !== null
    ) return
    e.stopPropagation()

    const targetEl = e.currentTarget
    try { targetEl.setPointerCapture(e.pointerId) } catch (_) {}

    const relatedKeys = getRelatedCardKeys(player, cardKey)
    relatedKeys.forEach((k) => {
      activelyDraggingCardsRef.current.add(k)
      delete swipeStartRef.current[k]
    })

    const startPointer = { x: e.clientX, y: e.clientY }
    const saved = localCardPositions[cardKey] || localCardPositions[player.id]
    const startX = isGridView ? 0 : (localDragPositions[player.id]?.x ?? saved?.x ?? currentX ?? 0)
    const startY = isGridView ? 0 : (localDragPositions[player.id]?.y ?? saved?.y ?? currentY ?? 0)
    const startAngle = isGridView ? 0 : (localDragPositions[player.id]?.angle ?? saved?.angle ?? currentAngle ?? 0)

    setDraggingPlayerIds((prev) => new Set([...prev, player.id]))
    let currentClamped = { x: startX, y: startY, angle: startAngle }
    let lastHoverTargetId = null

    const onPointerMove = (moveEvent) => {
      const now = Date.now()
      relatedKeys.forEach((k) => recentlyDraggedCardRef.current.set(k, now))

      const deltaX = moveEvent.clientX - startPointer.x
      const deltaY = moveEvent.clientY - startPointer.y

      if (isGridView) {
        // Update drag preview position
        setLocalDragPositions((prev) => ({
          ...prev,
          [player.id]: { x: deltaX, y: deltaY, angle: 0 },
        }))

        // Find nearest card target in the grid
        let nearestTarget = null
        let minD = 350

        for (const other of players) {
          if (other.id !== player.id && (!player.mergedWith || other.id !== player.mergedWith)) {
            const el = document.getElementById(`player-card-wrapper-${other.id}`)
            if (!el) continue
            const rect = el.getBoundingClientRect()
            const cx = rect.left + rect.width / 2
            const cy = rect.top + rect.height / 2
            const dist = Math.hypot(moveEvent.clientX - cx, moveEvent.clientY - cy)
            if (dist < minD) {
              minD = dist
              nearestTarget = other.id
            }
          }
        }
        lastHoverTargetId = nearestTarget
        setGridHoverTargetId(nearestTarget)
      } else {
        const targetX = startX + deltaX
        const targetY = startY + deltaY

        currentClamped = clampCoordinates(targetX, targetY, isMerged, scale)

        setLocalDragPositions((prev) => ({
          ...prev,
          [player.id]: {
            x: currentClamped.x,
            y: currentClamped.y,
            angle: startAngle,
          },
        }))

        if (!player.mergedWith) {
          let nearestTarget = null
          let minD = 90

          for (const other of players) {
            if (other.id !== player.id && !other.mergedWith) {
              const oCard = renderedCardsRef.current?.find((c) => c.key === other.id || c.p1?.id === other.id || c.p2?.id === other.id)
              const oPos = localCardPositions[other.id] || {}
              const oX = localDragPositions[other.id]?.x ?? oCard?.x ?? oPos.x ?? 0
              const oY = localDragPositions[other.id]?.y ?? oCard?.y ?? oPos.y ?? 0
              const dist = Math.hypot(currentClamped.x - oX, currentClamped.y - oY)
              if (dist < minD) {
                minD = dist
                nearestTarget = other.id
              }
            }
          }
          setHoverMergeTargetId(nearestTarget)
        }
      }
    }

    const onPointerUp = (upEvent) => {
      targetEl.removeEventListener('pointermove', onPointerMove)
      targetEl.removeEventListener('pointerup', onPointerUp)
      targetEl.removeEventListener('pointercancel', onPointerUp)
      try {
        targetEl.releasePointerCapture(upEvent.pointerId)
      } catch (_) {}

      const now = Date.now()
      relatedKeys.forEach((k) => {
        activelyDraggingCardsRef.current.delete(k)
        recentlyDraggedCardRef.current.set(k, now)
        delete swipeStartRef.current[k]
      })

      setLocalDragPositions((prev) => {
        const next = { ...prev }
        delete next[player.id]
        return next
      })

      if (isGridView) {
        if (lastHoverTargetId && lastHoverTargetId !== player.id) {
          const currentIds = players.map((p) => p.id)
          if (player.mergedWith) {
            const p2Id = player.mergedWith
            const filtered = currentIds.filter((id) => id !== player.id && id !== p2Id)
            const insertIdx = filtered.indexOf(lastHoverTargetId)
            if (insertIdx !== -1) {
              filtered.splice(insertIdx, 0, player.id, p2Id)
              reorderPlayers(filtered)
            }
          } else {
            const sourceIdx = currentIds.indexOf(player.id)
            const targetIdx = currentIds.indexOf(lastHoverTargetId)
            if (sourceIdx !== -1 && targetIdx !== -1 && sourceIdx !== targetIdx) {
              const newOrder = [...currentIds]
              const [moved] = newOrder.splice(sourceIdx, 1)
              newOrder.splice(targetIdx, 0, moved)
              reorderPlayers(newOrder)
            }
          }
        }
        setGridHoverTargetId(null)
        setHoverMergeTargetId(null)
      } else {
        const finalClamped = clampCoordinates(currentClamped.x, currentClamped.y, isMerged, scale)
        saveLocalCardPosition(cardKey, {
          x: finalClamped.x,
          y: finalClamped.y,
          angle: finalClamped.angle,
        })

        setHoverMergeTargetId((currentTargetId) => {
          if (currentTargetId && !player.mergedWith) {
            mergePlayers(player.id, currentTargetId)
          }
          return null
        })
      }

      setDraggingPlayerIds((prev) => {
        const next = new Set(prev)
        next.delete(player.id)
        return next
      })
    }

    targetEl.addEventListener('pointermove', onPointerMove)
    targetEl.addEventListener('pointerup', onPointerUp)
    targetEl.addEventListener('pointercancel', onPointerUp)
  }

  // Swipe navigation
  const swipeStartRef = useRef({})

  const handleTouchStartCard = (cardKey, e) => {
    if (
      e.target.closest('.card-top-bar') ||
      e.target.closest('.mouse-corner-btn') ||
      e.target.closest('.card-settings-btn') ||
      e.target.closest('.card-settings-popover') ||
      e.target.closest('.rename-input') ||
      e.target.closest('.rename-side-badge-input') ||
      e.target.closest('.death-revive-btn') ||
      renamingTarget !== null
    ) {
      return
    }

    if (
      activelyDraggingCardsRef.current.has(cardKey) ||
      draggingPlayerIds.has(cardKey)
    ) {
      return
    }

    const lastDragged = recentlyDraggedCardRef.current.get(cardKey) || 0
    if (Date.now() - lastDragged < 250) {
      return
    }

    if (e.touches.length === 1) {
      swipeStartRef.current[cardKey] = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    }
  }

  const handleTouchEndCard = (cardKey, sides, visualRotationDeg, e) => {
    const isDragging =
      activelyDraggingCardsRef.current.has(cardKey) ||
      draggingPlayerIds.has(cardKey)
    const lastDragged = recentlyDraggedCardRef.current.get(cardKey) || 0
    const wasRecentlyDragged = Date.now() - lastDragged < 250

    if (isDragging || wasRecentlyDragged || renamingTarget !== null) {
      delete swipeStartRef.current[cardKey]
      return
    }

    const start = swipeStartRef.current[cardKey]
    if (!start || !e.changedTouches || e.changedTouches.length === 0) {
      delete swipeStartRef.current[cardKey]
      return
    }

    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const dx = endX - start.x
    const dy = endY - start.y
    const dt = Date.now() - start.time

    if (dt < 700 && Math.hypot(dx, dy) > 15) {
      const rot = isGridView ? 0 : (visualRotationDeg || 0) + 180
      const rad = (rot * Math.PI) / 180
      const localDx = dx * Math.cos(rad) + dy * Math.sin(rad)

      const face = getCardFaceState(cardKey, sides)
      const currentActiveIdx = face.isShowingBack ? face.backIndex : face.frontIndex
      const isPastRight = currentActiveIdx > face.maxIndex
      const isPastLeft = currentActiveIdx < face.minIndex

      if (isPastRight) {
        // On the right "+" face: swiping left or right flips back to the active counter
        recentlyFlippedCardRef.current = Date.now()
        flipCardToSide(cardKey, sides, -1)
      } else if (isPastLeft) {
        // On the left "+" face: swiping left or right flips back to the active counter
        recentlyFlippedCardRef.current = Date.now()
        flipCardToSide(cardKey, sides, 1)
      } else if (localDx > 15) {
        recentlyFlippedCardRef.current = Date.now()
        flipCardToSide(cardKey, sides, 1)
      } else if (localDx < -15) {
        recentlyFlippedCardRef.current = Date.now()
        flipCardToSide(cardKey, sides, -1)
      }
    }
    delete swipeStartRef.current[cardKey]
  }

  const handleTouchCancelCard = (cardKey) => {
    delete swipeStartRef.current[cardKey]
  }

  const handleRoomSubmit = (e) => {
    if (e) e.preventDefault()
    const code = roomCodeInput.trim()
    if (code) {
      switchSession(code)
      setRoomCodeInput('')
      setMenuOpen(false)
    }
  }

  const cardAngleAccumulatorRef = useRef({})

  // Group cards & compute local positions and scales guaranteeing all cards are visible
  const { renderedCards, gridContentHeight } = useMemo(() => {
    const processed = new Set()
    const cards = []

    for (const p of players) {
      if (processed.has(p.id)) continue

      if (p.mergedWith) {
        const partner = players.find((o) => o.id === p.mergedWith)
        if (partner && !processed.has(partner.id)) {
          processed.add(p.id)
          processed.add(partner.id)
          const cardKey = `merged_${p.id}_${partner.id}`
          cards.push({
            isMerged: true,
            p1: p,
            p2: partner,
            key: cardKey,
          })
          continue
        }
      }

      processed.add(p.id)
      cards.push({
        isMerged: false,
        p1: p,
        key: p.id,
      })
    }

    const totalCards = cards.length
    const { gridPositions: gridLayoutMap = {}, totalContentHeight = 0 } = computeAllGridLayouts(cards)

    return {
      gridContentHeight: totalContentHeight,
      renderedCards: cards.map((item, idx) => {
        const scale = getCardScale(item.key)
        const defPos = getDefaultLayout(totalCards, idx)
        const gridPos = gridLayoutMap[item.key] || { x: 0, y: 0, angle: 0 }
        const savedPos = localCardPositions[item.key] || localCardPositions[item.p1.id]

        const isDraggingThis = draggingPlayerIds.has(item.p1.id)
        const dragPos = localDragPositions[item.p1.id]

        let finalX, finalY, finalAngle

        if (isGridView) {
          finalX = isDraggingThis && dragPos ? gridPos.x + dragPos.x : gridPos.x
          finalY = isDraggingThis && dragPos ? gridPos.y + dragPos.y : gridPos.y
          finalAngle = 0
        } else {
          const rawX = isDraggingThis && dragPos ? dragPos.x : (savedPos?.x ?? defPos.x)
          const rawY = isDraggingThis && dragPos ? dragPos.y : (savedPos?.y ?? defPos.y)
          const rawAngle = isDraggingThis && dragPos?.angle !== undefined ? dragPos.angle : (savedPos?.angle ?? defPos.angle)
          const clamped = clampCoordinates(rawX, rawY, item.isMerged, scale)
          finalX = clamped.x
          finalY = clamped.y
          finalAngle = rawAngle
        }

        const targetRotation = isGridView ? 0 : (globalAlignAngle !== null ? globalAlignAngle : finalAngle)
        const prevRotation = cardAngleAccumulatorRef.current[item.key] !== undefined
          ? cardAngleAccumulatorRef.current[item.key]
          : targetRotation
        const currentRotation = getShortestAngle(prevRotation, targetRotation)
        cardAngleAccumulatorRef.current[item.key] = currentRotation

        return {
          ...item,
          scale,
          x: finalX,
          y: finalY,
          angle: finalAngle,
          currentRotation,
          gridPos,
          defPos,
        }
      }),
    }
  }, [players, isGridView, globalAlignAngle, draggingPlayerIds, localDragPositions, localCardPositions, getCardScale, getDefaultLayout, computeAllGridLayouts, clampCoordinates])

  const renderedCardsRef = useRef([])
  renderedCardsRef.current = renderedCards

  // Track newly added cards and room entry so cards fly in one after the other from the center
  const [spawningCardMap, setSpawningCardMap] = useState({})
  const knownCardKeysRef = useRef(new Set())
  const lastSessionKeyRef = useRef(sessionKey)

  const handleCardSpawnEnd = useCallback((cardKey) => {
    if (!cardKey) return
    setSpawningCardMap((prev) => {
      if (!prev || prev[cardKey] === undefined) return prev
      const next = { ...prev }
      delete next[cardKey]
      return next
    })
  }, [])

  useEffect(() => {
    // If room/session changed, reset known keys so cards in new room animate in sequentially
    if (lastSessionKeyRef.current !== sessionKey) {
      lastSessionKeyRef.current = sessionKey
      knownCardKeysRef.current = new Set()
      setSpawningCardMap({})
    }

    if (!players || players.length === 0) return
    const currentKeys = players.map((p) => p.id)
    const newKeys = currentKeys.filter((k) => !knownCardKeysRef.current.has(k))

    if (newKeys.length > 0) {
      const isInitialRoomLoad = knownCardKeysRef.current.size === 0
      const newMap = {}
      newKeys.forEach((key, index) => {
        newMap[key] = isInitialRoomLoad ? index * 120 : 0
        knownCardKeysRef.current.add(key)
      })

      setSpawningCardMap((prev) => ({ ...prev, ...newMap }))

      const maxDelay = isInitialRoomLoad ? (newKeys.length - 1) * 120 : 0
      const totalDuration = maxDelay + 750

      const timer = setTimeout(() => {
        setSpawningCardMap((prev) => {
          if (!prev || Object.keys(prev).length === 0) return prev
          const next = { ...prev }
          newKeys.forEach((k) => delete next[k])
          return next
        })
      }, totalDuration)

      return () => clearTimeout(timer)
    }
  }, [players, sessionKey])

  const handleTablePointerDownAction = (e) => {
    if (isGridView) return
    if (
      e.target.closest('.player-card-wrapper') ||
      e.target.closest('.mtg-card-face') ||
      e.target.closest('.center-hub') ||
      e.target.closest('.radial-menu-overlay') ||
      e.target.closest('.art-search-modal') ||
      e.target.closest('.add-side-modal')
    ) {
      return
    }

    const centerX = windowSize.w / 2
    const centerY = windowSize.h / 2
    const clickX = e.clientX - centerX
    const clickY = e.clientY - centerY

    let closestAngle = null
    let minD = Infinity

    for (const card of renderedCards) {
      const cX = card.x ?? 0
      const cY = card.y ?? 0
      const d = Math.hypot(clickX - cX, clickY - cY)
      if (d < minD) {
        minD = d
        closestAngle = card.angle ?? 0
      }
    }

    if (closestAngle !== null) {
      setGlobalAlignAngle(closestAngle)
    }

    const onBgPointerUp = () => {
      setGlobalAlignAngle(null)
      window.removeEventListener('pointerup', onBgPointerUp)
      window.removeEventListener('pointercancel', onBgPointerUp)
    }

    window.addEventListener('pointerup', onBgPointerUp)
    window.addEventListener('pointercancel', onBgPointerUp)
  }

  // Turn Order helper functions (Polar Clockwise & Grid Order)
  const getClockwiseAngle = (card) => {
    return (Math.atan2(card.y, card.x) + 2.5 * Math.PI) % (2 * Math.PI)
  }

  const getOrderedCards = (cardList, isGrid, isReversed) => {
    if (!cardList || cardList.length === 0) return []
    const sorted = [...cardList]
    if (isGrid) {
      sorted.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 15) return a.y - b.y
        return a.x - b.x
      })
    } else {
      sorted.sort((a, b) => getClockwiseAngle(a) - getClockwiseAngle(b))
    }
    if (isReversed) {
      sorted.reverse()
    }
    return sorted
  }

  // Flying Turn Orb State & Turn Detection Queue
  const [flyingOrbs, setFlyingOrbs] = useState([])
  const [landingCardId, setLandingCardId] = useState(null)
  const [visualHighlightedCardId, setVisualHighlightedCardId] = useState(highlightedCardId)
  const prevHighlightedCardIdRef = useRef(highlightedCardId)
  const turnOrbQueueRef = useRef([])
  const isOrbFlyingRef = useRef(false)
  const activeBallCardRef = useRef(highlightedCardId)

  const getCardElement = useCallback((keyOrId) => {
    if (!keyOrId) return null
    return (
      document.getElementById(`player-card-wrapper-${keyOrId}`) ||
      document.querySelector(`[data-card-id="${keyOrId}"]`) ||
      document.querySelector(`[id*="${keyOrId}"]`)
    )
  }, [])

  const processNextOrb = useCallback(() => {
    if (isOrbFlyingRef.current) return
    if (turnOrbQueueRef.current.length === 0) return

    const nextSegment = turnOrbQueueRef.current.shift()
    if (!nextSegment) return

    const { fromId, toId } = nextSegment
    if (!toId) {
      processNextOrb()
      return
    }

    let startX = window.innerWidth / 2
    let startY = window.innerHeight / 2

    if (fromId) {
      const prevEl = getCardElement(fromId)
      if (prevEl) {
        const rect = prevEl.getBoundingClientRect()
        startX = rect.left + rect.width / 2
        startY = rect.top + rect.height / 2
      } else {
        const centerHubEl = document.querySelector('.center-hub')
        if (centerHubEl) {
          const rect = centerHubEl.getBoundingClientRect()
          startX = rect.left + rect.width / 2
          startY = rect.top + rect.height / 2
        }
      }
    } else {
      const centerHubEl = document.querySelector('.center-hub')
      if (centerHubEl) {
        const rect = centerHubEl.getBoundingClientRect()
        startX = rect.left + rect.width / 2
        startY = rect.top + rect.height / 2
      }
    }

    const targetEl = getCardElement(toId)
    if (!targetEl) {
      processNextOrb()
      return
    }

    if (isGridView) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    const targetRect = targetEl.getBoundingClientRect()
    const endX = targetRect.left + targetRect.width / 2
    const endY = targetRect.top + targetRect.height / 2

    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const dist = Math.hypot(endX - startX, endY - startY)

    let nx = 0, ny = -1
    if (dist > 5) {
      nx = -(endY - startY) / dist
      ny = (endX - startX) / dist
    }
    const isReversed = !!roomSettings.reverseTurnDirection || roomSettings.turnDirection === 'counter-clockwise'
    const directionSign = isReversed ? -1 : 1
    const arch = Math.min(140, Math.max(50, dist * 0.3)) * directionSign
    const ctrlX = midX + nx * arch
    const ctrlY = midY + ny * arch

    const newOrb = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      startX,
      startY,
      ctrlX,
      ctrlY,
      endX,
      endY,
      targetKey: toId,
      startTime: performance.now(),
      duration: 520,
    }

    isOrbFlyingRef.current = true
    setFlyingOrbs([newOrb])
  }, [isGridView, roomSettings, getCardElement])

  useEffect(() => {
    const prevId = prevHighlightedCardIdRef.current
    const currId = highlightedCardId
    prevHighlightedCardIdRef.current = currId

    if (!currId || currId === prevId) return

    // Sync visual highlight immediately if idle
    if (!isOrbFlyingRef.current && turnOrbQueueRef.current.length === 0) {
      setVisualHighlightedCardId(currId)
    }

    // If activeBallCardRef already matched currId (e.g. from local handleAdvanceTurn), skip duplicate
    if (activeBallCardRef.current === currId && turnOrbQueueRef.current.length > 0) {
      return
    }

    const fromId = activeBallCardRef.current || prevId
    activeBallCardRef.current = currId

    if (fromId !== currId) {
      turnOrbQueueRef.current.push({ fromId, toId: currId })
      processNextOrb()
    }
  }, [highlightedCardId, processNextOrb])

  const handleOrbFinish = useCallback((orbId) => {
    setFlyingOrbs((prev) => {
      const orb = prev.find((o) => o.id === orbId)
      if (orb) {
        setVisualHighlightedCardId(orb.targetKey)
        setLandingCardId(orb.targetKey)
        setTimeout(() => setLandingCardId(null), 600)
      }
      return []
    })
    isOrbFlyingRef.current = false
    setTimeout(() => {
      processNextOrb()
    }, 20)
  }, [processNextOrb])

  const handleAdvanceTurn = useCallback(() => {
    if (!renderedCards || renderedCards.length === 0) return
    const isReversed = !!roomSettings.reverseTurnDirection || roomSettings.turnDirection === 'counter-clockwise'
    const ordered = getOrderedCards(renderedCards, isGridView, isReversed)
    if (ordered.length === 0) return

    const fromTarget = activeBallCardRef.current || highlightedCardId
    const currentIndex = ordered.findIndex(
      (c) => fromTarget === c.key || fromTarget === c.p1?.id || (c.p2 && fromTarget === c.p2?.id)
    )

    let nextCard
    if (currentIndex === -1) {
      nextCard = ordered[0]
    } else {
      const nextIndex = (currentIndex + 1) % ordered.length
      nextCard = ordered[nextIndex]
    }

    const toTarget = nextCard.key
    const fromId = fromTarget || ordered[0].key

    // Record turn duration in match history
    if (fromId) {
      const now = Date.now()
      const start = turnStartTimeRef.current || now
      const durationSeconds = Math.max(1, Math.round((now - start) / 1000))

      const endedCard = renderedCards.find((c) => c.key === fromId || c.p1?.id === fromId || (c.p2 && c.p2.id === fromId))
      const p1Obj = endedCard?.p1 || players.find((pl) => pl.id === fromId)
      const pName = endedCard?.isMerged ? `${endedCard.p1?.name || 'P1'} & ${endedCard.p2?.name || 'P2'}` : (p1Obj?.name || 'Player')
      const pColor = p1Obj?.color || '#fbbf24'

      setTurnHistory((prev) => {
        const turnIndex = prev.length + 1
        const activeC = Math.max(1, renderedCards.length || 1)
        const roundIndex = Math.floor((turnIndex - 1) / activeC) + 1

        const entry = {
          id: `${now}_${turnIndex}`,
          turnIndex,
          roundIndex,
          playerKey: fromId,
          playerName: pName,
          playerColor: pColor,
          durationSeconds,
          timestamp: now,
        }
        const updated = [...prev, entry]
        try { localStorage.setItem(`mtg_turnhistory_${sessionKey}`, JSON.stringify(updated)) } catch (_) {}
        return updated
      })

      turnStartTimeRef.current = now
    }

    activeBallCardRef.current = toTarget
    turnOrbQueueRef.current.push({ fromId, toId: toTarget })
    processNextOrb()

    setHighlightedCard(toTarget)
  }, [renderedCards, isGridView, roomSettings, highlightedCardId, setHighlightedCard, processNextOrb, players, sessionKey])

  const centerLongPressTimerRef = useRef(null)

  const handleCenterPointerDown = (e) => {
    if (e.target.closest('.radial-menu-overlay') || e.target.closest('.hub-mode-swap-badge')) return
    e.stopPropagation()
    const targetEl = e.currentTarget
    const startX = e.clientX
    const startY = e.clientY
    let isDragging = false
    let longPressTriggered = false

    if (centerHubMode === 'turn') {
      if (centerLongPressTimerRef.current) clearTimeout(centerLongPressTimerRef.current)
      centerLongPressTimerRef.current = setTimeout(() => {
        if (!isDragging) {
          longPressTriggered = true
          setCenterHubMode('menu')
        }
      }, 550)
    }

    const onPointerMove = (moveEvt) => {
      if (moveEvt.cancelable) moveEvt.preventDefault()
      const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY)
      if (dist > 6) {
        if (!isDragging) {
          isDragging = true
          if (centerLongPressTimerRef.current) {
            clearTimeout(centerLongPressTimerRef.current)
            centerLongPressTimerRef.current = null
          }
          if (centerHubMode === 'menu') {
            setCenterHubMode('turn')
            setMenuOpen(false)
          }
        }

        setTokenDragPos({ x: moveEvt.clientX, y: moveEvt.clientY })

        const el = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY)
        const cardWrapper = el?.closest('.player-card-wrapper')
        if (cardWrapper && cardWrapper.dataset.cardId) {
          setTokenHoverCardId(cardWrapper.dataset.cardId)
        } else {
          setTokenHoverCardId(null)
        }
      }
    }

    const onPointerUp = (upEvt) => {
      if (centerLongPressTimerRef.current) {
        clearTimeout(centerLongPressTimerRef.current)
        centerLongPressTimerRef.current = null
      }

      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      targetEl.removeEventListener('pointermove', onPointerMove)
      targetEl.removeEventListener('pointerup', onPointerUp)
      targetEl.removeEventListener('pointercancel', onPointerUp)
      try { targetEl.releasePointerCapture(upEvt.pointerId) } catch (_) {}

      if (isDragging) {
        const el = document.elementFromPoint(upEvt.clientX, upEvt.clientY)
        const cardWrapper = el?.closest('.player-card-wrapper')
        const droppedOnCenterHub = el?.closest('.center-hub')

        if (cardWrapper && cardWrapper.dataset.cardId) {
          const fromId = activeBallCardRef.current || highlightedCardId
          if (fromId && fromId !== cardWrapper.dataset.cardId) {
            const now = Date.now()
            const start = turnStartTimeRef.current || now
            const durationSeconds = Math.max(1, Math.round((now - start) / 1000))
            const endedCard = (renderedCards || []).find((c) => c.key === fromId || c.p1?.id === fromId || (c.p2 && c.p2.id === fromId))
            const p1Obj = endedCard?.p1 || (players || []).find((pl) => pl.id === fromId)
            const pName = endedCard?.isMerged ? `${endedCard.p1?.name || 'P1'} & ${endedCard.p2?.name || 'P2'}` : (p1Obj?.name || 'Player')
            const pColor = p1Obj?.color || '#fbbf24'

            setTurnHistory((prev) => {
              const turnIndex = prev.length + 1
              const activeC = Math.max(1, (renderedCards || []).length || 1)
              const roundIndex = Math.floor((turnIndex - 1) / activeC) + 1
              const entry = {
                id: `${now}_${turnIndex}`,
                turnIndex,
                roundIndex,
                playerKey: fromId,
                playerName: pName,
                playerColor: pColor,
                durationSeconds,
                timestamp: now,
              }
              const updated = [...prev, entry]
              try { localStorage.setItem(`mtg_turnhistory_${sessionKey}`, JSON.stringify(updated)) } catch (_) {}
              return updated
            })
            turnStartTimeRef.current = now
          }

          activeBallCardRef.current = cardWrapper.dataset.cardId
          setVisualHighlightedCardId(cardWrapper.dataset.cardId)
          setHighlightedCard(cardWrapper.dataset.cardId)
        } else if (droppedOnCenterHub && centerHubMode === 'turn') {
          setCenterHubMode('menu')
        }

        setTokenDragPos(null)
        setTokenHoverCardId(null)
      } else if (!longPressTriggered) {
        if (centerHubMode === 'menu') {
          setMenuOpen((prev) => !prev)
        } else {
          handleAdvanceTurn()
        }
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    targetEl.addEventListener('pointermove', onPointerMove, { passive: false })
    targetEl.addEventListener('pointerup', onPointerUp)
    targetEl.addEventListener('pointercancel', onPointerUp)
    try { targetEl.setPointerCapture(e.pointerId) } catch (_) {}
  }

  // Derived Game Log & Analytics Data
  const totalGameSeconds = Math.max(0, Math.floor((liveNow - gameStartTime) / 1000))
  const currentTurnLiveSeconds = Math.max(0, Math.floor((liveNow - turnStartTimeRef.current) / 1000))
  const activeTrackedCount = Math.max(1, (renderedCards && renderedCards.length) || (players && players.length) || 1)
  const currentRoundNumber = Math.floor(turnHistory.length / activeTrackedCount) + 1

  const totalTrackedTime = turnHistory.reduce((acc, t) => acc + (t.durationSeconds || 0), 0)
  const overallAvgTurnSeconds = turnHistory.length > 0 ? Math.round(totalTrackedTime / turnHistory.length) : 0

  const roundsGrouped = useMemo(() => {
    const map = new Map()
    for (const t of turnHistory) {
      const r = t.roundIndex || 1
      if (!map.has(r)) {
        map.set(r, { roundIndex: r, totalSeconds: 0, turns: [] })
      }
      const entry = map.get(r)
      entry.turns.push(t)
      entry.totalSeconds += (t.durationSeconds || 0)
    }
    return Array.from(map.values()).sort((a, b) => a.roundIndex - b.roundIndex)
  }, [turnHistory])

  const playerPaceList = useMemo(() => {
    const pMap = new Map()
    for (const t of turnHistory) {
      const key = t.playerKey || t.playerName
      if (!pMap.has(key)) {
        pMap.set(key, {
          key,
          name: t.playerName,
          color: t.playerColor,
          turnCount: 0,
          totalSeconds: 0,
          fastestSeconds: Infinity,
          slowestSeconds: -Infinity,
        })
      }
      const item = pMap.get(key)
      item.turnCount += 1
      item.totalSeconds += t.durationSeconds
      item.fastestSeconds = Math.min(item.fastestSeconds, t.durationSeconds)
      item.slowestSeconds = Math.max(item.slowestSeconds, t.durationSeconds)
    }

    const list = Array.from(pMap.values()).map((p) => ({
      ...p,
      avgSeconds: p.turnCount > 0 ? Math.round(p.totalSeconds / p.turnCount) : 0,
      fastestSeconds: p.fastestSeconds === Infinity ? 0 : p.fastestSeconds,
      slowestSeconds: p.slowestSeconds === -Infinity ? 0 : p.slowestSeconds,
    }))

    if (list.length >= 2) {
      let minAvg = Infinity
      let maxAvg = -Infinity
      for (const p of list) {
        if (p.avgSeconds < minAvg) minAvg = p.avgSeconds
        if (p.avgSeconds > maxAvg) maxAvg = p.avgSeconds
      }
      for (const p of list) {
        if (p.avgSeconds === minAvg && minAvg < maxAvg) p.isFastest = true
        if (p.avgSeconds === maxAvg && maxAvg > minAvg) p.isSlowest = true
      }
    }

    return list.sort((a, b) => b.totalSeconds - a.totalSeconds)
  }, [turnHistory])

  const handleCopyGameLogSummary = useCallback(() => {
    let text = `🏆 MTG Match Log - Room #${sessionKey}\n`
    text += `⏱️ Total Match Duration: ${formatClockTime(totalGameSeconds)} (${formatDuration(totalGameSeconds)})\n`
    text += `👑 Rounds Played: ${currentRoundNumber} | 🔄 Total Turns: ${turnHistory.length}\n`
    text += `⚡ Average Turn: ${formatDuration(overallAvgTurnSeconds)}\n\n`

    if (playerPaceList.length > 0) {
      text += `📊 PLAYER STATS:\n`
      for (const p of playerPaceList) {
        text += `• ${p.name}: ${p.turnCount} turns, Total ${formatDuration(p.totalSeconds)}, Avg ${formatDuration(p.avgSeconds)}/turn (Fastest ${formatDuration(p.fastestSeconds)}, Slowest ${formatDuration(p.slowestSeconds)})\n`
      }
      text += `\n`
    }

    if (roundsGrouped.length > 0) {
      text += `📜 ROUND BREAKDOWN:\n`
      for (const r of roundsGrouped) {
        text += `Round ${r.roundIndex} (Total: ${formatDuration(r.totalSeconds)}):\n`
        for (const t of r.turns) {
          text += `  - Turn ${t.turnIndex} (${t.playerName}): ${formatDuration(t.durationSeconds)}\n`
        }
      }
    }

    try { navigator.clipboard?.writeText(text) } catch (_) {}
    setGameLogCopied(true)
    setTimeout(() => setGameLogCopied(false), 2500)
  }, [sessionKey, totalGameSeconds, currentRoundNumber, turnHistory, overallAvgTurnSeconds, playerPaceList, roundsGrouped])

  const activeCurrentCard = (renderedCards || []).find((c) => (visualHighlightedCardId || highlightedCardId) === c.key || (visualHighlightedCardId || highlightedCardId) === c.p1?.id)
  const activeCurrentPlayerName = activeCurrentCard?.isMerged
    ? `${activeCurrentCard.p1?.name || 'P1'} & ${activeCurrentCard.p2?.name || 'P2'}`
    : (activeCurrentCard?.p1?.name || (players || []).find((pl) => pl.id === (visualHighlightedCardId || highlightedCardId))?.name || 'Current Player')
  const activeCurrentPlayerColor = activeCurrentCard?.p1?.color || '#fbbf24'

  return (
    <div
      className={`table-arena ${isGridView ? 'grid-mode' : ''}`}
      onPointerDown={handleTablePointerDownAction}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="table-ambient" />
      {/* Flying Turn Orb Animation Overlay */}
      <FlyingTurnOrbOverlay orbs={flyingOrbs} onOrbFinish={handleOrbFinish} />
      {enableLeylines && (
        <>
          <div className="leylines-bg" />
          {ripples.map((r) => (
            <div
              key={r.id}
              className="leyline-ripple"
              style={{ left: r.x, top: r.y }}
            />
          ))}
        </>
      )}

      {/* Persistent Top-Right Fullscreen Toggle when not in fullscreen */}
      {!isFullscreen && (
        <button
          type="button"
          className="topright-fullscreen-btn"
          onClick={toggleFullscreen}
          title="Enter Fullscreen"
          aria-label="Enter Fullscreen"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="topright-fullscreen-icon">⛶</span>
          <span className="topright-fullscreen-text">Fullscreen</span>
        </button>
      )}

      {/* Floating token clone when dragging */}
      {tokenDragPos && (
        <div
          className="grid-highlight-token-floating"
          style={{
            left: `${tokenDragPos.x}px`,
            top: `${tokenDragPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="grid-highlight-token is-dragging" />
        </div>
      )}

      {/* Cards Container (Supports Vertical Grid Scrolling) */}
      <div className={isGridView ? 'cards-grid-container' : 'cards-layer'}>
        <div
          className={isGridView ? 'cards-grid-content' : 'cards-layer-content'}
          style={isGridView && gridContentHeight ? { height: `${gridContentHeight}px` } : undefined}
        >
        {(() => {
          return renderedCards.map((item) => {
            const isDraggingThis = draggingPlayerIds.has(item.p1.id)
            const currentRotation = item.currentRotation !== undefined ? item.currentRotation : item.angle

          // -------------------------------------------------------------------
          // MERGED TEAM CARD
          // -------------------------------------------------------------------
          if (item.isMerged) {
            const { p1, p2 } = item
            const scale = item.scale || 1.0
            const cardWidth = Math.round(BASE_WIDTH * scale)
            const cardHeight = Math.round(BASE_HEIGHT * scale)
            const mergedWidth = Math.round(cardWidth * 1.95)

            const sides = normalizePlayerSides(p1)
            const faceState = getCardFaceState(item.key, sides)
            const { minIndex, maxIndex } = faceState
            const deathP1 = checkCardDeath(p1)
            const deathP2 = p2 ? checkCardDeath(p2) : { isDead: false }
            const deathMerged = deathP1.isDead ? deathP1 : (deathP2.isDead ? deathP2 : { isDead: false })

            const frontSide = sides.find((s) => s.index === faceState.frontIndex) || null
            const backSide = sides.find((s) => s.index === faceState.backIndex) || null

            const isFrontAddSide = !frontSide && (faceState.frontIndex > maxIndex || faceState.frontIndex < minIndex)
            const isBackAddSide = !backSide && (faceState.backIndex > maxIndex || faceState.backIndex < minIndex)

            const activeIndex = faceState.isShowingBack ? faceState.backIndex : faceState.frontIndex
            const activeSideObj = !faceState.isShowingBack ? frontSide : backSide
            const isSettingsOpen = openSettingsCardIds.has(item.key) || openSettingsCardIds.has(p1.id)
            const popoverTab = popoverActiveTabs[item.key] || popoverActiveTabs[p1.id] || null

            const frontColor = frontSide ? (frontSide.color || p1.color || '#fbbf24') : '#f59e0b'
            const backColor = backSide ? (backSide.color || p1.color || '#fbbf24') : '#f59e0b'

            const gridDragTransform = isDraggingThis && localDragPositions[p1.id]
              ? `translate(${localDragPositions[p1.id].x}px, ${localDragPositions[p1.id].y}px)`
              : 'none'

            const isRenamingP1 = renamingTarget?.type === 'player' && renamingTarget?.id === p1.id
            const isRenamingP2 = renamingTarget?.type === 'player' && renamingTarget?.id === p2.id
            const isRenamingFrontSide = renamingTarget?.type === 'side' && renamingTarget?.playerId === p1.id && renamingTarget?.sideIndex === faceState.frontIndex
            const isRenamingBackSide = renamingTarget?.type === 'side' && renamingTarget?.playerId === p1.id && renamingTarget?.sideIndex === faceState.backIndex

            const activeHighlightId = visualHighlightedCardId || highlightedCardId
            const isHighlighted = activeHighlightId === item.key || activeHighlightId === p1.id || (p2 && activeHighlightId === p2.id)
            const isHoverDrop = tokenHoverCardId === item.key || tokenHoverCardId === p1.id || (p2 && tokenHoverCardId === p2.id)
            const isGridHoverDrop = isGridView && (gridHoverTargetId === p1.id || (p2 && gridHoverTargetId === p2.id))
            const spawnDelayMs = spawningCardMap[item.key] ?? spawningCardMap[p1.id] ?? (p2 ? spawningCardMap[p2.id] : undefined)
            const isSpawning = spawnDelayMs !== undefined

            const frontStyles = getActiveStyles(frontSide, p1)
            const backStyles = getActiveStyles(backSide, p1)

            return (
              <div
                id={`player-card-wrapper-${p1.id}`}
                key={item.key}
                data-card-id={item.key}
                className={`player-card-wrapper merged-wrapper ${isSpawning ? 'card-flying-in' : ''} ${isDraggingThis ? 'is-dragging dragging-preview' : ''} ${isGridView ? 'in-grid' : ''} ${isGridHoverDrop ? 'grid-drop-target-hover' : ''} ${isHighlighted ? 'is-card-highlighted' : ''} ${isHoverDrop ? 'highlight-drop-hover' : ''}`}
                style={{
                  width: `${mergedWidth}px`,
                  height: `${cardHeight}px`,
                  transform: isGridView
                    ? `translate(-50%, 0) translate(${item.x}px, ${item.y}px) rotate(${currentRotation}deg)`
                    : `translate(-50%, -50%) translate(${item.x}px, ${item.y}px) rotate(${currentRotation}deg) rotate(180deg)`,
                  '--target-x': `${item.x}px`,
                  '--target-y': `${item.y}px`,
                  '--target-rot': `${isGridView ? currentRotation : currentRotation + 180}deg`,
                  '--card-border-color': frontColor,
                  '--spawn-delay': `${spawnDelayMs || 0}ms`,
                  zIndex: isDraggingThis ? 100 : 15,
                }}
                onAnimationEnd={(e) => {
                  if (e.animationName && e.animationName.includes('cardFlyIn')) {
                    handleCardSpawnEnd(item.key)
                    if (item.p1) handleCardSpawnEnd(item.p1.id)
                    if (item.p2) handleCardSpawnEnd(item.p2.id)
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Landing Turn Shockwave Ring */}
                {(landingCardId === item.key || landingCardId === p1.id || (p2 && landingCardId === p2.id)) && (
                  <div className="orb-impact-ring" />
                )}

                {/* Popover at wrapper level */}
                {isSettingsOpen && activeSideObj && (
                  <div className="card-settings-popover center-popover" onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" className="popover-item unmerge-item" onClick={() => { closeCardSettings(item.key); unmergePlayer(p1.id) }}>
                      <span>✂️ Unmerge Team</span>
                    </button>
                    {activeIndex === 0 ? (
                      <>
                        <button type="button" className="popover-item" onClick={() => { closeCardSettings(item.key); setRenamingTarget({ type: 'player', id: p1.id }); setRenameValue(p1.name) }}>
                          <span>✏️ Rename Left</span>
                        </button>
                        <button type="button" className="popover-item" onClick={() => { closeCardSettings(item.key); setRenamingTarget({ type: 'player', id: p2.id }); setRenameValue(p2.name) }}>
                          <span>✏️ Rename Right</span>
                        </button>
                      </>
                    ) : (
                      <button type="button" className="popover-item" onClick={() => {
                        closeCardSettings(item.key)
                        setRenamingTarget({ type: 'side', playerId: p1.id, sideIndex: activeIndex })
                        setRenameValue(activeSideObj.label || '')
                      }}>
                        <span>✏️ Rename Side</span>
                      </button>
                    )}

                    {/* Foldout 1: Card Size */}
                    <button
                      type="button"
                      className={`popover-foldout-header ${popoverTab === 'size' ? 'is-open' : ''}`}
                      onClick={() => toggleCardPopoverTab(item.key, 'size')}
                    >
                      <span>📏 Card Size</span>
                      <span className="foldout-header-arrow">{popoverTab === 'size' ? '▾' : '▸'}</span>
                    </button>
                    {popoverTab === 'size' && (
                      <div className="popover-foldout-body card-size-section">
                        <div className="card-size-controls">
                          <button
                            type="button"
                            className="size-step-btn"
                            onClick={() => updateCardScale(item.key, scale - 0.1)}
                            title="Decrease Size"
                          >
                            &minus;
                          </button>
                          <span
                            className="size-percent-badge"
                            onClick={() => updateCardScale(item.key, 1.0)}
                            title="Reset to 100%"
                          >
                            {Math.round(scale * 100)}%
                          </span>
                          <button
                            type="button"
                            className="size-step-btn"
                            onClick={() => updateCardScale(item.key, scale + 0.1)}
                            title="Increase Size"
                          >
                            &#43;
                          </button>
                        </div>
                        <div className="size-presets-row">
                          {[
                            { label: 'S', val: 0.75 },
                            { label: 'M', val: 1.0 },
                            { label: 'L', val: 1.25 },
                            { label: 'XL', val: 1.5 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              className={`size-preset-pill ${Math.abs(scale - preset.val) < 0.06 ? 'active' : ''}`}
                              onClick={() => updateCardScale(item.key, preset.val)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Foldout 2: Design & Borders */}
                    <button
                      type="button"
                      className={`popover-foldout-header ${popoverTab === 'design' ? 'is-open' : ''}`}
                      onClick={() => toggleCardPopoverTab(item.key, 'design')}
                    >
                      <span>🎨 Design & Style</span>
                      <span className="foldout-header-arrow">{popoverTab === 'design' ? '▾' : '▸'}</span>
                    </button>
                    {popoverTab === 'design' && (
                      <div className="popover-foldout-body design-foldout-section">
                        <div className="design-subgroup">
                          <span className="popover-mini-title">Frame Color</span>
                          <div className="color-swatches">
                            {MTG_COLORS.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                className="color-dot"
                                style={{ backgroundColor: c.border, borderColor: activeSideObj.color === c.border ? '#ffffff' : 'transparent' }}
                                onClick={() => {
                                  updateSide(p1.id, activeIndex, { color: c.border })
                                  updatePlayer(p2.id, { color: c.border })
                                }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="design-subgroup">
                          <span className="popover-mini-title">Active Styles / Foils</span>
                          <div className="border-styles-grid">
                            {CARD_BORDER_STYLES.map((b) => {
                              const activeStyles = getActiveStyles(activeSideObj, p1)
                              const isSelected = activeStyles.includes(b.id)
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  className={`border-style-pill ${isSelected ? 'is-selected' : ''}`}
                                  onClick={() => {
                                    const nextStyles = isSelected
                                      ? activeStyles.filter((id) => id !== b.id)
                                      : [...activeStyles, b.id]
                                    updateSide(p1.id, activeIndex, { borderStyles: nextStyles, borderStyle: nextStyles[0] || 'standard' })
                                    updatePlayer(p1.id, { borderStyles: nextStyles, borderStyle: nextStyles[0] || 'standard' })
                                    if (p2) {
                                      updatePlayer(p2.id, { borderStyles: nextStyles, borderStyle: nextStyles[0] || 'standard' })
                                    }
                                  }}
                                  title={`${b.name} - ${b.desc}`}
                                >
                                  <span className="border-style-emoji">{b.icon}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <button type="button" className="popover-item" onClick={() => { setArtSearchTarget({ playerId: p1.id, sideIndex: activeIndex }); closeCardSettings(item.key) }}>
                      <span>🖼️ Choose MTG Art</span>
                    </button>
                    {activeSideObj.bgImage && (
                      <button type="button" className="popover-item" onClick={() => { updateSide(p1.id, activeIndex, { bgImage: null }); closeCardSettings(item.key) }}>
                        <span>✖️ Remove Art</span>
                      </button>
                    )}

                    {activeIndex !== 0 && (
                      <button type="button" className="popover-item remove-item" onClick={() => {
                        showConfirm({
                          title: 'Delete Side',
                          message: 'Are you sure you want to delete this side counter?',
                          danger: true,
                          icon: '🗑️',
                          confirmText: 'Delete Side',
                          onConfirm: () => {
                            removeSide(p1.id, activeIndex)
                            closeCardSettings(item.key)
                          },
                        })
                      }}>
                        <span>🗑️ Delete This Side</span>
                      </button>
                    )}

                    <button type="button" className="popover-item remove-item" onClick={() => {
                      showConfirm({
                        title: 'Remove Team',
                        message: `Are you sure you want to remove ${p1.name} & ${p2?.name || 'Partner'}? Both players will be removed from the game.`,
                        danger: true,
                        icon: '🗑️',
                        confirmText: 'Remove Team',
                        onConfirm: () => {
                          closeCardSettings(item.key)
                          removePlayer(p1.id)
                          if (p2) removePlayer(p2.id)
                        },
                      })
                    }}>
                      <span>🗑️ Remove Team</span>
                    </button>
                  </div>
                )}

                {/* 3D Double-Sided Flipper with Smooth Sway Container */}
                <div className="card-sway-container">
                  <div
                    className="card-3d-flipper"
                    style={{ transform: `rotateY(${faceState.flipAngle}deg)` }}
                    onTouchStart={(e) => handleTouchStartCard(item.key, e)}
                    onTouchEnd={(e) => handleTouchEndCard(item.key, sides, currentRotation, e)}
                    onTouchCancel={() => handleTouchCancelCard(item.key)}
                  >
                  {/* FRONT FACE */}
                  <div
                    className={`mtg-card-face face-front merged-card ${frontStyles.map((s) => `card-border-${s}`).join(' ')} ${frontStyles.includes('neon-cyber') ? 'has-style-neon' : ''} ${isFrontAddSide ? 'add-side-card-face' : ''}`}
                    style={{
                      borderColor: frontColor,
                      '--card-border-color': frontColor,
                      pointerEvents: faceState.isShowingBack ? 'none' : 'auto',
                      zIndex: faceState.isShowingBack ? 1 : 2,
                    }}
                  >
                    <div className="ripple-mount-point" />
                    <CardBorderOrnaments activeStyles={frontStyles} borderColor={frontColor} />
                    {frontSide && frontSide.bgImage && (
                      <>
                        <div
                          className={`card-art-bg-layer ${faceState.frontIndex !== 0 ? 'extra-side-art-bg' : ''}`}
                          style={{ backgroundImage: `url("${frontSide.bgImage}")` }}
                        />
                        <div
                          className={`card-art-overlay ${faceState.frontIndex !== 0 ? 'extra-side-art-overlay' : ''}`}
                        />
                      </>
                    )}

                    <div
                      className="card-top-bar merged-top-bar"
                      onPointerDown={(e) => handleStartCardDrag(p1, item.key, true, scale, item.x, item.y, currentRotation, e)}
                    >
                      <div className="player-title-col left-title">
                        {isRenamingP1 ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-form">
                            <input
                              type="text"
                              autoFocus
                              value={renameValue}
                              maxLength={18}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={handleSaveRename}
                              className="rename-input"
                            />
                          </form>
                        ) : (
                          <span className="player-name-label" style={{ color: frontColor }}>{p1.name}</span>
                        )}
                      </div>

                      {!isFrontAddSide ? (
                        <button
                          type="button"
                          className={`card-settings-btn ${isSettingsOpen ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCardSettings(item.key)
                          }}
                          aria-label="Team Settings"
                        >
                          ⚙
                        </button>
                      ) : (
                        <div className="merged-top-spacer" />
                      )}

                      <div className="player-title-col right-title">
                        {isRenamingP2 ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-form">
                            <input
                              type="text"
                              autoFocus
                              value={renameValue}
                              maxLength={18}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={handleSaveRename}
                              className="rename-input"
                            />
                          </form>
                        ) : (
                          <span className="player-name-label" style={{ color: frontColor }}>{p2.name}</span>
                        )}
                      </div>
                    </div>

                    {isFrontAddSide ? (
                      <div
                        className="add-side-prompt-body"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddSideTarget({ playerId: p1.id, cardKey: item.key, targetIndex: faceState.frontIndex })
                        }}
                      >
                        <button
                          type="button"
                          className="add-side-plus-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddSideTarget({ playerId: p1.id, cardKey: item.key, targetIndex: faceState.frontIndex })
                          }}
                        >
                          <span className="add-side-big-plus">&#43;</span>
                          <span className="add-side-caption">
                            {faceState.frontIndex < 0 ? 'Add Left Side' : 'Add Right Side'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="card-body team-card-body">
                          <button
                            type="button"
                            className="touch-zone minus-zone"
                            onPointerDown={(e) => handleStepPointerDown(p1.id, -1, faceState.frontIndex, e)}
                            onPointerMove={handleStepPointerMove}
                            onPointerUp={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.frontIndex, e)}
                            onPointerLeave={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.frontIndex, e)}
                            onPointerCancel={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.frontIndex, e)}
                            aria-label="Decrease counter by 1 (Hold for 10)"
                          >
                            <span className="zone-sign" style={{ color: frontColor }}>&minus;</span>
                            {floatingDeltas[`${p1.id}_${faceState.frontIndex}`] && floatingDeltas[`${p1.id}_${faceState.frontIndex}`].delta < 0 && (
                              <span
                                key={floatingDeltas[`${p1.id}_${faceState.frontIndex}`].seq}
                                className="floating-delta-number is-negative"
                              >
                                {floatingDeltas[`${p1.id}_${faceState.frontIndex}`].sign}
                              </span>
                            )}
                          </button>
                          <div className="counter-column-center">
                            <div className="life-number team-life-number" style={{ fontSize: getLifeFontSize(frontSide?.value, mergedWidth, numberScale, true) }}>
                              {frontSide?.value ?? 0}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="touch-zone plus-zone"
                            onPointerDown={(e) => handleStepPointerDown(p1.id, 1, faceState.frontIndex, e)}
                            onPointerMove={handleStepPointerMove}
                            onPointerUp={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.frontIndex, e)}
                            onPointerLeave={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.frontIndex, e)}
                            onPointerCancel={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.frontIndex, e)}
                            aria-label="Increase counter by 1 (Hold for 10)"
                          >
                            <span className="zone-sign" style={{ color: frontColor }}>&#43;</span>
                            {floatingDeltas[`${p1.id}_${faceState.frontIndex}`] && floatingDeltas[`${p1.id}_${faceState.frontIndex}`].delta > 0 && (
                              <span
                                key={floatingDeltas[`${p1.id}_${faceState.frontIndex}`].seq}
                                className="floating-delta-number is-positive"
                              >
                                {floatingDeltas[`${p1.id}_${faceState.frontIndex}`].sign}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Anchored Bottom Row */}
                        <div className="panel-bottom-badge-row">
                          {faceState.frontIndex === 0 ? (
                            sides.filter((s) => s.index !== 0).length > 0 ? (
                              <div className="main-side-counters-summary">
                                {sides.filter((s) => s.index !== 0).map((s) => (
                                  <span
                                    key={s.id || s.index}
                                    className="mini-counter-pill"
                                    style={{ color: s.color || '#38bdf8' }}
                                  >
                                    <span className="mini-counter-label">{s.label || `Side ${s.index}`}:</span>
                                    <span className="mini-counter-val">{s.value ?? 0}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null
                          ) : (
                            isRenamingFrontSide ? (
                              <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-side-badge-form">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Side name..."
                                  value={renameValue}
                                  maxLength={18}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onBlur={handleSaveRename}
                                  className="rename-side-badge-input"
                                />
                              </form>
                            ) : (
                              <span className="bottom-side-badge" style={{ color: frontColor, borderColor: `${frontColor}70` }}>
                                {frontSide?.label || 'Counter'}
                              </span>
                            )
                          )}
                        </div>
                      </>
                    )}

                    {/* Death Screen Overlay */}
                    {deathMerged.isDead && (
                      <div className="card-death-overlay merged-death" onPointerDown={(e) => e.stopPropagation()}>
                        <span className="death-skull-icon">💀</span>
                        <span className="death-banner">DEFEATED</span>
                        <span className="death-reason">{deathMerged.reason}</span>
                        <div className="death-actions-row">
                          <button
                            type="button"
                            className="death-revive-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRevivePlayer(p1.id)
                              if (p2) handleRevivePlayer(p2.id)
                            }}
                          >
                            &#43; Revive Team
                          </button>
                        </div>
                      </div>
                    )}

                    {hasMouse && !isDraggingThis && (
                      <>
                        {faceState.frontIndex > minIndex - 1 && (
                          <button type="button" className="mouse-corner-btn bottom-left" onClick={() => flipCardToSide(item.key, sides, -1)}>&lsaquo;</button>
                        )}
                        {faceState.frontIndex < maxIndex + 1 && (
                          <button type="button" className="mouse-corner-btn bottom-right" onClick={() => flipCardToSide(item.key, sides, 1)}>&rsaquo;</button>
                        )}
                      </>
                    )}
                  </div>

                  {/* BACK FACE */}
                  <div
                    className={`mtg-card-face face-back merged-card ${backStyles.map((s) => `card-border-${s}`).join(' ')} ${backStyles.includes('neon-cyber') ? 'has-style-neon' : ''} ${isBackAddSide ? 'add-side-card-face' : ''}`}
                    style={{
                      borderColor: backColor,
                      '--card-border-color': backColor,
                      pointerEvents: !faceState.isShowingBack ? 'none' : 'auto',
                      zIndex: !faceState.isShowingBack ? 1 : 2,
                    }}
                  >
                    <div className="ripple-mount-point" />
                    <CardBorderOrnaments activeStyles={backStyles} borderColor={backColor} />
                    {backSide && backSide.bgImage && (
                      <>
                        <div
                          className={`card-art-bg-layer ${faceState.backIndex !== 0 ? 'extra-side-art-bg' : ''}`}
                          style={{ backgroundImage: `url("${backSide.bgImage}")` }}
                        />
                        <div
                          className={`card-art-overlay ${faceState.backIndex !== 0 ? 'extra-side-art-overlay' : ''}`}
                        />
                      </>
                    )}

                    <div
                      className="card-top-bar merged-top-bar"
                      onPointerDown={(e) => handleStartCardDrag(p1, item.key, true, scale, item.x, item.y, currentRotation, e)}
                    >
                      <div className="player-title-col left-title">
                        <span className="player-name-label" style={{ color: backColor }}>{p1.name}</span>
                      </div>

                      {!isBackAddSide ? (
                        <button
                          type="button"
                          className={`card-settings-btn ${isSettingsOpen ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleCardSettings(item.key) }}
                          aria-label="Team Settings"
                        >
                          ⚙
                        </button>
                      ) : (
                        <div className="merged-top-spacer" />
                      )}

                      <div className="player-title-col right-title">
                        <span className="player-name-label" style={{ color: backColor }}>{p2.name}</span>
                      </div>
                    </div>

                    {isBackAddSide ? (
                      <div
                        className="add-side-prompt-body"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddSideTarget({ playerId: p1.id, cardKey: item.key, targetIndex: faceState.backIndex })
                        }}
                      >
                        <button
                          type="button"
                          className="add-side-plus-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddSideTarget({ playerId: p1.id, cardKey: item.key, targetIndex: faceState.backIndex })
                          }}
                        >
                          <span className="add-side-big-plus">&#43;</span>
                          <span className="add-side-caption">
                            {faceState.backIndex < 0 ? 'Add Left Side' : 'Add Right Side'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="card-body team-card-body">
                          <button
                            type="button"
                            className="touch-zone minus-zone"
                            onPointerDown={(e) => handleStepPointerDown(p1.id, -1, faceState.backIndex, e)}
                            onPointerMove={handleStepPointerMove}
                            onPointerUp={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.backIndex, e)}
                            onPointerLeave={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.backIndex, e)}
                            onPointerCancel={(e) => handleStepPointerUpOrLeave(p1.id, -1, faceState.backIndex, e)}
                            aria-label="Decrease counter by 1 (Hold for 10)"
                          >
                            <span className="zone-sign" style={{ color: backColor }}>&minus;</span>
                            {floatingDeltas[`${p1.id}_${faceState.backIndex}`] && floatingDeltas[`${p1.id}_${faceState.backIndex}`].delta < 0 && (
                              <span
                                key={floatingDeltas[`${p1.id}_${faceState.backIndex}`].seq}
                                className="floating-delta-number is-negative"
                              >
                                {floatingDeltas[`${p1.id}_${faceState.backIndex}`].sign}
                              </span>
                            )}
                          </button>
                          <div className="counter-column-center">
                            <div className="life-number team-life-number" style={{ fontSize: getLifeFontSize(backSide?.value, mergedWidth, numberScale, true) }}>
                              {backSide?.value ?? 0}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="touch-zone plus-zone"
                            onPointerDown={(e) => handleStepPointerDown(p1.id, 1, faceState.backIndex, e)}
                            onPointerMove={handleStepPointerMove}
                            onPointerUp={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.backIndex, e)}
                            onPointerLeave={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.backIndex, e)}
                            onPointerCancel={(e) => handleStepPointerUpOrLeave(p1.id, 1, faceState.backIndex, e)}
                            aria-label="Increase counter by 1 (Hold for 10)"
                          >
                            <span className="zone-sign" style={{ color: backColor }}>&#43;</span>
                            {floatingDeltas[`${p1.id}_${faceState.backIndex}`] && floatingDeltas[`${p1.id}_${faceState.backIndex}`].delta > 0 && (
                              <span
                                key={floatingDeltas[`${p1.id}_${faceState.backIndex}`].seq}
                                className="floating-delta-number is-positive"
                              >
                                {floatingDeltas[`${p1.id}_${faceState.backIndex}`].sign}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Anchored Bottom Row */}
                        <div className="panel-bottom-badge-row">
                          {faceState.backIndex === 0 ? (
                            sides.filter((s) => s.index !== 0).length > 0 ? (
                              <div className="main-side-counters-summary">
                                {sides.filter((s) => s.index !== 0).map((s) => (
                                  <span
                                    key={s.id || s.index}
                                    className="mini-counter-pill"
                                    style={{ color: s.color || '#38bdf8' }}
                                  >
                                    <span className="mini-counter-label">{s.label || `Side ${s.index}`}:</span>
                                    <span className="mini-counter-val">{s.value ?? 0}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null
                          ) : (
                            isRenamingBackSide ? (
                              <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-side-badge-form">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Side name..."
                                  value={renameValue}
                                  maxLength={18}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onBlur={handleSaveRename}
                                  className="rename-side-badge-input"
                                />
                              </form>
                            ) : (
                              <span className="bottom-side-badge" style={{ color: backColor, borderColor: `${backColor}70` }}>
                                {backSide?.label || 'Counter'}
                              </span>
                            )
                          )}
                        </div>
                      </>
                    )}

                    {/* Death Screen Overlay */}
                    {deathMerged.isDead && (
                      <div className="card-death-overlay merged-death" onPointerDown={(e) => e.stopPropagation()}>
                        <span className="death-skull-icon">💀</span>
                        <span className="death-banner">DEFEATED</span>
                        <span className="death-reason">{deathMerged.reason}</span>
                        <div className="death-actions-row">
                          <button
                            type="button"
                            className="death-revive-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRevivePlayer(p1.id)
                              if (p2) handleRevivePlayer(p2.id)
                            }}
                          >
                            &#43; Revive Team
                          </button>
                        </div>
                      </div>
                    )}

                    {hasMouse && !isDraggingThis && (
                      <>
                        {faceState.backIndex > minIndex - 1 && (
                          <button type="button" className="mouse-corner-btn bottom-left" onClick={() => flipCardToSide(item.key, sides, -1)}>&lsaquo;</button>
                        )}
                        {faceState.backIndex < maxIndex + 1 && (
                          <button type="button" className="mouse-corner-btn bottom-right" onClick={() => flipCardToSide(item.key, sides, 1)}>&rsaquo;</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                </div>
              </div>
            )
          }

          // -------------------------------------------------------------------
          // STANDALONE SINGLE CARD
          // -------------------------------------------------------------------
          const player = item.p1
          const scale = item.scale || 1.0
          const cardWidth = Math.round(BASE_WIDTH * scale)
          const cardHeight = Math.round(BASE_HEIGHT * scale)

          const sides = normalizePlayerSides(player)
          const faceState = getCardFaceState(player.id, sides)
          const { minIndex, maxIndex } = faceState
          const deathPlayer = checkCardDeath(player)

          const frontSide = sides.find((s) => s.index === faceState.frontIndex) || null
          const backSide = sides.find((s) => s.index === faceState.backIndex) || null

          const isFrontAddSide = !frontSide && (faceState.frontIndex > maxIndex || faceState.frontIndex < minIndex)
          const isBackAddSide = !backSide && (faceState.backIndex > maxIndex || faceState.backIndex < minIndex)

          const activeIndex = faceState.isShowingBack ? faceState.backIndex : faceState.frontIndex
          const activeSideObj = !faceState.isShowingBack ? frontSide : backSide
          const isSettingsOpen = openSettingsCardIds.has(player.id) || openSettingsCardIds.has(item.key)
          const popoverTab = popoverActiveTabs[player.id] || popoverActiveTabs[item.key] || null
          const isHoverMergeTarget = hoverMergeTargetId === player.id || (draggingPlayerIds.has(player.id) && !!hoverMergeTargetId)

          const frontColor = frontSide ? (frontSide.color || player.color || '#fbbf24') : '#f59e0b'
          const backColor = backSide ? (backSide.color || player.color || '#fbbf24') : '#f59e0b'

          const frontStyles = getActiveStyles(frontSide, player)
          const backStyles = getActiveStyles(backSide, player)

          const gridDragTransform = isDraggingThis && localDragPositions[player.id]
            ? `translate(${localDragPositions[player.id].x}px, ${localDragPositions[player.id].y}px)`
            : 'none'

          const isRenamingPlayer = renamingTarget?.type === 'player' && renamingTarget?.id === player.id
          const isRenamingFrontSide = renamingTarget?.type === 'side' && renamingTarget?.playerId === player.id && renamingTarget?.sideIndex === faceState.frontIndex
          const isRenamingBackSide = renamingTarget?.type === 'side' && renamingTarget?.playerId === player.id && renamingTarget?.sideIndex === faceState.backIndex

          const activeHighlightId = visualHighlightedCardId || highlightedCardId
          const isHighlighted = activeHighlightId === item.key || activeHighlightId === player.id
          const isHoverDrop = tokenHoverCardId === item.key || tokenHoverCardId === player.id
          const isGridHoverDrop = isGridView && gridHoverTargetId === player.id
          const spawnDelayMs = spawningCardMap[item.key] ?? spawningCardMap[player.id]
          const isSpawning = spawnDelayMs !== undefined

          return (
            <div
              id={`player-card-wrapper-${player.id}`}
              key={player.id}
              data-card-id={player.id}
              className={`player-card-wrapper ${isSpawning ? 'card-flying-in' : ''} ${isHoverMergeTarget ? 'merge-target-hover' : ''} ${isDraggingThis ? 'is-dragging' : ''} ${isGridView ? 'in-grid' : ''} ${isGridHoverDrop ? 'grid-drop-target-hover' : ''} ${isHighlighted ? 'is-card-highlighted' : ''} ${isHoverDrop ? 'highlight-drop-hover' : ''}`}
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                transform: isGridView
                  ? `translate(-50%, 0) translate(${item.x}px, ${item.y}px) rotate(${currentRotation}deg)`
                  : `translate(-50%, -50%) translate(${item.x}px, ${item.y}px) rotate(${currentRotation}deg) rotate(180deg)`,
                '--target-x': `${item.x}px`,
                '--target-y': `${item.y}px`,
                '--target-rot': `${isGridView ? currentRotation : currentRotation + 180}deg`,
                '--card-border-color': frontColor,
                '--spawn-delay': `${spawnDelayMs || 0}ms`,
                zIndex: isDraggingThis ? 100 : 10,
              }}
              onAnimationEnd={(e) => {
                if (e.animationName && e.animationName.includes('cardFlyIn')) {
                  handleCardSpawnEnd(item.key)
                  if (item.p1) handleCardSpawnEnd(item.p1.id)
                  if (player) handleCardSpawnEnd(player.id)
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Landing Turn Shockwave Ring */}
              {(landingCardId === player.id || landingCardId === item.key) && (
                <div className="orb-impact-ring" />
              )}

              {/* Popover at wrapper level */}
              {isSettingsOpen && activeSideObj && (
                <div className="card-settings-popover" onPointerDown={(e) => e.stopPropagation()}>
                  {activeIndex === 0 ? (
                    <button type="button" className="popover-item" onClick={() => { closeCardSettings(player.id); setRenamingTarget({ type: 'player', id: player.id }); setRenameValue(player.name) }}>
                      <span>✏️ Rename Player</span>
                    </button>
                  ) : (
                    <button type="button" className="popover-item" onClick={() => {
                      closeCardSettings(player.id)
                      setRenamingTarget({ type: 'side', playerId: player.id, sideIndex: activeIndex })
                      setRenameValue(activeSideObj.label || '')
                    }}>
                      <span>✏️ Rename Side</span>
                    </button>
                  )}

                  {/* Foldout 1: Card Size */}
                  <button
                    type="button"
                    className={`popover-foldout-header ${popoverTab === 'size' ? 'is-open' : ''}`}
                    onClick={() => toggleCardPopoverTab(player.id, 'size')}
                  >
                    <span>📏 Card Size</span>
                    <span className="foldout-header-arrow">{popoverTab === 'size' ? '▾' : '▸'}</span>
                  </button>
                  {popoverTab === 'size' && (
                    <div className="popover-foldout-body card-size-section">
                      <div className="card-size-controls">
                        <button
                          type="button"
                          className="size-step-btn"
                          onClick={() => updateCardScale(player.id, scale - 0.1)}
                          title="Decrease Size"
                        >
                          &minus;
                        </button>
                        <span
                          className="size-percent-badge"
                          onClick={() => updateCardScale(player.id, 1.0)}
                          title="Reset to 100%"
                        >
                          {Math.round(scale * 100)}%
                        </span>
                        <button
                          type="button"
                          className="size-step-btn"
                          onClick={() => updateCardScale(player.id, scale + 0.1)}
                          title="Increase Size"
                        >
                          &#43;
                        </button>
                      </div>
                      <div className="size-presets-row">
                        {[
                          { label: 'S', val: 0.75 },
                          { label: 'M', val: 1.0 },
                          { label: 'L', val: 1.25 },
                          { label: 'XL', val: 1.5 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className={`size-preset-pill ${Math.abs(scale - preset.val) < 0.06 ? 'active' : ''}`}
                            onClick={() => updateCardScale(player.id, preset.val)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Foldout 2: Design & Borders */}
                  <button
                    type="button"
                    className={`popover-foldout-header ${popoverTab === 'design' ? 'is-open' : ''}`}
                    onClick={() => toggleCardPopoverTab(player.id, 'design')}
                  >
                    <span>🎨 Design & Style</span>
                    <span className="foldout-header-arrow">{popoverTab === 'design' ? '▾' : '▸'}</span>
                  </button>
                  {popoverTab === 'design' && (
                    <div className="popover-foldout-body design-foldout-section">
                      <div className="design-subgroup">
                        <span className="popover-mini-title">Frame Color</span>
                        <div className="color-swatches">
                          {MTG_COLORS.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              className="color-dot"
                              style={{ backgroundColor: c.border, borderColor: activeSideObj.color === c.border ? '#ffffff' : 'transparent' }}
                              onClick={() => updateSide(player.id, activeIndex, { color: c.border })}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="design-subgroup">
                        <span className="popover-mini-title">Active Styles / Foils</span>
                        <div className="border-styles-grid">
                          {CARD_BORDER_STYLES.map((b) => {
                            const activeStyles = getActiveStyles(activeSideObj, player)
                            const isSelected = activeStyles.includes(b.id)
                            return (
                              <button
                                key={b.id}
                                type="button"
                                className={`border-style-pill ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => {
                                  const nextStyles = isSelected
                                    ? activeStyles.filter((id) => id !== b.id)
                                    : [...activeStyles, b.id]
                                  updateSide(player.id, activeIndex, { borderStyles: nextStyles, borderStyle: nextStyles[0] || 'standard' })
                                  updatePlayer(player.id, { borderStyles: nextStyles, borderStyle: nextStyles[0] || 'standard' })
                                }}
                                title={`${b.name} - ${b.desc}`}
                              >
                                <span className="border-style-emoji">{b.icon}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="button" className="popover-item" onClick={() => { setArtSearchTarget({ playerId: player.id, sideIndex: activeIndex }); closeCardSettings(player.id) }}>
                    <span>🖼️ Choose MTG Art</span>
                  </button>

                  {activeSideObj.bgImage && (
                    <button type="button" className="popover-item" onClick={() => { updateSide(player.id, activeIndex, { bgImage: null }); closeCardSettings(player.id) }}>
                      <span>✖️ Remove Art</span>
                    </button>
                  )}

                  {activeIndex !== 0 && (
                    <button type="button" className="popover-item remove-item" onClick={() => {
                      showConfirm({
                        title: 'Delete Side',
                        message: 'Are you sure you want to delete this side counter?',
                        danger: true,
                        icon: '🗑️',
                        confirmText: 'Delete Side',
                        onConfirm: () => {
                          removeSide(player.id, activeIndex)
                          closeCardSettings(player.id)
                        },
                      })
                    }}>
                      <span>🗑️ Delete This Side</span>
                    </button>
                  )}

                  <button type="button" className="popover-item remove-item" onClick={() => {
                    showConfirm({
                      title: 'Remove Player',
                      message: `Are you sure you want to remove ${player.name}?`,
                      danger: true,
                      icon: '🗑️',
                      confirmText: 'Remove Player',
                      onConfirm: () => {
                        removePlayer(player.id)
                        closeCardSettings(player.id)
                      },
                    })
                  }}>
                    <span>🗑️ Remove Player</span>
                  </button>
                </div>
              )}

              {/* 3D Double-Sided Flipper with Smooth Sway Container */}
              <div className="card-sway-container">
                <div
                  className="card-3d-flipper"
                  style={{ transform: `rotateY(${faceState.flipAngle}deg)` }}
                  onTouchStart={(e) => handleTouchStartCard(player.id, e)}
                  onTouchEnd={(e) => handleTouchEndCard(player.id, sides, currentRotation, e)}
                  onTouchCancel={() => handleTouchCancelCard(player.id)}
                >
                {/* FRONT FACE */}
                <div
                  className={`mtg-card-face face-front ${frontStyles.map((s) => `card-border-${s}`).join(' ')} ${frontStyles.includes('neon-cyber') ? 'has-style-neon' : ''} ${isFrontAddSide ? 'add-side-card-face' : ''}`}
                  style={{
                    borderColor: isHoverMergeTarget ? '#f59e0b' : frontColor,
                    '--card-border-color': frontColor,
                    pointerEvents: faceState.isShowingBack ? 'none' : 'auto',
                    zIndex: faceState.isShowingBack ? 1 : 2,
                  }}
                >
                  <div className="ripple-mount-point" />
                  <CardBorderOrnaments activeStyles={frontStyles} borderColor={frontColor} />
                  {frontSide && frontSide.bgImage && (
                    <>
                      <div
                        className={`card-art-bg-layer ${faceState.frontIndex !== 0 ? 'extra-side-art-bg' : ''}`}
                        style={{ backgroundImage: `url("${frontSide.bgImage}")` }}
                      />
                      <div
                        className={`card-art-overlay ${faceState.frontIndex !== 0 ? 'extra-side-art-overlay' : ''}`}
                      />
                    </>
                  )}

                  <div
                    className="card-top-bar"
                    onPointerDown={(e) => handleStartCardDrag(player, item.key, false, scale, item.x, item.y, currentRotation, e)}
                  >
                    <div className="player-title-col">
                      {isRenamingPlayer ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-form">
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            maxLength={18}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleSaveRename}
                            className="rename-input"
                          />
                        </form>
                      ) : (
                        <span className="player-name-label" style={{ color: frontColor }}>
                          {player.name}
                        </span>
                      )}
                    </div>

                    {!isFrontAddSide && (
                      <button
                        type="button"
                        className={`card-settings-btn ${isSettingsOpen ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCardSettings(player.id)
                        }}
                        aria-label="Player Settings"
                      >
                        ⚙
                      </button>
                    )}
                  </div>

                  {isFrontAddSide ? (
                    <div
                      className="add-side-prompt-body"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAddSideTarget({ playerId: player.id, cardKey: player.id, targetIndex: faceState.frontIndex })
                      }}
                    >
                      <button
                        type="button"
                        className="add-side-plus-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddSideTarget({ playerId: player.id, cardKey: player.id, targetIndex: faceState.frontIndex })
                        }}
                      >
                        <span className="add-side-big-plus">&#43;</span>
                        <span className="add-side-caption">
                          {faceState.frontIndex < 0 ? 'Add Left Side' : 'Add Right Side'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="card-body">
                        <button
                          type="button"
                          className="touch-zone minus-zone"
                          onPointerDown={(e) => handleStepPointerDown(player.id, -1, faceState.frontIndex, e)}
                          onPointerMove={handleStepPointerMove}
                          onPointerUp={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.frontIndex, e)}
                          onPointerLeave={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.frontIndex, e)}
                          onPointerCancel={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.frontIndex, e)}
                          aria-label="Decrease counter by 1 (Hold for 10)"
                        >
                          <span className="zone-sign" style={{ color: frontColor }}>&minus;</span>
                          {floatingDeltas[`${player.id}_${faceState.frontIndex}`] && floatingDeltas[`${player.id}_${faceState.frontIndex}`].delta < 0 && (
                            <span
                              key={floatingDeltas[`${player.id}_${faceState.frontIndex}`].seq}
                              className="floating-delta-number is-negative"
                            >
                              {floatingDeltas[`${player.id}_${faceState.frontIndex}`].sign}
                            </span>
                          )}
                        </button>
                        <div className="counter-column-center">
                          <div className="life-number" style={{ fontSize: getLifeFontSize(frontSide?.value, cardWidth, numberScale, false) }}>
                            {frontSide?.value ?? 0}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="touch-zone plus-zone"
                          onPointerDown={(e) => handleStepPointerDown(player.id, 1, faceState.frontIndex, e)}
                          onPointerMove={handleStepPointerMove}
                          onPointerUp={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.frontIndex, e)}
                          onPointerLeave={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.frontIndex, e)}
                          onPointerCancel={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.frontIndex, e)}
                          aria-label="Increase counter by 1 (Hold for 10)"
                        >
                          <span className="zone-sign" style={{ color: frontColor }}>&#43;</span>
                          {floatingDeltas[`${player.id}_${faceState.frontIndex}`] && floatingDeltas[`${player.id}_${faceState.frontIndex}`].delta > 0 && (
                            <span
                              key={floatingDeltas[`${player.id}_${faceState.frontIndex}`].seq}
                              className="floating-delta-number is-positive"
                            >
                              {floatingDeltas[`${player.id}_${faceState.frontIndex}`].sign}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Anchored Bottom Row */}
                      <div className="panel-bottom-badge-row">
                        {faceState.frontIndex === 0 ? (
                          sides.filter((s) => s.index !== 0).length > 0 ? (
                            <div className="main-side-counters-summary">
                              {sides.filter((s) => s.index !== 0).map((s) => (
                                <span
                                  key={s.id || s.index}
                                  className="mini-counter-pill"
                                  style={{ color: s.color || '#38bdf8' }}
                                >
                                  <span className="mini-counter-label">{s.label || `Side ${s.index}`}:</span>
                                  <span className="mini-counter-val">{s.value ?? 0}</span>
                                </span>
                              ))}
                            </div>
                          ) : null
                        ) : (
                          isRenamingFrontSide ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-side-badge-form">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Side name..."
                                value={renameValue}
                                maxLength={18}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={handleSaveRename}
                                className="rename-side-badge-input"
                              />
                            </form>
                          ) : (
                            <span className="bottom-side-badge" style={{ color: frontColor, borderColor: `${frontColor}70` }}>
                              {frontSide?.label || 'Counter'}
                            </span>
                          )
                        )}
                      </div>
                    </>
                  )}

                  {/* Death Screen Overlay */}
                  {deathPlayer.isDead && (
                    <div className="card-death-overlay" onPointerDown={(e) => e.stopPropagation()}>
                      <span className="death-skull-icon">💀</span>
                      <span className="death-banner">DEFEATED</span>
                      <span className="death-reason">{deathPlayer.reason}</span>
                      <div className="death-actions-row">
                        <button
                          type="button"
                          className="death-revive-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRevivePlayer(player.id)
                          }}
                        >
                          &#43; Revive Player
                        </button>
                      </div>
                    </div>
                  )}

                  {hasMouse && !isDraggingThis && (
                    <>
                      {faceState.frontIndex > minIndex - 1 && (
                        <button type="button" className="mouse-corner-btn bottom-left" onClick={() => flipCardToSide(player.id, sides, -1)}>&lsaquo;</button>
                      )}
                      {faceState.frontIndex < maxIndex + 1 && (
                        <button type="button" className="mouse-corner-btn bottom-right" onClick={() => flipCardToSide(player.id, sides, 1)}>&rsaquo;</button>
                      )}
                    </>
                  )}
                </div>

                {/* BACK FACE */}
                <div
                  className={`mtg-card-face face-back ${backStyles.map((s) => `card-border-${s}`).join(' ')} ${backStyles.includes('neon-cyber') ? 'has-style-neon' : ''} ${isBackAddSide ? 'add-side-card-face' : ''}`}
                  style={{
                    borderColor: isHoverMergeTarget ? '#f59e0b' : backColor,
                    '--card-border-color': backColor,
                    pointerEvents: !faceState.isShowingBack ? 'none' : 'auto',
                    zIndex: !faceState.isShowingBack ? 1 : 2,
                  }}
                >
                  <div className="ripple-mount-point" />
                  <CardBorderOrnaments activeStyles={backStyles} borderColor={backColor} />
                  {backSide && backSide.bgImage && (
                    <>
                      <div
                        className={`card-art-bg-layer ${faceState.backIndex !== 0 ? 'extra-side-art-bg' : ''}`}
                        style={{ backgroundImage: `url("${backSide.bgImage}")` }}
                      />
                      <div
                        className={`card-art-overlay ${faceState.backIndex !== 0 ? 'extra-side-art-overlay' : ''}`}
                      />
                    </>
                  )}

                  <div
                    className="card-top-bar"
                    onPointerDown={(e) => handleStartCardDrag(player, item.key, false, scale, item.x, item.y, currentRotation, e)}
                  >
                    <div className="player-title-col">
                      <span className="player-name-label" style={{ color: backColor }}>
                        {player.name}
                      </span>
                    </div>

                    {!isBackAddSide && (
                      <button
                        type="button"
                        className={`card-settings-btn ${isSettingsOpen ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleCardSettings(player.id) }}
                        aria-label="Player Settings"
                      >
                        ⚙
                      </button>
                    )}
                  </div>

                  {isBackAddSide ? (
                    <div
                      className="add-side-prompt-body"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAddSideTarget({ playerId: player.id, cardKey: player.id, targetIndex: faceState.backIndex })
                      }}
                    >
                      <button
                        type="button"
                        className="add-side-plus-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddSideTarget({ playerId: player.id, cardKey: player.id, targetIndex: faceState.backIndex })
                        }}
                      >
                        <span className="add-side-big-plus">&#43;</span>
                        <span className="add-side-caption">
                          {faceState.backIndex < 0 ? 'Add Left Side' : 'Add Right Side'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="card-body">
                        <button
                          type="button"
                          className="touch-zone minus-zone"
                          onPointerDown={(e) => handleStepPointerDown(player.id, -1, faceState.backIndex, e)}
                          onPointerMove={handleStepPointerMove}
                          onPointerUp={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.backIndex, e)}
                          onPointerLeave={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.backIndex, e)}
                          onPointerCancel={(e) => handleStepPointerUpOrLeave(player.id, -1, faceState.backIndex, e)}
                          aria-label="Decrease counter by 1 (Hold for 10)"
                        >
                          <span className="zone-sign" style={{ color: backColor }}>&minus;</span>
                          {floatingDeltas[`${player.id}_${faceState.backIndex}`] && floatingDeltas[`${player.id}_${faceState.backIndex}`].delta < 0 && (
                            <span
                              key={floatingDeltas[`${player.id}_${faceState.backIndex}`].seq}
                              className="floating-delta-number is-negative"
                            >
                              {floatingDeltas[`${player.id}_${faceState.backIndex}`].sign}
                            </span>
                          )}
                        </button>
                        <div className="counter-column-center">
                          <div className="life-number" style={{ fontSize: getLifeFontSize(backSide?.value, cardWidth, numberScale, false) }}>
                            {backSide?.value ?? 0}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="touch-zone plus-zone"
                          onPointerDown={(e) => handleStepPointerDown(player.id, 1, faceState.backIndex, e)}
                          onPointerMove={handleStepPointerMove}
                          onPointerUp={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.backIndex, e)}
                          onPointerLeave={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.backIndex, e)}
                          onPointerCancel={(e) => handleStepPointerUpOrLeave(player.id, 1, faceState.backIndex, e)}
                          aria-label="Increase counter by 1 (Hold for 10)"
                        >
                          <span className="zone-sign" style={{ color: backColor }}>&#43;</span>
                          {floatingDeltas[`${player.id}_${faceState.backIndex}`] && floatingDeltas[`${player.id}_${faceState.backIndex}`].delta > 0 && (
                            <span
                              key={floatingDeltas[`${player.id}_${faceState.backIndex}`].seq}
                              className="floating-delta-number is-positive"
                            >
                              {floatingDeltas[`${player.id}_${faceState.backIndex}`].sign}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Anchored Bottom Row */}
                      <div className="panel-bottom-badge-row">
                        {faceState.backIndex === 0 ? (
                          sides.filter((s) => s.index !== 0).length > 0 ? (
                            <div className="main-side-counters-summary">
                              {sides.filter((s) => s.index !== 0).map((s) => (
                                <span
                                  key={s.id || s.index}
                                  className="mini-counter-pill"
                                  style={{ color: s.color || '#38bdf8' }}
                                >
                                  <span className="mini-counter-label">{s.label || `Side ${s.index}`}:</span>
                                  <span className="mini-counter-val">{s.value ?? 0}</span>
                                </span>
                              ))}
                            </div>
                          ) : null
                        ) : (
                          isRenamingBackSide ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveRename() }} className="rename-side-badge-form">
                              <input
                                type="text"
                                autoFocus
                                placeholder="Side name..."
                                value={renameValue}
                                maxLength={18}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={handleSaveRename}
                                className="rename-side-badge-input"
                              />
                            </form>
                          ) : (
                            <span className="bottom-side-badge" style={{ color: backColor, borderColor: `${backColor}70` }}>
                              {backSide?.label || 'Counter'}
                            </span>
                          )
                        )}
                      </div>
                    </>
                  )}

                  {/* Death Screen Overlay */}
                  {deathPlayer.isDead && (
                    <div className="card-death-overlay" onPointerDown={(e) => e.stopPropagation()}>
                      <span className="death-skull-icon">💀</span>
                      <span className="death-banner">DEFEATED</span>
                      <span className="death-reason">{deathPlayer.reason}</span>
                      <div className="death-actions-row">
                        <button
                          type="button"
                          className="death-revive-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRevivePlayer(player.id)
                          }}
                        >
                          &#43; Revive Player
                        </button>
                      </div>
                    </div>
                  )}

                  {hasMouse && !isDraggingThis && (
                    <>
                      {faceState.backIndex > minIndex - 1 && (
                        <button type="button" className="mouse-corner-btn bottom-left" onClick={() => flipCardToSide(player.id, sides, -1)}>&lsaquo;</button>
                      )}
                      {faceState.backIndex < maxIndex + 1 && (
                        <button type="button" className="mouse-corner-btn bottom-right" onClick={() => flipCardToSide(player.id, sides, 1)}>&rsaquo;</button>
                      )}
                    </>
                  )}
                </div>
              </div>
              </div>
            </div>
          )
        })
      })()}
        </div>
      </div>

      {customDialog && (
        <CustomDialogModal
          dialog={customDialog}
          onClose={() => setCustomDialog(null)}
        />
      )}

      {addSideTarget && (
        <AddSideModal
          addSideTarget={addSideTarget}
          setAddSideTarget={setAddSideTarget}
          players={players}
          normalizePlayerSides={normalizePlayerSides}
          COUNTER_TEMPLATES={COUNTER_TEMPLATES}
          handleApplySide={handleApplySide}
          customCounterName={customCounterName}
          setCustomCounterName={setCustomCounterName}
          customCounterValue={customCounterValue}
          setCustomCounterValue={setCustomCounterValue}
          customCounterColor={customCounterColor}
          setCustomCounterColor={setCustomCounterColor}
          MTG_COLORS={MTG_COLORS}
        />
      )}

      {/* MTG Card Art Search Modal */}
      {artSearchTarget && (
        <div className="art-search-modal-backdrop" onPointerDown={() => setArtSearchTarget(null)}>
          <div className="art-search-modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="art-search-header">
              <span className="art-search-title">🖼️ Search MTG Card Art</span>
              <button
                type="button"
                className="art-search-close"
                onClick={() => setArtSearchTarget(null)}
              >
                &times;
              </button>
            </div>

            <div className="art-search-input-wrap">
              <input
                type="text"
                autoFocus
                placeholder="Type card name (e.g. Black Lotus, Atraxa, Sol Ring)..."
                value={artQuery}
                onChange={(e) => setArtQuery(e.target.value)}
                className="art-search-input"
              />
              {artLoading && <span className="art-search-spinner" />}
            </div>

            <div className="art-suggestions-list">
              {artSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="art-suggestion-item"
                  onClick={() => selectCardArt(name)}
                >
                  <span className="art-suggestion-icon">🎴</span>
                  <span className="art-suggestion-text">{name}</span>
                </button>
              ))}

              {artQuery.trim() && !artLoading && artSuggestions.length === 0 && (
                <div className="art-search-empty">
                  No cards found matching "{artQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Radial Menu Settings Modal */}
      {settingsModalOpen && (
        <div className="settings-modal-backdrop" onPointerDown={() => setSettingsModalOpen(false)}>
          <div className="settings-modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <span className="settings-modal-title">⚙️ Room #{sessionKey} Settings</span>
              <button
                type="button"
                className="art-search-close"
                onClick={() => setSettingsModalOpen(false)}
                onPointerDown={(e) => { e.stopPropagation(); setSettingsModalOpen(false) }}
              >
                &times;
              </button>
            </div>

            {/* Section 1: Collapsible Visual Appearance & Customization */}
            <div className={`settings-accordion-section ${visualsExpanded ? 'is-open' : 'is-collapsed'}`}>
              <div
                className="settings-accordion-header"
                onClick={() => setVisualsExpanded((prev) => !prev)}
                role="button"
                tabIndex={0}
              >
                <span className="settings-accordion-title">
                  <span className="settings-chevron">{visualsExpanded ? '▼' : '▶'}</span>
                  <span>🎨 Visual Appearance & Styles</span>
                </span>
              </div>

              {visualsExpanded && (
                <div className="settings-accordion-body">
                  {/* 1. UI Theme & Table Accent */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🎨 UI Theme & Table Accent</span>
                    </span>
                    <div className="theme-swatches-grid">
                      {UI_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          className={`theme-swatch-btn ${activeThemeId === theme.id ? 'active' : ''}`}
                          onClick={() => handleSelectTheme(theme.id)}
                        >
                          <span
                            className="theme-preview-dot"
                            style={{
                              background: `radial-gradient(circle at 40% 35%, ${theme.hubBgStart}, ${theme.hubBgEnd})`,
                              borderColor: theme.hubBorder,
                              boxShadow: `0 0 8px ${theme.color}`,
                            }}
                          />
                          <span className="theme-swatch-label">{theme.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="custom-color-row">
                      <span className="custom-color-label">Custom Accent Color:</span>
                      <input
                        type="color"
                        value={customUiColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="custom-color-input"
                        title="Choose Custom Color"
                      />
                    </div>
                  </div>

                  {/* 2. Center Menu Icon */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🔘 Center Menu Icon</span>
                    </span>
                    <div className="menu-icons-grid">
                      {MENU_ICONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`menu-icon-btn ${menuIcon === item.id ? 'active' : ''}`}
                          onClick={() => handleSelectMenuIcon(item.id)}
                          title={item.desc}
                        >
                          <span className="menu-icon-preview">{item.icon}</span>
                          <span className="menu-icon-name">{item.name}</span>
                        </button>
                      ))}
                    </div>

                    {menuIcon === 'custom' && (
                      <div className="custom-emoji-row">
                        <span className="custom-color-label">Custom Emoji / Symbol:</span>
                        <input
                          type="text"
                          value={customMenuEmoji}
                          maxLength={4}
                          onChange={(e) => handleCustomMenuEmojiChange(e.target.value)}
                          className="custom-emoji-input"
                          placeholder="🔥"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Card Main Number Color */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🔢 Card Main Number Color</span>
                    </span>
                    <div className="number-colors-grid">
                      {NUMBER_COLORS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`number-color-btn ${numberColor === item.id ? 'active' : ''}`}
                          onClick={() => handleSelectNumberColor(item.id)}
                          title={item.name}
                        >
                          <span
                            className="number-color-dot"
                            style={{
                              background: item.gradient,
                              boxShadow: `0 0 8px ${item.color}`,
                              borderColor: item.color,
                            }}
                          />
                          <span className="number-color-label">{item.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="custom-color-row">
                      <span className="custom-color-label">Custom Number Color:</span>
                      <input
                        type="color"
                        value={customNumberColor}
                        onChange={(e) => handleCustomNumberColorChange(e.target.value)}
                        className="custom-color-input"
                        title="Choose Custom Number Color"
                      />
                    </div>
                  </div>

                  {/* 4. Font Family (Everything) */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🔤 Font Family (Applied to Everything)</span>
                    </span>
                    <div className="font-options-grid">
                      {FONT_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className={`font-option-btn ${fontFamily === f.id ? 'active' : ''}`}
                          onClick={() => handleSelectFont(f.id)}
                          style={{ fontFamily: f.family }}
                        >
                          <span className="font-option-name">{f.name}</span>
                          <span className="font-option-preview">{f.preview}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Card Main Number Size */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🔍 Card Number Size</span>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>
                        {Math.round(numberScale * 100)}%
                      </span>
                    </span>
                    <div className="number-scale-presets">
                      {NUMBER_SCALES.map((scaleItem) => (
                        <button
                          key={scaleItem.label}
                          type="button"
                          className={`number-scale-btn ${Math.abs(numberScale - scaleItem.value) < 0.05 ? 'active' : ''}`}
                          onClick={() => handleSelectNumberScale(scaleItem.value)}
                        >
                          {scaleItem.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. Card Scale (All Cards Size) */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>📏 Card Size (All Cards)</span>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>
                        {Math.round(globalCardScale * 100)}%
                      </span>
                    </span>
                    <div className="card-size-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className="size-step-btn"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '1rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSelectCardScale(globalCardScale - 0.1)}
                        title="Decrease Size"
                      >
                        &minus;
                      </button>
                      <button
                        type="button"
                        className="size-percent-badge"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          background: 'rgba(251, 191, 36, 0.12)',
                          border: '1px solid rgba(251, 191, 36, 0.35)',
                          color: '#fbbf24',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSelectCardScale(1.0)}
                        title="Reset to 100%"
                      >
                        {Math.round(globalCardScale * 100)}% (Reset)
                      </button>
                      <button
                        type="button"
                        className="size-step-btn"
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '1rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleSelectCardScale(globalCardScale + 0.1)}
                        title="Increase Size"
                      >
                        &#43;
                      </button>
                    </div>
                    <div className="size-presets-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { label: 'S (75%)', val: 0.75 },
                        { label: 'M (100%)', val: 1.0 },
                        { label: 'L (125%)', val: 1.25 },
                        { label: 'XL (150%)', val: 1.5 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className={`size-preset-pill ${Math.abs(globalCardScale - preset.val) < 0.06 ? 'active' : ''}`}
                          style={{
                            padding: '6px 4px',
                            fontSize: '0.75rem',
                          }}
                          onClick={() => handleSelectCardScale(preset.val)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 7. Tabletop Effects (Leylines & Fog) */}
                  <div className="settings-subgroup">
                    <span className="settings-subgroup-title">
                      <span>🌌 Tabletop Effects</span>
                    </span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`theme-swatch-btn ${enableLeylines ? 'active' : ''}`}
                        style={{ flex: 1, minWidth: '120px' }}
                        onClick={() => updateRoomSettings({ enableLeylines: !enableLeylines })}
                      >
                        <span className="theme-preview-dot" style={{ background: '#22c55e', borderColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                        <span className="theme-swatch-label">Arcane Leylines</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Room QR Code & Quick Invite */}
            <div className="settings-section">
              <span className="settings-section-title">📱 Room #{sessionKey} Quick Share</span>
              <div className="qr-share-card">
                {roomQrDataUrl ? (
                  <div className="qr-code-img-wrapper">
                    <img src={roomQrDataUrl} alt={`Room ${sessionKey} QR Code`} className="qr-code-img" />
                  </div>
                ) : (
                  <div className="qr-instructions">Generating QR Code...</div>
                )}
                <p className="qr-instructions">
                  Scan with any phone camera to join Room #{sessionKey} instantly!
                </p>
                <button
                  type="button"
                  className={`copy-room-link-btn ${linkCopied ? 'is-copied' : ''}`}
                  onClick={handleCopyRoomLink}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span>{linkCopied ? '✓ Link Copied to Clipboard!' : '📋 Copy Room Invite Link'}</span>
                </button>
              </div>
            </div>

            {/* Section 3: Game Mode Selector */}
            <div className="settings-section">
              <span className="settings-section-title">👑 Game Mode</span>
              <div className="game-modes-grid">
                {GAME_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`game-mode-btn ${activeGameModeId === mode.id ? 'active' : ''}`}
                    onClick={() => handleSelectGameMode(mode.id)}
                    onPointerDown={(e) => { e.stopPropagation(); handleSelectGameMode(mode.id) }}
                  >
                    <span className="game-mode-icon">{mode.icon}</span>
                    <span className="game-mode-name">{mode.name}</span>
                    <span className="game-mode-desc">{mode.desc}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="apply-game-mode-btn"
                onClick={() => {
                  showConfirm({
                    title: 'Apply Game Mode',
                    message: `Reset all players to ${activeGameMode.name} starting life (${activeGameMode.soloLife} solo / ${activeGameMode.teamLife} team)?`,
                    icon: '⚡',
                    confirmText: 'Reset All',
                    onConfirm: () => {
                      handleApplyGameModeToAll(activeGameModeId)
                      setSettingsModalOpen(false)
                    },
                  })
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span>⚡ Apply & Reset All Players to {activeGameMode.name}</span>
              </button>
            </div>

            {/* Section 4: Turn Order Direction */}
            <div className="settings-section">
              <span className="settings-section-title">🔄 Turn Order Direction</span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`game-mode-btn ${!reverseTurnDirection ? 'active' : ''}`}
                  style={{ flex: 1, minWidth: '140px', padding: '10px 12px', textAlign: 'center' }}
                  onClick={() => updateRoomSettings({ reverseTurnDirection: false, turnDirection: 'clockwise' })}
                  onPointerDown={(e) => { e.stopPropagation(); updateRoomSettings({ reverseTurnDirection: false, turnDirection: 'clockwise' }) }}
                >
                  <span className="game-mode-icon">🔄</span>
                  <span className="game-mode-name">Clockwise</span>
                  <span className="game-mode-desc">Standard table rotation</span>
                </button>
                <button
                  type="button"
                  className={`game-mode-btn ${reverseTurnDirection ? 'active' : ''}`}
                  style={{ flex: 1, minWidth: '140px', padding: '10px 12px', textAlign: 'center' }}
                  onClick={() => updateRoomSettings({ reverseTurnDirection: true, turnDirection: 'counter-clockwise' })}
                  onPointerDown={(e) => { e.stopPropagation(); updateRoomSettings({ reverseTurnDirection: true, turnDirection: 'counter-clockwise' }) }}
                >
                  <span className="game-mode-icon">🔁</span>
                  <span className="game-mode-name">Reversed</span>
                  <span className="game-mode-desc">Counter-clockwise rotation</span>
                </button>
              </div>
            </div>

            {/* Section 5: Personal Tabletop Layout & Sizing */}
            <div className="settings-section">
              <span className="settings-section-title">📐 Personal Tabletop Layout</span>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="game-mode-btn"
                  style={{ flex: 1, minWidth: '140px', padding: '10px 12px', textAlign: 'center' }}
                  onClick={() => {
                    resetCardPositions()
                    setSettingsModalOpen(false)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="game-mode-icon">📐</span>
                  <span className="game-mode-name">Auto-Fit Cards</span>
                  <span className="game-mode-desc">Arrange all cards on table</span>
                </button>
                <button
                  type="button"
                  className="game-mode-btn"
                  style={{ flex: 1, minWidth: '140px', padding: '10px 12px', textAlign: 'center' }}
                  onClick={() => {
                    resetAllCardScales()
                    setSettingsModalOpen(false)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="game-mode-icon">🔄</span>
                  <span className="game-mode-name">Reset Sizes (100%)</span>
                  <span className="game-mode-desc">Reset all card scales</span>
                </button>
              </div>
            </div>

            {/* Section 6: Game & Turn History Log */}
            <div className="settings-section">
              <span className="settings-section-title">📜 Match History & Analytics</span>
              <button
                type="button"
                className="open-game-log-btn"
                onClick={() => {
                  setGameLogModalOpen(true)
                  setSettingsModalOpen(false)
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="game-log-icon">📜</span>
                <div className="game-log-btn-text">
                  <span className="game-log-btn-title">Match Time & Turn Log</span>
                  <span className="game-log-btn-subtitle">
                    {turnHistory.length > 0
                      ? `${turnHistory.length} turns recorded • Round ${currentRoundNumber}`
                      : 'View round durations, player move times & statistics'}
                  </span>
                </div>
                <span className="game-log-chevron">➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game & Turn History Log Modal */}
      {gameLogModalOpen && (
        <div className="settings-modal-backdrop" onPointerDown={() => setGameLogModalOpen(false)}>
          <div className="game-log-modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>📜</span>
                <div>
                  <div className="settings-modal-title" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                    Match Time & Turn Log
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
                    Room #{sessionKey} • Match in progress
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="art-search-close"
                onClick={() => setGameLogModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="game-log-modal-body">
              {/* Top Summary Metric Cards */}
              <div className="game-log-metrics-grid">
                <div className="game-log-metric-card">
                  <span className="metric-icon">⏱️</span>
                  <div className="metric-content">
                    <span className="metric-label">Match Duration</span>
                    <span className="metric-value live-timer">
                      {formatClockTime(totalGameSeconds)}
                      <span className="live-dot" />
                    </span>
                  </div>
                </div>

                <div className="game-log-metric-card">
                  <span className="metric-icon">👑</span>
                  <div className="metric-content">
                    <span className="metric-label">Current Round</span>
                    <span className="metric-value">Round {currentRoundNumber}</span>
                  </div>
                </div>

                <div className="game-log-metric-card">
                  <span className="metric-icon">🔄</span>
                  <div className="metric-content">
                    <span className="metric-label">Turns Completed</span>
                    <span className="metric-value">{turnHistory.length} turns</span>
                  </div>
                </div>

                <div className="game-log-metric-card">
                  <span className="metric-icon">⚡</span>
                  <div className="metric-content">
                    <span className="metric-label">Average Move</span>
                    <span className="metric-value">{formatDuration(overallAvgTurnSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Player Pace & Analytics Section */}
              <div className="game-log-section">
                <div className="game-log-section-header">
                  <span className="game-log-section-title">📊 Player Pace & Time Share</span>
                </div>

                {playerPaceList.length === 0 ? (
                  <div className="game-log-empty">
                    No turn history yet. Advance the turn ball to record moves and round times!
                  </div>
                ) : (
                  <div className="player-pace-list">
                    {playerPaceList.map((p) => {
                      const percent = totalTrackedTime > 0 ? Math.round((p.totalSeconds / totalTrackedTime) * 100) : 0
                      return (
                        <div key={p.key} className="player-pace-card">
                          <div className="player-pace-top">
                            <div className="player-pace-identity">
                              <span className="player-pace-pip" style={{ backgroundColor: p.color }} />
                              <span className="player-pace-name">{p.name}</span>
                              {p.isFastest && <span className="pace-badge fastest-badge">⚡ Speed Demon</span>}
                              {p.isSlowest && <span className="pace-badge slowest-badge">🧠 Deep Thinker</span>}
                            </div>
                            <div className="player-pace-times">
                              <span className="player-pace-total">{formatDuration(p.totalSeconds)}</span>
                              <span className="player-pace-percent">({percent}%)</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="pace-bar-track">
                            <div
                              className="pace-bar-fill"
                              style={{
                                width: `${Math.max(4, Math.min(100, percent))}%`,
                                backgroundColor: p.color,
                              }}
                            />
                          </div>

                          <div className="player-pace-meta">
                            <span>{p.turnCount} {p.turnCount === 1 ? 'turn' : 'turns'} taken</span>
                            <span>Avg: <strong>{formatDuration(p.avgSeconds)}</strong></span>
                            <span>Fastest: <strong>{formatDuration(p.fastestSeconds)}</strong></span>
                            <span>Slowest: <strong>{formatDuration(p.slowestSeconds)}</strong></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Round-by-Round Breakdown Timeline */}
              <div className="game-log-section">
                <div className="game-log-section-header">
                  <span className="game-log-section-title">📜 Round-by-Round Timeline</span>
                </div>

                <div className="rounds-timeline-container">
                  {roundsGrouped.map((round) => (
                    <div key={round.roundIndex} className="round-log-card">
                      <div className="round-log-header">
                        <span className="round-log-title">👑 Round {round.roundIndex}</span>
                        <span className="round-log-total">Duration: {formatDuration(round.totalSeconds)}</span>
                      </div>
                      <div className="round-turns-list">
                        {round.turns.map((t) => (
                          <div key={t.id} className="turn-log-row">
                            <div className="turn-log-player">
                              <span className="turn-index-badge">Turn #{t.turnIndex}</span>
                              <span className="turn-player-pip" style={{ backgroundColor: t.playerColor }} />
                              <span className="turn-player-name">{t.playerName}</span>
                            </div>
                            <span className="turn-duration-pill">{formatDuration(t.durationSeconds)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Current Active Move In Progress */}
                  <div className="round-log-card active-round-card">
                    <div className="round-log-header">
                      <span className="round-log-title" style={{ color: '#86efac' }}>
                        🟢 Active Turn in Progress
                      </span>
                      <span className="round-log-total live-clock">
                        {formatClockTime(currentTurnLiveSeconds)}
                      </span>
                    </div>
                    <div className="round-turns-list">
                      <div className="turn-log-row active-turn-row">
                        <div className="turn-log-player">
                          <span className="turn-index-badge live-badge">Live</span>
                          <span className="turn-player-pip" style={{ backgroundColor: activeCurrentPlayerColor }} />
                          <span className="turn-player-name">{activeCurrentPlayerName}</span>
                        </div>
                        <span className="turn-duration-pill live-pill">{formatDuration(currentTurnLiveSeconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="game-log-footer">
              <button
                type="button"
                className="game-log-action-btn copy-btn"
                onClick={handleCopyGameLogSummary}
              >
                <span>{gameLogCopied ? '✓ Summary Copied!' : '📋 Copy Log Summary'}</span>
              </button>
              <button
                type="button"
                className="game-log-action-btn reset-btn"
                onClick={() => {
                  showConfirm({
                    title: 'Reset Match Log',
                    message: 'Reset match timer and clear all turn history?',
                    danger: true,
                    icon: '🔄',
                    confirmText: 'Reset Log',
                    onConfirm: () => {
                      setTurnHistory([])
                      const now = Date.now()
                      setGameStartTime(now)
                      turnStartTimeRef.current = now
                      try {
                        localStorage.removeItem(`mtg_turnhistory_${sessionKey}`)
                        localStorage.setItem(`mtg_gamestart_${sessionKey}`, String(now))
                      } catch (_) {}
                    },
                  })
                }}
              >
                <span>🔄 Reset Log</span>
              </button>
              <button
                type="button"
                className="game-log-action-btn close-btn"
                onClick={() => setGameLogModalOpen(false)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Button and Radial Menu */}
      <div className={`center-hub ${isGridView ? 'in-grid-hub' : ''} ${centerHubMode === 'turn' ? 'in-turn-ball-mode' : ''}`} ref={centerRef}>
        {menuOpen && (
          <div className={`radial-menu-overlay ${isGridView ? 'grid-radial-overlay' : ''}`}>
            {/* Sector 1: Room & Session Management */}
            <div className="menu-sector sector-1">
              <div className="sector-pill">
                <div className="sector-header">
                  <div className="sector-title-badge">
                    <span className="sector-title-icon">🌐</span>
                    <span>Room #{sessionKey}</span>
                  </div>
                </div>

                <form onSubmit={handleRoomSubmit} className="sector-actions">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4-char code"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                    className="sector-room-input"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="sector-join-btn"
                    disabled={!roomCodeInput.trim()}
                    title="Join Room"
                  >
                    Go
                  </button>
                  <button
                    type="button"
                    className="sector-new-btn"
                    onClick={() => {
                      createNewSession()
                      setMenuOpen(false)
                    }}
                    title="Create New Room"
                  >
                    + New
                  </button>
                </form>
              </div>
            </div>

            {/* Sector 2: Player Creation */}
            <div className="menu-sector sector-2">
              <div className="sector-pill">
                <div className="sector-header">
                  <div className="sector-title-badge">
                    <span className="sector-title-icon">👤</span>
                    <span>Add Player</span>
                  </div>
                </div>
                <form onSubmit={handleAddNewPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Player name..."
                    value={newPlayerName}
                    maxLength={18}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="name-input-field"
                  />
                  <button
                    type="submit"
                    className="add-player-action-btn"
                  >
                    <span>+ Create Player</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Sector 3: View Mode Toggle & Turn Ball Switch */}
            <div className="menu-sector sector-3">
              <div className="sector-pill">
                <div className="sector-header">
                  <div className="sector-title-badge">
                    <span className="sector-title-icon">🎴</span>
                    <span>Layout & Modes</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="view-toggle-btn"
                  onClick={toggleViewMode}
                >
                  <span>{isGridView ? '🎴 Switch to Table' : '🔲 Switch to Grid'}</span>
                </button>
                <button
                  type="button"
                  className="view-toggle-btn"
                  style={{ marginTop: '6px' }}
                  onClick={() => {
                    setCenterHubMode((prev) => (prev === 'menu' ? 'turn' : 'menu'))
                    setMenuOpen(false)
                  }}
                >
                  <span>{centerHubMode === 'menu' ? '⚪ Switch to Turn Ball' : '🎴 Switch to Menu Deck'}</span>
                </button>
              </div>
            </div>

            {/* Sector 4: UI & Game Mode Settings */}
            <div className="menu-sector sector-4">
              <div className="sector-pill">
                <div className="sector-header">
                  <div className="sector-title-badge">
                    <span className="sector-title-icon">⚙️</span>
                    <span>Theme & Rules</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-open-btn"
                  onClick={() => {
                    setSettingsModalOpen(true)
                    setMenuOpen(false)
                  }}
                >
                  <span>⚙️ Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fantasy Tabletop Center Trigger Button / White Turn Ball */}
        <div className="center-trigger-wrapper">
          <button
            type="button"
            className={`center-trigger-btn ${centerHubMode === 'turn' ? 'turn-ball-mode' : ''} ${menuOpen ? 'open' : ''} ${(visualHighlightedCardId || highlightedCardId) && centerHubMode === 'turn' ? 'has-active-turn' : ''}`}
            onPointerDown={handleCenterPointerDown}
            aria-label={centerHubMode === 'turn' ? 'Next Player Turn (Click to advance, Drag to select, Hold for menu)' : (menuOpen ? 'Close Menu' : 'Open Menu (Drag for turn ball)')}
            title={centerHubMode === 'turn' ? 'Click: Next Player Turn | Drag: Select Player | Hold/Drop Center: Menu' : 'Click: Menu | Drag: Switch to Turn Ball'}
          >
            {centerHubMode === 'turn' ? (
              <div className={`grid-highlight-token hub-turn-ball ${(visualHighlightedCardId || highlightedCardId) ? 'is-active' : ''}`} />
            ) : menuIcon === 'deck' ? (
              <div className="hub-deck-icon">
                <div className="deck-card deck-card-1" />
                <div className="deck-card deck-card-2" />
                <div className="deck-card deck-card-3" />
                <span className="deck-gem" />
              </div>
            ) : (
              <span className="hub-glyph-icon">
                {menuIcon === 'custom' ? (customMenuEmoji || '🎴') : (MENU_ICONS.find((i) => i.id === menuIcon)?.icon || '🎴')}
              </span>
            )}
          </button>

          {/* Quick Swap Badge to return to Menu - only visible in Turn Ball mode */}
          {centerHubMode === 'turn' && (
            <button
              type="button"
              className="hub-mode-swap-badge"
              onClick={(e) => {
                e.stopPropagation()
                setCenterHubMode('menu')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Switch to Menu Deck"
              aria-label="Switch to Menu Deck"
            >
              🎴
            </button>
          )}
        </div>
      </div>

      {/* Online indicator dot */}
      <div className="table-status">
        <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
      </div>
    </div>
  )
}
