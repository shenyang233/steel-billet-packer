/* TypeScript interfaces matching the backend API */

export interface ContainerSpec {
  length: number;
  width: number;
  height: number;
}

export interface BilletSpec {
  id: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  color: string;
}

export interface PackingOptions {
  clearance_mm: number;
  allow_rotation: boolean;
  rotation_axes: 'all' | 'vertical_only' | 'none';
  optimize_for: 'utilization' | 'count';
  gravity_stable: boolean;
  solver_timeout_ms: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface PackedItem {
  billet_id: string;
  instance_id: number;
  position: Position;
  dimensions: Dimensions;
  rotation: string;
  color: string;
}

export interface UnplacedItem {
  billet_id: string;
  instance_id: number;
  reason: string;
}

export interface TypeMetrics {
  placed: number;
  unplaced: number;
  placed_volume_m3: number;
}

export interface LayerInfo {
  z_min: number;
  z_max: number;
  item_count: number;
}

export interface PackingMetrics {
  total_billets: number;
  placed_count: number;
  unplaced_count: number;
  container_volume_m3: number;
  placed_volume_m3: number;
  utilization_pct: number;
  remaining_volume_m3: number;
  by_type: Record<string, TypeMetrics>;
  compute_time_ms: number;
}

export interface PackingResultData {
  packed_items: PackedItem[];
  unplaced_items: UnplacedItem[];
  metrics: PackingMetrics;
  layers: LayerInfo[];
}

export interface PackingResponse {
  success: boolean;
  result: PackingResultData | null;
  error: string | null;
}

export interface ContainerPreset {
  name: string;
  length: number;
  width: number;
  height: number;
}
