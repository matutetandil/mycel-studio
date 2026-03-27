// Git panel state — commits, branches, selected commit, conflicts
import { create } from 'zustand'
import {
  apiGetGitLog, apiGetGitFileLog, apiGetGitBranches, apiGetGitCommitFiles, apiGetGitMergeConflicts,
  type GitCommit, type GitBranch, type GitCommitFile,
} from '../lib/api'

interface GitState {
  commits: GitCommit[]
  branches: GitBranch[]
  selectedCommit: GitCommit | null
  commitFiles: GitCommitFile[]
  conflicts: string[]
  isLoading: boolean
  filterFile: string | null  // When set, shows only commits for this file

  fetchLog: (limit?: number) => Promise<void>
  fetchFileLog: (filePath: string, limit?: number) => Promise<void>
  fetchBranches: () => Promise<void>
  selectCommit: (commit: GitCommit) => Promise<void>
  selectCommitByHash: (hash: string) => Promise<void>
  fetchConflicts: () => Promise<void>
  clearSelection: () => void
  clearFilter: () => void
  refresh: () => Promise<void>
}

export const useGitStore = create<GitState>((set, get) => ({
  commits: [],
  branches: [],
  selectedCommit: null,
  commitFiles: [],
  conflicts: [],
  isLoading: false,
  filterFile: null,

  fetchLog: async (limit = 100) => {
    set({ isLoading: true })
    try {
      const commits = await apiGetGitLog(limit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).go?.main?.App?.DebugLog?.(`GitStore.fetchLog: ${commits?.length || 0} commits`)
      set({ commits: commits || [], isLoading: false })
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).go?.main?.App?.DebugLog?.(`GitStore.fetchLog error: ${err}`)
      set({ isLoading: false })
    }
  },

  fetchFileLog: async (filePath, limit = 50) => {
    set({ isLoading: true, filterFile: filePath })
    try {
      const commits = await apiGetGitFileLog(filePath, limit)
      set({ commits: commits || [], isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchBranches: async () => {
    const branches = await apiGetGitBranches()
    set({ branches })
  },

  selectCommit: async (commit) => {
    set({ selectedCommit: commit, commitFiles: [], isLoading: true })
    try {
      const files = await apiGetGitCommitFiles(commit.hash)
      set({ commitFiles: files || [], isLoading: false })
    } catch {
      set({ commitFiles: [], isLoading: false })
    }
  },

  fetchConflicts: async () => {
    const conflicts = await apiGetGitMergeConflicts()
    set({ conflicts })
  },

  selectCommitByHash: async (hash) => {
    const { commits } = get()
    // Try to find in loaded commits
    let commit = commits.find(c => c.hash === hash || c.abbrev === hash || c.hash.startsWith(hash))
    if (!commit) {
      // Fetch the full log and try again
      await get().fetchLog(200)
      const updated = get().commits
      commit = updated.find(c => c.hash === hash || c.abbrev === hash || c.hash.startsWith(hash))
    }
    if (commit) {
      await get().selectCommit(commit)
    }
  },

  clearSelection: () => set({ selectedCommit: null, commitFiles: [] }),

  clearFilter: () => {
    set({ filterFile: null })
    get().fetchLog()
  },

  refresh: async () => {
    await Promise.all([
      get().fetchLog(),
      get().fetchBranches(),
      get().fetchConflicts(),
    ])
  },
}))
