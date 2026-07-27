"""Utility converters for unit and data transformation."""

from app.models.domain import (
    BilletSpec,
    ContainerSpec,
    PackingOptions,
    RotationAxes,
    OptimizeTarget,
)


def request_to_billet_spec(billet_req) -> BilletSpec:
    """Convert API request billet to domain BilletSpec."""
    return BilletSpec(
        id=billet_req.id,
        length=billet_req.length,
        width=billet_req.width,
        height=billet_req.height,
        quantity=billet_req.quantity,
        color=billet_req.color,
    )


def request_to_container_spec(container_req) -> ContainerSpec:
    """Convert API request container to domain ContainerSpec."""
    return ContainerSpec(
        length=container_req.length,
        width=container_req.width,
        height=container_req.height,
    )


def request_to_packing_options(options_req) -> PackingOptions:
    """Convert API request options to domain PackingOptions."""
    return PackingOptions(
        clearance_mm=options_req.clearance_mm,
        allow_rotation=options_req.allow_rotation,
        rotation_axes=RotationAxes(options_req.rotation_axes),
        optimize_for=OptimizeTarget(options_req.optimize_for),
        gravity_stable=options_req.gravity_stable,
        solver_timeout_ms=options_req.solver_timeout_ms,
    )


def mm3_to_m3(mm3: float) -> float:
    """Convert cubic millimeters to cubic meters."""
    return mm3 / 1_000_000_000.0
