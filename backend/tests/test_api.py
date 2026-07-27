"""Tests for the API routes."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for health check."""

    def test_health_ok(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"


class TestPackEndpoint:
    """Tests for the packing optimization endpoint."""

    def test_simple_packing(self, client):
        """Basic successful packing request."""
        payload = {
            "container": {"length": 12000, "width": 2350, "height": 2390},
            "billets": [
                {
                    "id": "BL-150",
                    "length": 6000,
                    "width": 150,
                    "height": 150,
                    "quantity": 50,
                    "color": "#B87333",
                }
            ],
            "options": {"clearance_mm": 0, "allow_rotation": True},
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["result"] is not None
        assert data["result"]["metrics"]["total_billets"] == 50
        assert data["result"]["metrics"]["placed_count"] > 0
        assert len(data["result"]["packed_items"]) == data["result"]["metrics"]["placed_count"]

    def test_mixed_billets(self, client):
        """Packing with multiple billet types."""
        payload = {
            "container": {"length": 12000, "width": 2350, "height": 2390},
            "billets": [
                {"id": "A", "length": 6000, "width": 200, "height": 200, "quantity": 10, "color": "#FF0000"},
                {"id": "B", "length": 3000, "width": 150, "height": 150, "quantity": 20, "color": "#00FF00"},
            ],
            "options": {},
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "A" in data["result"]["metrics"]["by_type"]
        assert "B" in data["result"]["metrics"]["by_type"]

    def test_validation_empty_container(self, client):
        """Container with zero dimensions should be rejected."""
        payload = {
            "container": {"length": 0, "width": 2350, "height": 2390},
            "billets": [
                {"id": "A", "length": 6000, "width": 150, "height": 150, "quantity": 10, "color": "#FF0000"}
            ],
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 422

    def test_validation_duplicate_ids(self, client):
        """Duplicate billet IDs should be rejected."""
        payload = {
            "container": {"length": 12000, "width": 2350, "height": 2390},
            "billets": [
                {"id": "A", "length": 6000, "width": 150, "height": 150, "quantity": 10, "color": "#FF0000"},
                {"id": "A", "length": 3000, "width": 100, "height": 100, "quantity": 5, "color": "#00FF00"},
            ],
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 422

    def test_validation_invalid_color(self, client):
        """Invalid color hex should be rejected."""
        payload = {
            "container": {"length": 12000, "width": 2350, "height": 2390},
            "billets": [
                {"id": "A", "length": 6000, "width": 150, "height": 150, "quantity": 10, "color": "red"}
            ],
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 422

    def test_all_too_large(self, client):
        """All billets too large for container returns error."""
        payload = {
            "container": {"length": 100, "width": 100, "height": 100},
            "billets": [
                {"id": "huge", "length": 6000, "width": 1000, "height": 1000, "quantity": 1, "color": "#FF0000"}
            ],
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 400

    def test_packed_items_have_correct_structure(self, client):
        """Verify each packed item has all required fields."""
        payload = {
            "container": {"length": 5000, "width": 2000, "height": 2000},
            "billets": [
                {"id": "test", "length": 1000, "width": 500, "height": 400, "quantity": 10, "color": "#FF0000"}
            ],
            "options": {"clearance_mm": 0},
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        for item in data["result"]["packed_items"]:
            assert "billet_id" in item
            assert "instance_id" in item
            assert "position" in item
            assert "x" in item["position"]
            assert "y" in item["position"]
            assert "z" in item["position"]
            assert "dimensions" in item
            assert "length" in item["dimensions"]
            assert "width" in item["dimensions"]
            assert "height" in item["dimensions"]
            assert "rotation" in item
            assert "color" in item

    def test_layers_are_returned(self, client):
        """Layers should be returned in the response."""
        payload = {
            "container": {"length": 5000, "width": 2000, "height": 2000},
            "billets": [
                {"id": "test", "length": 1000, "width": 500, "height": 400, "quantity": 30, "color": "#FF0000"}
            ],
        }
        resp = client.post("/api/v1/pack", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["result"]["layers"]) > 0
