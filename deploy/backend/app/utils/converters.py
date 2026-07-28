"""Utility converters for unit and data transformation."""

import math

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
        shape=billet_req.shape,
        length=billet_req.length,
        width=billet_req.width,
        height=billet_req.height,
        diameter=billet_req.diameter,
        inner_diameter=billet_req.inner_diameter,
        side_length=billet_req.side_length,
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


def get_bounding_box(billet: BilletSpec) -> tuple[float, float, float]:
    """
    Return the rectangular bounding box (length, width, height) in mm for a billet.

    For rectangular billets, this is just (length, width, height).
    For non-rectangular shapes, this is the smallest enclosing rectangular box.
    """
    shape = billet.shape

    if shape == "rectangular":
        return (billet.length, billet.width, billet.height)
    elif shape == "cylinder":
        d = billet.diameter or 0.0
        return (billet.length, d, d)
    elif shape == "pipe":
        d = billet.diameter or 0.0
        return (billet.length, d, d)
    elif shape == "hexagonal":
        s = billet.side_length or 0.0
        # Flat-top hexagon: width = 2*s, height = s*sqrt(3)
        return (billet.length, 2.0 * s, s * math.sqrt(3))
    else:
        # Fallback for unknown shapes
        return (billet.length, billet.width, billet.height)


def compute_billet_volume(billet: BilletSpec) -> float:
    """
    Compute the actual geometric volume of a billet in mm³.

    Uses the real shape formula, not the bounding box volume.
    """
    shape = billet.shape

    if shape == "rectangular":
        return billet.length * billet.width * billet.height
    elif shape == "cylinder":
        d = billet.diameter or 0.0
        r = d / 2.0
        return billet.length * math.pi * r * r
    elif shape == "pipe":
        od = billet.diameter or 0.0
        id_ = billet.inner_diameter or 0.0
        outer_r = od / 2.0
        inner_r = id_ / 2.0
        return billet.length * math.pi * (outer_r * outer_r - inner_r * inner_r)
    elif shape == "hexagonal":
        s = billet.side_length or 0.0
        # Area of regular hexagon = (3*sqrt(3)/2) * s²
        area = (3.0 * math.sqrt(3) / 2.0) * s * s
        return billet.length * area
    else:
        # Fallback
        return billet.length * billet.width * billet.height
