import type { PackingResponse, BilletSpec, ContainerSpec, PackingOptions } from '../types';

interface PackingRequest {
  container: ContainerSpec;
  billets: BilletSpec[];
  options: PackingOptions;
}

const API_BASE = '/api/v1';

export async function optimizePacking(request: PackingRequest): Promise<PackingResponse> {
  // Strip undefined fields from billets before sending
  const cleanBillets = request.billets.map((b) => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(b)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned as BilletSpec;
  });

  const response = await fetch(`${API_BASE}/pack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      billets: cleanBillets,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = (errorData as { detail?: string }).detail || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return response.json();
}

export async function fetchPresets(): Promise<Record<string, { name: string; length: number; width: number; height: number }>> {
  const response = await fetch(`${API_BASE}/presets`);
  if (!response.ok) {
    throw new Error('Failed to fetch container presets');
  }
  const data = await response.json();
  return data.presets;
}
