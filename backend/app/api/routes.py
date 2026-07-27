"""API routes for the steel billet packing optimizer."""

import time
from fastapi import APIRouter, HTTPException

from app.config import CONTAINER_PRESETS
from app.models.schemas import (
    PackingRequest,
    PackingResponse,
    PackingResultData,
    PackingMetricsResponse,
    PackedItemResponse,
    UnplacedItemResponse,
    TypeMetricsResponse,
    LayerInfoResponse,
    PositionResponse,
    DimensionsResponse,
    HealthResponse,
    ContainerPresetResponse,
)
from app.utils.converters import (
    request_to_billet_spec,
    request_to_container_spec,
    request_to_packing_options,
)
from app.services.packing_service import solve_packing

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="ok", version="1.0.0")


@router.get("/presets")
async def get_presets():
    """Get available container presets."""
    return {"presets": CONTAINER_PRESETS}


@router.post("/pack", response_model=PackingResponse)
async def optimize_packing(request: PackingRequest):
    """
    Optimize steel billet packing in a container.

    Accepts container dimensions, multiple billet types with quantities,
    and returns the optimal packing arrangement with 3D positions.
    """
    start_time = time.time()

    try:
        # Convert request to domain models
        container = request_to_container_spec(request.container)
        billets = [request_to_billet_spec(b) for b in request.billets]
        options = request_to_packing_options(request.options)

        # Run packing algorithm
        result = solve_packing(container, billets, options)

        compute_time_ms = (time.time() - start_time) * 1000.0
        result.metrics.compute_time_ms = round(compute_time_ms, 1)

        # Convert result to response
        packed_items = [
            PackedItemResponse(
                billet_id=item.billet_id,
                instance_id=item.instance_id,
                position=PositionResponse(x=item.position.x, y=item.position.y, z=item.position.z),
                dimensions=DimensionsResponse(
                    length=item.dimensions.length,
                    width=item.dimensions.width,
                    height=item.dimensions.height,
                ),
                rotation=item.rotation,
                color=item.color,
            )
            for item in result.packed_items
        ]

        unplaced_items = [
            UnplacedItemResponse(
                billet_id=item.billet_id,
                instance_id=item.instance_id,
                reason=item.reason,
            )
            for item in result.unplaced_items
        ]

        by_type = {}
        if result.metrics and result.metrics.by_type:
            by_type = {
                k: TypeMetricsResponse(
                    placed=v.placed,
                    unplaced=v.unplaced,
                    placed_volume_m3=round(v.placed_volume_m3, 6),
                )
                for k, v in result.metrics.by_type.items()
            }

        layers = [
            LayerInfoResponse(
                z_min=layer.z_min,
                z_max=layer.z_max,
                item_count=layer.item_count,
            )
            for layer in result.layers
        ]

        metrics = PackingMetricsResponse(
            total_billets=result.metrics.total_billets,
            placed_count=result.metrics.placed_count,
            unplaced_count=result.metrics.unplaced_count,
            container_volume_m3=round(result.metrics.container_volume_m3, 6),
            placed_volume_m3=round(result.metrics.placed_volume_m3, 6),
            utilization_pct=round(result.metrics.utilization_pct, 2),
            remaining_volume_m3=round(result.metrics.remaining_volume_m3, 6),
            by_type=by_type,
            compute_time_ms=result.metrics.compute_time_ms,
        )

        return PackingResponse(
            success=True,
            result=PackingResultData(
                packed_items=packed_items,
                unplaced_items=unplaced_items,
                metrics=metrics,
                layers=layers,
            ),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"打包计算失败: {str(e)}")
