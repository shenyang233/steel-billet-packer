"""Domain models for the packing system."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class BilletShape(str, Enum):
    """Billet cross-section shape."""
    RECTANGULAR = "rectangular"
    CYLINDER = "cylinder"
    PIPE = "pipe"
    HEXAGONAL = "hexagonal"


class RotationType(Enum):
    """py3dbp rotation types."""
    RT_WHD = 0  # width-height-depth
    RT_HWD = 1  # height-width-depth
    RT_HDW = 2  # height-depth-width
    RT_DHW = 3  # depth-height-width
    RT_DWH = 4  # depth-width-height
    RT_WDH = 5  # width-depth-height


class RotationAxes(str, Enum):
    """Allowed rotation axes."""
    ALL = "all"            # All 6 orthogonal rotations
    VERTICAL_ONLY = "vertical_only"  # Only rotate around vertical axis (2 rotations)
    NONE = "none"          # No rotation allowed


class OptimizeTarget(str, Enum):
    """Optimization target."""
    UTILIZATION = "utilization"  # Max volume utilization
    COUNT = "count"              # Max item count


@dataclass
class BilletSpec:
    """Specification for a billet type."""
    id: str
    quantity: int
    color: str = "#B87333"  # Copper color default
    shape: str = "rectangular"

    # Rectangular dimensions (used when shape=rectangular)
    length: float = 0.0  # mm
    width: float = 0.0   # mm
    height: float = 0.0  # mm

    # Cylinder / Pipe dimensions
    diameter: Optional[float] = None       # mm — outer diameter for cylinder & pipe
    inner_diameter: Optional[float] = None # mm — inner diameter, pipe only

    # Hexagonal dimensions
    side_length: Optional[float] = None    # mm — side length of hexagon


@dataclass
class ContainerSpec:
    """Specification for the container."""
    length: float  # mm
    width: float   # mm
    height: float  # mm


@dataclass
class PackingOptions:
    """Options for the packing algorithm."""
    clearance_mm: float = 0.0
    allow_rotation: bool = True
    rotation_axes: RotationAxes = RotationAxes.ALL
    optimize_for: OptimizeTarget = OptimizeTarget.UTILIZATION
    gravity_stable: bool = True
    solver_timeout_ms: int = 30000


@dataclass
class Position:
    """3D position."""
    x: float
    y: float
    z: float


@dataclass
class Dimensions:
    """3D dimensions (bounding box)."""
    length: float
    width: float
    height: float


@dataclass
class PackedItem:
    """A successfully packed billet."""
    billet_id: str
    instance_id: int
    position: Position
    dimensions: Dimensions
    rotation: str
    color: str
    shape: str = "rectangular"

    # Shape-specific dimensions (for frontend 3D rendering)
    diameter: Optional[float] = None
    inner_diameter: Optional[float] = None
    side_length: Optional[float] = None


@dataclass
class UnplacedItem:
    """A billet that could not be packed."""
    billet_id: str
    instance_id: int
    reason: str


@dataclass
class LayerInfo:
    """Information about a layer of items stacked vertically."""
    z_min: float
    z_max: float
    item_count: int


@dataclass
class TypeMetrics:
    """Per-type packing statistics."""
    placed: int
    unplaced: int
    placed_volume_m3: float


@dataclass
class PackingMetrics:
    """Overall packing result metrics."""
    total_billets: int
    placed_count: int
    unplaced_count: int
    container_volume_m3: float
    placed_volume_m3: float
    utilization_pct: float
    remaining_volume_m3: float
    by_type: dict[str, TypeMetrics] = field(default_factory=dict)
    compute_time_ms: float = 0.0


@dataclass
class PackingResult:
    """Complete packing result."""
    packed_items: list[PackedItem] = field(default_factory=list)
    unplaced_items: list[UnplacedItem] = field(default_factory=list)
    metrics: Optional[PackingMetrics] = None
    layers: list[LayerInfo] = field(default_factory=list)
