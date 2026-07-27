"""Pydantic request/response schemas for the API."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional

from app.config import (
    MAX_CONTAINER_DIMENSION_MM,
    MAX_BILLET_DIMENSION_MM,
    MAX_TOTAL_BILLETS,
    MAX_BILLET_TYPE_QUANTITY,
)


# ── Request Schemas ──────────────────────────────────────────────

class ContainerSpecRequest(BaseModel):
    """Container dimensions in millimeters."""
    length: float = Field(..., gt=0, le=MAX_CONTAINER_DIMENSION_MM, description="容器长度 (mm)")
    width: float = Field(..., gt=0, le=MAX_CONTAINER_DIMENSION_MM, description="容器宽度 (mm)")
    height: float = Field(..., gt=0, le=MAX_CONTAINER_DIMENSION_MM, description="容器高度 (mm)")


class BilletSpecRequest(BaseModel):
    """Single billet type specification."""
    id: str = Field(..., min_length=1, max_length=50, description="钢坯型号标识")
    length: float = Field(..., gt=0, le=MAX_BILLET_DIMENSION_MM, description="钢坯长度 (mm)")
    width: float = Field(..., gt=0, le=MAX_BILLET_DIMENSION_MM, description="钢坯宽度 (mm)")
    height: float = Field(..., gt=0, le=MAX_BILLET_DIMENSION_MM, description="钢坯高度 (mm)")
    quantity: int = Field(..., gt=0, le=MAX_BILLET_TYPE_QUANTITY, description="数量")
    color: str = Field(default="#B87333", pattern=r"^#[0-9a-fA-F]{6}$", description="显示颜色 (hex)")

    @field_validator("id")
    @classmethod
    def id_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("钢坯ID不能为空")
        return v.strip()


class PackingOptionsRequest(BaseModel):
    """Packing algorithm options."""
    clearance_mm: float = Field(default=0.0, ge=0, le=200, description="钢坯间隙 (mm)")
    allow_rotation: bool = Field(default=True, description="是否允许旋转")
    rotation_axes: str = Field(default="all", pattern=r"^(all|vertical_only|none)$", description="旋转轴限制")
    optimize_for: str = Field(default="utilization", pattern=r"^(utilization|count)$", description="优化目标")
    gravity_stable: bool = Field(default=True, description="是否强制重力稳定")
    solver_timeout_ms: int = Field(default=30000, ge=1000, le=120000, description="求解超时 (ms)")


class PackingRequest(BaseModel):
    """Complete packing optimization request."""
    container: ContainerSpecRequest
    billets: list[BilletSpecRequest] = Field(..., min_length=1, max_length=20, description="钢坯类型列表")
    options: PackingOptionsRequest = Field(default_factory=PackingOptionsRequest)

    @field_validator("billets")
    @classmethod
    def validate_total_billets(cls, v: list[BilletSpecRequest]) -> list[BilletSpecRequest]:
        total = sum(b.quantity for b in v)
        if total > MAX_TOTAL_BILLETS:
            raise ValueError(f"钢坯总数 ({total}) 超过上限 ({MAX_TOTAL_BILLETS})")
        if total == 0:
            raise ValueError("钢坯总数不能为0")
        # Check for duplicate IDs
        ids = [b.id for b in v]
        if len(ids) != len(set(ids)):
            raise ValueError("钢坯ID不能重复")
        return v


# ── Response Schemas ─────────────────────────────────────────────

class PositionResponse(BaseModel):
    x: float
    y: float
    z: float


class DimensionsResponse(BaseModel):
    length: float
    width: float
    height: float


class PackedItemResponse(BaseModel):
    billet_id: str
    instance_id: int
    position: PositionResponse
    dimensions: DimensionsResponse
    rotation: str
    color: str


class UnplacedItemResponse(BaseModel):
    billet_id: str
    instance_id: int
    reason: str


class TypeMetricsResponse(BaseModel):
    placed: int
    unplaced: int
    placed_volume_m3: float


class LayerInfoResponse(BaseModel):
    z_min: float
    z_max: float
    item_count: int


class PackingMetricsResponse(BaseModel):
    total_billets: int
    placed_count: int
    unplaced_count: int
    container_volume_m3: float
    placed_volume_m3: float
    utilization_pct: float
    remaining_volume_m3: float
    by_type: dict[str, TypeMetricsResponse]
    compute_time_ms: float


class PackingResultData(BaseModel):
    packed_items: list[PackedItemResponse]
    unplaced_items: list[UnplacedItemResponse]
    metrics: PackingMetricsResponse
    layers: list[LayerInfoResponse]


class PackingResponse(BaseModel):
    success: bool
    result: Optional[PackingResultData] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str


class ContainerPresetResponse(BaseModel):
    name: str
    length: float
    width: float
    height: float
