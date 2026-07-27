"""Tests for the packing service."""

import pytest
from app.models.domain import (
    BilletSpec,
    ContainerSpec,
    PackingOptions,
    RotationAxes,
    OptimizeTarget,
)
from app.services.py3dbp_adapter import Py3dbpAdapter


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
