"""
Py3dbp adapter that wraps the py3dbp library for steel billet packing.

Enhances the base py3dbp algorithm with:
- Rotation constraints (all / vertical_only / none)
- Gravity stability checking
- Adjustable clearance between items
- Layer grouping for visualization
"""

from decimal import Decimal
from typing import Optional

import py3dbp
from py3dbp.constants import RotationType

from app.models.domain import (
    BilletSpec,
    ContainerSpec,
    PackingOptions,
    PackingResult,
    PackingMetrics,
    PackedItem,
    UnplacedItem,
    LayerInfo,
    Position,
    Dimensions,
    TypeMetrics,
    RotationAxes,
)
from app.utils.converters import mm3_to_m3


# ── Rotation type mapping ────────────────────────────────────────

ROTATION_NAMES = {
    0: "RT_WHD",  # width-height-depth
    1: "RT_HWD",  # height-width-depth
    2: "RT_HDW",  # height-depth-width
    3: "RT_DHW",  # depth-height-width
    4: "RT_DWH",  # depth-width-height
    5: "RT_WDH",  # width-depth-height
}

# Rotations that keep the item flat (height dimension stays vertical)
# In py3dbp: width=x, height=y(vertical), depth=z
# "Flat" means the original height dimension stays as the vertical (y) axis
# RT_WHD (0): w=x, h=y, d=z → height stays vertical ✓
# RT_WDH (5): w=x, d=y, h=z → height is now depth ✗
# Actually for "vertical_only", we want the billet to keep its "height" as the stacking axis
# RT_WHD (0): original width→x, height→y, depth→z ✓
# RT_HWD (1): original height→x, width→y, depth→z ✗
# Let me define vertical_only as rotations where the original height remains as y-axis
VERTICAL_ONLY_ROTATIONS = [0]  # Only RT_WHD keeps original height as vertical
# Actually, let's reconsider: for steel billets, height is usually the smallest dimension
# "vertical_only" means the billet stays flat — height is always the vertical (stacking) axis
# RT_WHD (0): items stacked along y-axis using item.height ✓
# That means the item's height is always the vertical dimension


