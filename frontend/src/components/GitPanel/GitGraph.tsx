// Git graph visualization using @gitgraph/js

import { useRef, useEffect } from 'react'
import { createGitgraph, templateExtend, TemplateName } from '@gitgraph/js'
import { useGitStore } from '../../stores/useGitStore'

export default function GitGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { commits, selectCommit } = useGitStore()

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
        onClick: () => selectCommit(commit),
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
          textEl.addEventListener('click', () => selectCommit(commit))
        }
      })
    }, 100)

  // Only re-render graph when commits list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commits])

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
}
