/**
 * Normalize player sides array to ensure consistent structure across single & multi-sided counters.
 */
export function normalizePlayerSides(player) {
  if (!player) return []
  if (!Array.isArray(player.sides) || player.sides.length === 0) {
    return [{
      index: 0,
      id: 'main',
      type: 'life',
      label: '',
      value: typeof player.life === 'number' ? player.life : 20,
      color: player.color || '#fbbf24',
      bgImage: player.bgImage || null,
      borderStyles: Array.isArray(player.borderStyles) ? player.borderStyles : (player.borderStyle ? [player.borderStyle] : []),
    }]
  }

  return player.sides.map((s, idx) => {
    if (typeof s === 'object' && s !== null) {
      const assignedIndex = typeof s.index === 'number' ? s.index : idx
      return {
        index: assignedIndex,
        id: s.id || `s_${assignedIndex}_${Date.now()}`,
        type: s.type || (assignedIndex === 0 ? 'life' : 'custom'),
        label: s.label !== undefined ? s.label : (assignedIndex === 0 ? '' : `Side ${assignedIndex}`),
        value: typeof s.value === 'number' ? s.value : (assignedIndex === 0 ? (player.life ?? 20) : 0),
        color: s.color || (assignedIndex === 0 ? (player.color || '#fbbf24') : '#38bdf8'),
        bgImage: s.bgImage || (assignedIndex === 0 ? player.bgImage : null),
        borderStyles: Array.isArray(s.borderStyles)
          ? s.borderStyles
          : (s.borderStyle ? [s.borderStyle] : (Array.isArray(player.borderStyles) ? player.borderStyles : [])),
      }
    } else {
      return {
        index: idx,
        id: idx === 0 ? 'main' : `side_${idx}`,
        type: idx === 0 ? 'life' : 'custom',
        label: idx === 0 ? '' : (idx === 1 ? 'Poison' : (idx === 2 ? 'Commander' : 'Energy')),
        value: typeof s === 'number' ? s : 0,
        color: idx === 0 ? (player.color || '#fbbf24') : (idx === 1 ? '#10b981' : (idx === 2 ? '#f87171' : '#38bdf8')),
        bgImage: idx === 0 ? player.bgImage : null,
        borderStyles: Array.isArray(player.borderStyles) ? player.borderStyles : [],
      }
    }
  }).sort((a, b) => a.index - b.index)
}