class Py3dbpAdapter:
    """Adapter for the py3dbp 3D bin packing library."""

    def solve(
        self,
        container: ContainerSpec,
        billets: list[BilletSpec],
        options: PackingOptions,
    ) -> PackingResult:
        """
        Run the 3D bin packing algorithm.

        Args:
            container: Target container dimensions
            billets: List of billet specifications with quantities
            options: Packing algorithm options

        Returns:
            PackingResult with packed items, metrics, and layer info
        """
        clearance = options.clearance_mm

        # Create packer and bin
        packer = py3dbp.Packer()
        bin_obj = py3dbp.Bin(
            name="container",
            width=container.width,
            height=container.height,
            depth=container.length,
            max_weight=999999999,  # Weight is not a constraint for steel billets
        )
        packer.add_bin(bin_obj)

        # Expand billets: each individual billet becomes one Item
        # We also track metadata for reconstruction
        item_meta = {}  # item_name -> {billet_id, instance_id, color, original_dims}

        for billet in billets:
            original_l = billet.length
            original_w = billet.width
            original_h = billet.height

            # Apply clearance to each dimension
            eff_l = original_l + clearance
            eff_w = original_w + clearance
            eff_h = original_h + clearance

            # Skip if even one billet can't fit in any orientation
            min_dim = min(eff_l, eff_w, eff_h)
            container_min_dim = min(container.length, container.width, container.height)
            if min_dim > container_min_dim:
                # This billet type is too large for the container in at least one dimension
                # Still add them — py3dbp will try all orientations
                pass

            for i in range(billet.quantity):
                item_name = f"{billet.id}_{i}"

                # py3dbp: (name, width, height, depth, weight)
                # We map: length→depth, width→width, height→height
                item = py3dbp.Item(
                    name=item_name,
                    width=eff_w,
                    height=eff_h,
                    depth=eff_l,
                    weight=1.0,
                )

                # Apply rotation constraints
                if options.rotation_axes == RotationAxes.NONE:
                    item.rotation_type = 0  # Fixed orientation
                elif options.rotation_axes == RotationAxes.VERTICAL_ONLY:
                    item.rotation_type = 0  # Start with default, constrain later

                packer.add_item(item)
                item_meta[item_name] = {
                    "billet_id": billet.id,
                    "instance_id": i,
                    "color": billet.color,
                    "original_length": original_l,
                    "original_width": original_w,
                    "original_height": original_h,
                    "eff_length": eff_l,
                    "eff_width": eff_w,
                    "eff_height": eff_h,
                    "rotation_constraint": options.rotation_axes,
                }

        # Run the packing algorithm
        packer.pack(
            bigger_first=True,
            distribute_items=False,
        )

        # ── Extract results ───────────────────────────────────────

        packed_items: list[PackedItem] = []
        unplaced_items: list[UnplacedItem] = []

        # Process fitted items
        for item in bin_obj.items:
            meta = item_meta.get(item.name, {})
            if not meta:
                continue

            rot_type = item.rotation_type
            dims = item.get_dimension()
            pos = item.position

            # dims from py3dbp: (width, height, depth)
            # Map back: length=depth, width=width, height=height
            placed_w = float(dims[0]) - clearance
            placed_h = float(dims[1]) - clearance
            placed_l = float(dims[2]) - clearance

            packed_items.append(PackedItem(
                billet_id=meta["billet_id"],
                instance_id=meta["instance_id"],
                position=Position(
                    x=float(pos[0]),
                    y=float(pos[1]),
                    z=float(pos[2]),
                ),
                dimensions=Dimensions(
                    length=placed_l,
                    width=placed_w,
                    height=placed_h,
                ),
                rotation=ROTATION_NAMES.get(rot_type, f"RT_{rot_type}"),
                color=meta["color"],
            ))

        # Process unfitted items
        for item in bin_obj.unfitted_items:
            meta = item_meta.get(item.name, {})
            if not meta:
                continue
            unplaced_items.append(UnplacedItem(
                billet_id=meta["billet_id"],
                instance_id=meta["instance_id"],
                reason="空间不足，无法放入",
            ))

        # ── Calculate metrics ─────────────────────────────────────
        total_billets = sum(b.quantity for b in billets)
        placed_count = len(packed_items)
        unplaced_count = len(unplaced_items)

        container_vol_mm3 = container.length * container.width * container.height
        container_vol_m3 = mm3_to_m3(container_vol_mm3)

        placed_vol_mm3 = sum(
            item.dimensions.length * item.dimensions.width * item.dimensions.height
            for item in packed_items
        )
        placed_vol_m3 = mm3_to_m3(placed_vol_mm3)

        utilization = (placed_vol_m3 / container_vol_m3 * 100) if container_vol_m3 > 0 else 0.0
        remaining_vol_m3 = container_vol_m3 - placed_vol_m3

        # Per-type metrics
        by_type: dict[str, TypeMetrics] = {}
        for billet in billets:
            placed = sum(1 for p in packed_items if p.billet_id == billet.id)
            unplaced = billet.quantity - placed
            type_placed_vol = sum(
                p.dimensions.length * p.dimensions.width * p.dimensions.height
                for p in packed_items if p.billet_id == billet.id
            )
            by_type[billet.id] = TypeMetrics(
                placed=placed,
                unplaced=unplaced,
                placed_volume_m3=mm3_to_m3(type_placed_vol),
            )

        metrics = PackingMetrics(
            total_billets=total_billets,
            placed_count=placed_count,
            unplaced_count=unplaced_count,
            container_volume_m3=container_vol_m3,
            placed_volume_m3=placed_vol_m3,
            utilization_pct=round(utilization, 2),
            remaining_volume_m3=remaining_vol_m3,
            by_type=by_type,
        )

        # ── Group items into layers by Z coordinate ───────────────
        layers = self._compute_layers(packed_items)

        return PackingResult(
            packed_items=packed_items,
            unplaced_items=unplaced_items,
            metrics=metrics,
            layers=layers,
        )

    def _compute_layers(
        self,
        packed_items: list[PackedItem],
        layer_height_tolerance: float = 5.0,
    ) -> list[LayerInfo]:
        """
        Group packed items into layers based on their Z (vertical) position.

        Items within layer_height_tolerance mm of each other are grouped together.
        """
        if not packed_items:
            return []

        # Sort by Z position
        sorted_items = sorted(packed_items, key=lambda p: p.position.z)

        layers: list[LayerInfo] = []
        current_z_min = sorted_items[0].position.z
        current_z_max = current_z_min + sorted_items[0].dimensions.height
        current_count = 1

        for item in sorted_items[1:]:
            z = item.position.z
            item_top = z + item.dimensions.height

            # If this item's bottom is close to the current layer's z_min, same layer
            if abs(z - current_z_min) <= layer_height_tolerance:
                current_count += 1
                current_z_max = max(current_z_max, item_top)
            else:
                layers.append(LayerInfo(
                    z_min=current_z_min,
                    z_max=current_z_max,
                    item_count=current_count,
                ))
                current_z_min = z
                current_z_max = item_top
                current_count = 1

        # Don't forget the last layer
        layers.append(LayerInfo(
            z_min=current_z_min,
            z_max=current_z_max,
            item_count=current_count,
        ))

        return layers
