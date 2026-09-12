export const DIRECTIONS = {
  north: { dr: -1, dc: 0, wall: 'north', opposite: 'south', short: 'N' },
  east: { dr: 0, dc: 1, wall: 'east', opposite: 'west', short: 'E' },
  south: { dr: 1, dc: 0, wall: 'south', opposite: 'north', short: 'S' },
  west: { dr: 0, dc: -1, wall: 'west', opposite: 'east', short: 'W' },
}

const ROOM_DESCRIPTIONS = [
  'Cold mortar drinks the light. Something has scratched tally marks into the wall.',
  'The passage widens here. Dust lies undisturbed except for one long drag mark.',
  'Water ticks steadily from a hairline crack in the ceiling.',
  'A rusted ring is set into the floor. The stone around it is badly scored.',
  'The air tastes of iron. A narrow draft slips through the masonry.',
  'Black roots have forced their way between the stones and curl toward the dark.',
  'Old candle wax clings to a shallow niche at shoulder height.',
  'The floor dips beneath a shallow pool of ink-dark water.',
]

const key = (row, col) => `${row}:${col}`

export function generateMaze(size = 12) {
  const cells = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      walls: { north: true, east: true, south: true, west: true },
      description: ROOM_DESCRIPTIONS[(row * 5 + col * 3) % ROOM_DESCRIPTIONS.length],
      discoveryIds: [],
    })),
  )

  const visited = new Set([key(0, 0)])
  const stack = [cells[0][0]]

  while (stack.length) {
    const current = stack[stack.length - 1]
    const options = Object.entries(DIRECTIONS)
      .map(([name, direction]) => ({
        name,
        direction,
        row: current.row + direction.dr,
        col: current.col + direction.dc,
      }))
      .filter(({ row, col }) => row >= 0 && row < size && col >= 0 && col < size && !visited.has(key(row, col)))

    if (!options.length) {
      stack.pop()
      continue
    }

    const choice = options[Math.floor(Math.random() * options.length)]
    const next = cells[choice.row][choice.col]
    current.walls[choice.direction.wall] = false
    next.walls[choice.direction.opposite] = false
    visited.add(key(next.row, next.col))
    stack.push(next)
  }

  // Add a handful of loops so the party has tactical route choices.
  const loops = Math.floor(size * 1.25)
  for (let index = 0; index < loops; index += 1) {
    const row = Math.floor(Math.random() * size)
    const col = Math.floor(Math.random() * size)
    const choices = Object.entries(DIRECTIONS).filter(([, direction]) => {
      const nextRow = row + direction.dr
      const nextCol = col + direction.dc
      return nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size
    })
    const [, direction] = choices[Math.floor(Math.random() * choices.length)]
    cells[row][col].walls[direction.wall] = false
    cells[row + direction.dr][col + direction.dc].walls[direction.opposite] = false
  }

  return cells
}

export function perimeterCells(size) {
  const cells = []
  for (let index = 0; index < size; index += 1) {
    cells.push({ row: 0, col: index }, { row: size - 1, col: index })
    if (index > 0 && index < size - 1) cells.push({ row: index, col: 0 }, { row: index, col: size - 1 })
  }
  return cells
}

export function canMove(maze, position, directionName) {
  const direction = DIRECTIONS[directionName]
  if (!direction || maze[position.row][position.col].walls[direction.wall]) return false
  const row = position.row + direction.dr
  const col = position.col + direction.dc
  return row >= 0 && row < maze.length && col >= 0 && col < maze.length
}

export function movePosition(position, directionName) {
  const direction = DIRECTIONS[directionName]
  return { row: position.row + direction.dr, col: position.col + direction.dc }
}

export function openDirections(maze, position) {
  return Object.keys(DIRECTIONS).filter((direction) => canMove(maze, position, direction))
}

export function shortestPath(maze, start, target) {
  if (start.row === target.row && start.col === target.col) return [start]
  const queue = [[start]]
  const visited = new Set([key(start.row, start.col)])

  while (queue.length) {
    const path = queue.shift()
    const current = path[path.length - 1]
    for (const directionName of openDirections(maze, current)) {
      const next = movePosition(current, directionName)
      const nextKey = key(next.row, next.col)
      if (visited.has(nextKey)) continue
      const nextPath = [...path, next]
      if (next.row === target.row && next.col === target.col) return nextPath
      visited.add(nextKey)
      queue.push(nextPath)
    }
  }
  return []
}

export function directionToward(from, to) {
  if (!to) return null
  if (to.row < from.row) return 'north'
  if (to.row > from.row) return 'south'
  if (to.col > from.col) return 'east'
  if (to.col < from.col) return 'west'
  return null
}

export function isPerimeter(position, size) {
  return position.row === 0 || position.col === 0 || position.row === size - 1 || position.col === size - 1
}
