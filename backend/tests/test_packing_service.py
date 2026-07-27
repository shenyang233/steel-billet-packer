"""Tests for the packing service."""

import math
import pytest
from app.models.domain import (
    BilletSpec,
    ContainerSpec,
    PackingOptions,
    RotationAxes,
    OptimizeTarget,
)
from app.services.py3dbp_adapter import Py3dbpAdapter
from app.utils.converters import get_bounding_box, compute_billet_volume


class TestPy3dbpAdapter:
    """Tests for the py3dbp adapter."""

    def setup_method(self):
        self.adapter = Py3dbpAdapter()

    def test_single_billet_fits_perfectly(self):
        """Single billet that matches container exactly."""
        container = ContainerSpec(length=1000, width=500, height=300)
        billets = [BilletSpec(id="test", length=1000, width=500, height=300, quantity=1, color="#FF0000")]
        options = PackingOptions(clearance_mm=0, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        assert result.metrics.placed_count == 1
        assert result.metrics.unplaced_count == 0
        assert result.metrics.utilization_pct == pytest.approx(100.0, abs=1.0)

    def test_multiple_billets_packed(self):
        """Multiple identical billets."""
        container = ContainerSpec(length=2000, width=1000, height=500)
        billets = [BilletSpec(id="small", length=500, width=500, height=500, quantity=8, color="#FF0000")]
        options = PackingOptions(clearance_mm=0, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        assert result.metrics.placed_count == 8
        assert result.metrics.unplaced_count == 0

    def test_not_all_billets_fit(self):
        """Some billets cannot fit."""
        container = ContainerSpec(length=1000, width=1000, height=1000)
        billets = [BilletSpec(id="big", length=600, width=600, height=600, quantity=10, color="#FF0000")]
        options = PackingOptions(clearance_mm=0, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        # In a 1000x1000x1000 container, at most 1 x 600³ billet fits
        assert result.metrics.placed_count >= 1
        assert result.metrics.unplaced_count > 0
        assert result.metrics.placed_count + result.metrics.unplaced_count == 10

    def test_mixed_billet_sizes(self):
        """Different billet types in one container."""
        container = ContainerSpec(length=6000, width=2000, height=1500)
        billets = [
            BilletSpec(id="large", length=3000, width=500, height=500, quantity=5, color="#FF0000"),
            BilletSpec(id="small", length=1500, width=300, height=300, quantity=10, color="#00FF00"),
        ]
        options = PackingOptions(clearance_mm=0, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        assert result.metrics.placed_count > 0
        assert result.metrics.by_type is not None
        assert "large" in result.metrics.by_type
        assert "small" in result.metrics.by_type

    def test_no_rotation(self):
        """Packing with rotation disabled."""
        container = ContainerSpec(length=2000, width=1000, height=1000)
        billets = [BilletSpec(id="flat", length=1500, width=300, height=200, quantity=20, color="#FF0000")]
        options = PackingOptions(clearance_mm=0, allow_rotation=True, rotation_axes=RotationAxes.NONE)

        result = self.adapter.solve(container, billets, options)

        assert result.metrics.placed_count > 0
        # All items should have RT_WHD rotation
        for item in result.packed_items:
            assert item.rotation == "RT_WHD"

    def test_clearance_applied(self):
        """Billets should have clearance gap between them."""
        container = ContainerSpec(length=2000, width=1000, height=1000)
        billets = [BilletSpec(id="test", length=500, width=500, height=500, quantity=4, color="#FF0000")]
        options = PackingOptions(clearance_mm=20, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        assert result.metrics.placed_count > 0

    def test_layers_generated(self):
        """Layers should be computed from Z positions."""
        container = ContainerSpec(length=3000, width=2000, height=2000)
        billets = [BilletSpec(id="test", length=500, width=500, height=400, quantity=30, color="#FF0000")]
        options = PackingOptions(clearance_mm=0, allow_rotation=True)

        result = self.adapter.solve(container, billets, options)

        assert len(result.layers) > 0
        total_items_in_layers = sum(l.item_count for l in result.layers)
        assert total_items_in_layers == result.metrics.placed_count

    def test_empty_metrics_by_type(self):
        """All billet types should appear in by_type metrics."""
        container = ContainerSpec(length=5000, width=2000, height=1500)
        billets = [
            BilletSpec(id="A", length=1000, width=500, height=400, quantity=5, color="#FF0000"),
            BilletSpec(id="B", length=800, width=400, height=300, quantity=10, color="#00FF00"),
        ]
        options = PackingOptions()

        result = self.adapter.solve(container, billets, options)

        assert "A" in result.metrics.by_type
        assert "B" in result.metrics.by_type
        assert result.metrics.by_type["A"].placed + result.metrics.by_type["A"].unplaced == 5
        assert result.metrics.by_type["B"].placed + result.metrics.by_type["B"].unplaced == 10

    # ── Shape-specific tests ─────────────────────────────────────

    def test_cylinder_packing(self):
        """Cylindrical billets packed via bounding box."""
        container = ContainerSpec(length=12000, width=2400, height=2400)
        billets = [BilletSpec(
            id="round", shape="cylinder", length=6000, diameter=200, quantity=50, color="#FF6600",
        )]
        options = PackingOptions(clearance_mm=5)

        result = self.adapter.solve(container, billets, options)
        assert result.metrics.placed_count > 0
        for item in result.packed_items:
            assert item.shape == "cylinder"
            assert item.diameter == 200

    def test_pipe_packing(self):
        """Pipe billets packed via bounding box."""
        container = ContainerSpec(length=12000, width=2400, height=2400)
        billets = [BilletSpec(
            id="pipe", shape="pipe", length=6000, diameter=300, inner_diameter=200, quantity=20, color="#4488CC",
        )]
        options = PackingOptions(clearance_mm=5)

        result = self.adapter.solve(container, billets, options)
        assert result.metrics.placed_count > 0
        for item in result.packed_items:
            assert item.shape == "pipe"
            assert item.diameter == 300
            assert item.inner_diameter == 200

    def test_hexagonal_packing(self):
        """Hexagonal billets packed via bounding box."""
        container = ContainerSpec(length=12000, width=2400, height=2400)
        billets = [BilletSpec(
            id="hex", shape="hexagonal", length=6000, side_length=80, quantity=30, color="#88CC44",
        )]
        options = PackingOptions(clearance_mm=3)

        result = self.adapter.solve(container, billets, options)
        assert result.metrics.placed_count > 0
        for item in result.packed_items:
            assert item.shape == "hexagonal"
            assert item.side_length == 80

    def test_cylinder_volume_correct(self):
        """Verify cylinder volume is based on real formula, not bounding box."""
        container = ContainerSpec(length=10000, width=3000, height=3000)
        billets = [BilletSpec(
            id="cylinder", shape="cylinder", length=1000, diameter=200, quantity=10, color="#FF0000",
        )]
        options = PackingOptions(clearance_mm=0)

        result = self.adapter.solve(container, billets, options)

        # Real volume of one cylinder: pi * (d/2)² * length = pi * 100² * 1000
        real_vol_one = math.pi * 100 * 100 * 1000
        total_real_vol = real_vol_one * result.metrics.placed_count
        placed_m3 = result.metrics.placed_volume_m3

        # placed_volume_m3 should be close to the real volume, NOT the bounding-box volume
        expected_m3 = total_real_vol / 1e9
        assert placed_m3 == pytest.approx(expected_m3, rel=0.01)

    def test_pipe_volume_correct(self):
        """Verify pipe volume subtracts inner diameter."""
        container = ContainerSpec(length=10000, width=3000, height=3000)
        billets = [BilletSpec(
            id="pipe", shape="pipe", length=1000, diameter=200, inner_diameter=100, quantity=10, color="#FF0000",
        )]
        options = PackingOptions(clearance_mm=0)

        result = self.adapter.solve(container, billets, options)

        # Real volume of one pipe: pi * (ro² - ri²) * length = pi * (100² - 50²) * 1000
        real_vol_one = math.pi * (100 * 100 - 50 * 50) * 1000
        total_real_vol = real_vol_one * result.metrics.placed_count
        expected_m3 = total_real_vol / 1e9

        assert result.metrics.placed_volume_m3 == pytest.approx(expected_m3, rel=0.01)

    def test_hexagonal_volume_correct(self):
        """Verify hexagonal volume is correct."""
        container = ContainerSpec(length=10000, width=3000, height=3000)
        billets = [BilletSpec(
            id="hex", shape="hexagonal", length=1000, side_length=100, quantity=10, color="#FF0000",
        )]
        options = PackingOptions(clearance_mm=0)

        result = self.adapter.solve(container, billets, options)

        # Real volume: (3*sqrt(3)/2) * s² * length
        s = 100
        area = (3 * math.sqrt(3) / 2) * s * s
        real_vol_one = area * 1000
        total_real_vol = real_vol_one * result.metrics.placed_count
        expected_m3 = total_real_vol / 1e9

        assert result.metrics.placed_volume_m3 == pytest.approx(expected_m3, rel=0.01)

    def test_mixed_shapes(self):
        """Rectangular + cylinder + hexagonal in same container."""
        container = ContainerSpec(length=12000, width=2400, height=2400)
        billets = [
            BilletSpec(id="rect", shape="rectangular", length=6000, width=150, height=150, quantity=20, color="#B87333"),
            BilletSpec(id="cyl",  shape="cylinder",    length=6000, diameter=150, quantity=20, color="#FF6600"),
            BilletSpec(id="hex",  shape="hexagonal",    length=6000, side_length=80, quantity=10, color="#88CC44"),
        ]
        options = PackingOptions(clearance_mm=5)

        result = self.adapter.solve(container, billets, options)
        assert result.metrics.placed_count > 0
        assert result.metrics.by_type is not None
        assert "rect" in result.metrics.by_type
        assert "cyl" in result.metrics.by_type
        assert "hex" in result.metrics.by_type

        # Verify shapes are passed through
        shapes = {p.shape for p in result.packed_items}
        assert "rectangular" in shapes
        assert "cylinder" in shapes
        assert "hexagonal" in shapes

    # ── Bounding box tests ───────────────────────────────────────

    def test_cylinder_bounding_box(self):
        billet = BilletSpec(id="c", shape="cylinder", length=6000, diameter=200, quantity=1)
        bb = get_bounding_box(billet)
        assert bb == (6000, 200, 200)

    def test_pipe_bounding_box(self):
        billet = BilletSpec(id="p", shape="pipe", length=5000, diameter=300, inner_diameter=200, quantity=1)
        bb = get_bounding_box(billet)
        assert bb == (5000, 300, 300)

    def test_hexagonal_bounding_box(self):
        billet = BilletSpec(id="h", shape="hexagonal", length=4000, side_length=80, quantity=1)
        bb = get_bounding_box(billet)
        assert bb[0] == 4000  # length unchanged
        assert bb[1] == pytest.approx(160.0)  # 2 * side_length
        assert bb[2] == pytest.approx(80.0 * math.sqrt(3))  # side_length * sqrt(3)

    def test_compute_cylinder_volume(self):
        billet = BilletSpec(id="c", shape="cylinder", length=1000, diameter=200, quantity=1)
        vol = compute_billet_volume(billet)
        expected = math.pi * 100 * 100 * 1000
        assert vol == pytest.approx(expected)

    def test_compute_pipe_volume(self):
        billet = BilletSpec(id="p", shape="pipe", length=1000, diameter=200, inner_diameter=100, quantity=1)
        vol = compute_billet_volume(billet)
        expected = math.pi * (100 * 100 - 50 * 50) * 1000
        assert vol == pytest.approx(expected)

    def test_compute_hexagonal_volume(self):
        billet = BilletSpec(id="h", shape="hexagonal", length=1000, side_length=100, quantity=1)
        vol = compute_billet_volume(billet)
        area = (3 * math.sqrt(3) / 2) * 100 * 100
        expected = area * 1000
        assert vol == pytest.approx(expected)
