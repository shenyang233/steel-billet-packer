"""Packing service orchestrator.

Coordinates the packing algorithm, handles timeout, and provides
a clean interface for the API layer.
"""

import concurrent.futures
from app.models.domain import (
    BilletSpec,
    ContainerSpec,
    PackingOptions,
    PackingResult,
)
from app.utils.converters import get_bounding_box
from app.services.py3dbp_adapter import Py3dbpAdapter


def solve_packing(
    container: ContainerSpec,
    billets: list[BilletSpec],
    options: PackingOptions,
) -> PackingResult:
    """
    Solve the 3D bin packing problem for steel billets.

    Uses py3dbp as the primary solver with a timeout mechanism.
    Returns the best solution found within the time limit.

    Supports rectangular, cylinder, pipe, and hexagonal shapes —
    all packed via bounding-box approximation.

    Args:
        container: Target container dimensions
        billets: List of billet specifications with quantities
        options: Packing algorithm options

    Returns:
        PackingResult with packed items, unplaced items, metrics, and layers

    Raises:
        ValueError: If no billets can fit in the container at all
    """
    total_billets = sum(b.quantity for b in billets)
    if total_billets == 0:
        raise ValueError("钢坯总数为0，请至少添加一种钢坯")

    # Check if ANY billet can fit (pre-check using bounding box)
    container_dims = sorted([container.length, container.width, container.height], reverse=True)
    any_can_fit = False
    for billet in billets:
        bb_l, bb_w, bb_h = get_bounding_box(billet)
        billet_dims = sorted([bb_l, bb_w, bb_h], reverse=True)
        if all(billet_dims[i] <= container_dims[i] for i in range(3)):
            any_can_fit = True
            break

    if not any_can_fit:
        raise ValueError(
            "所有钢坯尺寸均超出容器范围，无法放入任何钢坯。请检查钢坯和容器尺寸。"
        )

    # Run the solver with timeout
    adapter = Py3dbpAdapter()

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(adapter.solve, container, billets, options)
            try:
                result = future.result(timeout=options.solver_timeout_ms / 1000.0)
                return result
            except concurrent.futures.TimeoutError:
                raise ValueError(
                    f"打包计算超时 ({options.solver_timeout_ms / 1000:.0f}秒)。"
                    f"请减少钢坯数量或增加超时时间。"
                )
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"打包计算失败: {str(e)}")
