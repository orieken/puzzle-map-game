import test from 'node:test'
import assert from 'node:assert/strict'
import { DIRECTIONS, canMove, generateMaze, perimeterCells, shortestPath } from '../src/game/maze.js'

test('generated maze is fully connected', () => {
  const maze = generateMaze(12)
  const origin = { row: 0, col: 0 }

  for (const cell of maze.flat()) {
    const path = shortestPath(maze, origin, { row: cell.row, col: cell.col })
    assert.ok(path.length > 0, `expected a path to ${cell.row}:${cell.col}`)
  }
})

test('passages are mirrored by their neighboring cells', () => {
  const maze = generateMaze(12)

  for (const cell of maze.flat()) {
    for (const [name, direction] of Object.entries(DIRECTIONS)) {
      if (!canMove(maze, cell, name)) continue
      const neighbor = maze[cell.row + direction.dr][cell.col + direction.dc]
      assert.equal(neighbor.walls[direction.opposite], false)
    }
  }
})

test('perimeter list contains each boundary room exactly once', () => {
  const cells = perimeterCells(12)
  const unique = new Set(cells.map((cell) => `${cell.row}:${cell.col}`))

  assert.equal(cells.length, 44)
  assert.equal(unique.size, 44)
  assert.ok(cells.every((cell) => cell.row === 0 || cell.col === 0 || cell.row === 11 || cell.col === 11))
})
