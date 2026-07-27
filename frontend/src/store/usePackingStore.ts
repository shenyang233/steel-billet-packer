import { create } from 'zustand';
import type {
  ContainerSpec,
  BilletSpec,
  PackingOptions,
  PackingResultData,
  BilletShape,
} from '../types';
import { optimizePacking } from '../api/client';

const DEFAULT_COLORS = [
  '#B87333', // Copper
  '#C0C0C0', // Silver
  '#4682B4', // Steel Blue
  '#708090', // Slate Gray
  '#8B4513', // Saddle Brown
  '#D2691E', // Chocolate
  '#A0522D', // Sienna
  '#696969', // Dim Gray
];

interface PackingState {
  // Form state
  container: ContainerSpec;
  billets: BilletSpec[];
  options: PackingOptions;
  colorIndex: number;

  // Result state
  loading: boolean;
  error: string | null;
  result: PackingResultData | null;

  // Selection / hover state (cross-component sync)
  selectedBilletKey: string | null;
  hoveredBilletKey: string | null;

  // Actions
  setContainer: (container: Partial<ContainerSpec>) => void;
  setContainerPreset: (preset: ContainerSpec) => void;
  addBillet: (shape?: BilletShape) => void;
  updateBillet: (index: number, billet: Partial<BilletSpec>) => void;
  removeBillet: (index: number) => void;
  setOptions: (options: Partial<PackingOptions>) => void;
  optimize: () => Promise<void>;
  clearResult: () => void;
  setSelectedBilletKey: (key: string | null) => void;
  setHoveredBilletKey: (key: string | null) => void;
}

function createDefaultBillet(shape: BilletShape, index: number, color: string): BilletSpec {
  const base: BilletSpec = {
    id: `方坯-${150 + index * 10}`,
    shape,
    length: 6000,
    quantity: 50,
    color,
  };

  switch (shape) {
    case 'rectangular':
      base.id = `方坯-${150 + index * 10}`;
      base.width = 150;
      base.height = 150;
      break;
    case 'cylinder':
      base.id = `圆坯-${100 + index * 10}`;
      base.diameter = 150;
      break;
    case 'pipe':
      base.id = `管坯-${100 + index * 10}`;
      base.diameter = 150;
      base.innerDiameter = 100;
      break;
    case 'hexagonal':
      base.id = `六角坯-${50 + index * 10}`;
      base.sideLength = 80;
      break;
  }

  return base;
}

export const usePackingStore = create<PackingState>((set, get) => ({
  // Initial form state
  container: {
    length: 12000,
    width: 2350,
    height: 2390,
  },
  billets: [
    {
      id: '方坯-150',
      shape: 'rectangular' as BilletShape,
      length: 6000,
      width: 150,
      height: 150,
      quantity: 50,
      color: DEFAULT_COLORS[0],
    },
  ],
  options: {
    clearance_mm: 5,
    allow_rotation: true,
    rotation_axes: 'all',
    optimize_for: 'utilization',
    gravity_stable: true,
    solver_timeout_ms: 30000,
  },
  colorIndex: 1,

  // Result state
  loading: false,
  error: null,
  result: null,

  // Selection / hover state
  selectedBilletKey: null,
  hoveredBilletKey: null,

  // Actions
  setContainer: (partial) =>
    set((state) => ({
      container: { ...state.container, ...partial },
    })),

  setContainerPreset: (preset) =>
    set({ container: { ...preset } }),

  addBillet: (shape?: BilletShape) =>
    set((state) => {
      const idx = state.colorIndex % DEFAULT_COLORS.length;
      const targetShape = shape || 'rectangular';
      return {
        billets: [
          ...state.billets,
          createDefaultBillet(targetShape, state.billets.length, DEFAULT_COLORS[idx]),
        ],
        colorIndex: state.colorIndex + 1,
      };
    }),

  updateBillet: (index, partial) =>
    set((state) => ({
      billets: state.billets.map((b, i) =>
        i === index ? { ...b, ...partial } : b
      ),
    })),

  removeBillet: (index) =>
    set((state) => ({
      billets: state.billets.filter((_, i) => i !== index),
    })),

  setOptions: (partial) =>
    set((state) => ({
      options: { ...state.options, ...partial },
    })),

  optimize: async () => {
    const state = get();
    set({ loading: true, error: null, result: null });

    try {
      const response = await optimizePacking({
        container: state.container,
        billets: state.billets,
        options: state.options,
      });

      if (response.success && response.result) {
        set({ result: response.result, loading: false });
      } else {
        set({ error: response.error || '未知错误', loading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '请求失败',
        loading: false,
      });
    }
  },

  clearResult: () =>
    set({
      result: null,
      error: null,
      selectedBilletKey: null,
      hoveredBilletKey: null,
    }),

  setSelectedBilletKey: (key) => set({ selectedBilletKey: key }),
  setHoveredBilletKey: (key) => set({ hoveredBilletKey: key }),
}));
