// Simple line-by-line diff for git gutter decorations
// Returns arrays of line numbers that were added, modified, or deleted

export interface LineDiffResult {
  added: number[]    // Lines only in current (new lines)
  modified: number[] // Lines changed from original
  deleted: number[]  // Line numbers in current AFTER which a deletion occurred
}

export function computeLineDiff(original: string, current: string): LineDiffResult {
  const origLines = original.split('\n')
  const currLines = current.split('\n')

  const added: number[] = []
  const modified: number[] = []
  const deleted: number[] = []

  // LCS-based diff using Hunt-Szymanski for reasonable performance
  const lcs = computeLCS(origLines, currLines)

  let oi = 0
  let ci = 0
  let li = 0

  while (oi < origLines.length || ci < currLines.length) {
    if (li < lcs.length && oi === lcs[li][0] && ci === lcs[li][1]) {
      // Lines match — no change
      oi++
      ci++
      li++
    } else if (li < lcs.length) {
      // Advance to next match
      const nextOrigIdx = lcs[li][0]
      const nextCurrIdx = lcs[li][1]

      // Lines removed from original (between oi and nextOrigIdx)
      const removedCount = nextOrigIdx - oi
      // Lines added in current (between ci and nextCurrIdx)
      const addedCount = nextCurrIdx - ci

      if (removedCount > 0 && addedCount > 0) {
        // Some lines were modified (min of both), rest are pure add/delete
        const modCount = Math.min(removedCount, addedCount)
        for (let i = 0; i < modCount; i++) {
          modified.push(ci + i + 1) // 1-based line numbers
        }
        for (let i = modCount; i < addedCount; i++) {
          added.push(ci + i + 1)
        }
        if (removedCount > modCount) {
          // Deletions happened before the current line
          deleted.push(ci + modCount > 0 ? ci + modCount : 0)
        }
      } else if (addedCount > 0) {
        for (let i = 0; i < addedCount; i++) {
          added.push(ci + i + 1)
        }
      } else if (removedCount > 0) {
        deleted.push(ci > 0 ? ci : 0)
      }

      oi = nextOrigIdx
      ci = nextCurrIdx
    } else {
      // Past all LCS matches — remaining lines
      const removedCount = origLines.length - oi
      const addedCount = currLines.length - ci

      if (removedCount > 0 && addedCount > 0) {
        const modCount = Math.min(removedCount, addedCount)
        for (let i = 0; i < modCount; i++) {
          modified.push(ci + i + 1)
        }
        for (let i = modCount; i < addedCount; i++) {
          added.push(ci + i + 1)
        }
        if (removedCount > modCount) {
          deleted.push(ci + modCount > 0 ? ci + modCount : 0)
        }
      } else if (addedCount > 0) {
        for (let i = 0; i < addedCount; i++) {
          added.push(ci + i + 1)
        }
      } else if (removedCount > 0) {
        deleted.push(ci > 0 ? ci : 0)
      }

      break
    }
  }

  return { added, modified, deleted }
}

// Compute LCS indices using dynamic programming
// Returns array of [origIndex, currIndex] pairs
function computeLCS(a: string[], b: string[]): [number, number][] {
  const m = a.length
  const n = b.length

  // For very large files, skip diff
  if (m > 10000 || n > 10000) return []

  // Build DP table (space-optimized for just the backtrack)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const result: [number, number][] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.push([i - 1, j - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result.reverse()
}
