// Git graph visualization using @gitgraph/js

import { useRef, useEffect, memo } from 'react'
import { createGitgraph, templateExtend, TemplateName } from '@gitgraph/js'
import type { GitCommit } from '../../lib/api'

interface GitGraphProps {
  commits: GitCommit[]
  onSelectCommit: (commit: GitCommit) => void
}

const GitGraph = memo(function GitGraph({ commits, onSelectCommit, selectedHash }: GitGraphProps & { selectedHash?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isSelectingRef = useRef(false)
  const onSelectRef = useRef(onSelectCommit)
  onSelectRef.current = onSelectCommit

  useEffect(() => {
    if (!containerRef.current || commits.length === 0) return

    containerRef.current.innerHTML = ''

    const template = templateExtend(TemplateName.Metro, {
      colors: ['#818cf8', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'],
      branch: {
        lineWidth: 2,
        spacing: 24,
        label: {
          display: true,
          bgColor: '#262626',
          strokeColor: '#404040',
          borderRadius: 4,
          font: '10px monospace',
          color: '#d4d4d4',
        },
      },
      commit: {
        spacing: 32,
        dot: { size: 4, strokeWidth: 2 },
        message: {
          display: true,
          displayAuthor: false,
          displayHash: true,
          font: '11px monospace',
          color: '#a3a3a3',
        },
      },
      tag: {
        font: '10px monospace',
        bgColor: '#422006',
        strokeColor: '#92400e',
        color: '#fbbf24',
        borderRadius: 3,
      },
    })

    const graphContainer = createGitgraph(containerRef.current, {
      template,
      // vertical = newest on top (default top-to-bottom)
    })

    const branchMap = new Map<string, ReturnType<typeof graphContainer.branch>>()

    const getBranchName = (commit: typeof commits[0]): string => {
      for (const ref of commit.refs) {
        if (ref.startsWith('HEAD -> ')) return ref.replace('HEAD -> ', '')
        if (!ref.includes('/') && ref !== 'HEAD') return ref
      }
      return 'main'
    }

    // Process from oldest to newest (gitgraph builds top-to-bottom)
    const chronological = [...commits].reverse()
    for (const commit of chronological) {
      const branchName = getBranchName(commit)

      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, graphContainer.branch(branchName))
      }

      const branch = branchMap.get(branchName)!
      branch.commit({
        hash: commit.abbrev,
        subject: commit.message,
        author: commit.author,
        onClick: () => {
          if (isSelectingRef.current) return
          isSelectingRef.current = true
          // Defer to avoid DOM mutation during gitgraph callback
          setTimeout(() => {
            onSelectRef.current(commit)
            isSelectingRef.current = false
          }, 0)
        },
        tag: commit.refs.find(r => r.startsWith('tag: '))?.replace('tag: ', '') || undefined,
      })
    }

    // Make commit message texts clickable too
    // gitgraph renders SVG text elements — add click handlers after render
    setTimeout(() => {
      if (!containerRef.current) return
      const texts = containerRef.current.querySelectorAll('svg text')
      texts.forEach(textEl => {
        const content = textEl.textContent || ''
        // Find the commit that matches this text (by hash or message)
        const commit = commits.find(c =>
          content.includes(c.abbrev) || content.includes(c.message.substring(0, 20))
        )
        if (commit) {
          (textEl as SVGElement).style.cursor = 'pointer'
          textEl.addEventListener('click', () => {
            if (isSelectingRef.current) return
            isSelectingRef.current = true
            setTimeout(() => {
              onSelectRef.current(commit)
              isSelectingRef.current = false
            }, 0)
          })
        }
      })
    }, 100)

  // Only re-render graph when commits list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commits])

  // Highlight selected commit in the SVG
  useEffect(() => {
    if (!containerRef.current || !selectedHash) return
    // Remove previous highlights
    containerRef.current.querySelectorAll('.git-commit-selected').forEach(el => el.classList.remove('git-commit-selected'))
    // Find and highlight the selected commit's text
    const texts = containerRef.current.querySelectorAll('svg text')
    const abbrev = selectedHash.substring(0, 7)
    texts.forEach(textEl => {
      if (textEl.textContent?.includes(abbrev)) {
        // Highlight the parent group or the text itself
        const g = textEl.closest('g') || textEl
        g.classList.add('git-commit-selected')
      }
    })
  }, [selectedHash])

  if (commits.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
        No commits loaded
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-neutral-900 p-2"
      style={{ minWidth: 300 }}
    />
  )
})

export default GitGraph
