// Registry for stores that participate in workspace instance snapshots.
// Each store registers itself with capture/restore/clear functions.
// The instance store iterates this registry — no manual wiring needed.

export interface SnapshotProvider {
  capture: () => unknown | Promise<unknown>
  restore: (data: unknown) => void
  clear: () => void
}

const providers = new Map<string, SnapshotProvider>()

export function registerSnapshotProvider(key: string, provider: SnapshotProvider) {
  providers.set(key, provider)
}

export async function captureAllProviders(): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  for (const [key, provider] of providers) {
    result[key] = await provider.capture()
  }
  return result
}

export function restoreAllProviders(data: Record<string, unknown>) {
  for (const [key, provider] of providers) {
    if (key in data) {
      provider.restore(data[key])
    }
  }
}

export function clearAllProviders() {
  for (const provider of providers.values()) {
    provider.clear()
  }
}
