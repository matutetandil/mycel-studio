// Git panel state — commits, branches, selected commit, conflicts
import { create } from 'zustand'
import {
  apiGetGitLog, apiGetGitBranches, apiGetGitCommitFiles, apiGetGitMergeConflicts,
  type GitCommit, type GitBranch, type GitCommitFile,
} from '../lib/api'

interface GitState {
  commits: GitCommit[]
  branches: GitBranch[]
  selectedCommit: GitCommit | null
  commitFiles: GitCommitFile[]
  conflicts: string[]
  isLoading: boolean

  fetchLog: (limit?: number) => Promise<void>
  fetchBranches: () => Promise<void>
  selectCommit: (commit: GitCommit) => Promise<void>
  fetchConflicts: () => Promise<void>
  clearSelection: () => void
  refresh: () => Promise<void>
}

export const useGitStore = create<GitState>((set, get) => ({
  commits: [],
  branches: [],
  selectedCommit: null,
  commitFiles: [],
  conflicts: [],
  isLoading: false,

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

  fetchBranches: async () => {
    const branches = await apiGetGitBranches()
    set({ branches })
  },

  selectCommit: async (commit) => {
    set({ selectedCommit: commit, commitFiles: [], isLoading: true })
    const files = await apiGetGitCommitFiles(commit.hash)
    set({ commitFiles: files, isLoading: false })
  },

  fetchConflicts: async () => {
    const conflicts = await apiGetGitMergeConflicts()
    set({ conflicts })
  },

  clearSelection: () => set({ selectedCommit: null, commitFiles: [] }),

  refresh: async () => {
    await Promise.all([
      get().fetchLog(),
      get().fetchBranches(),
      get().fetchConflicts(),
    ])
  },
}))
