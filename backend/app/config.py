"""Application configuration."""

# Default container presets (in mm)
CONTAINER_PRESETS = {
    "20ft": {
        "name": "20ft 集装箱",
        "length": 5898,
        "width": 2352,
        "height": 2393,
    },
    "40ft": {
        "name": "40ft 集装箱",
        "length": 12032,
        "width": 2352,
        "height": 2393,
    },
    "40ft-hc": {
        "name": "40ft 高柜",
        "length": 12032,
        "width": 2352,
        "height": 2698,
    },
    "truck-9m": {
        "name": "9.6m 货车",
        "length": 9600,
        "width": 2400,
        "height": 2500,
    },
    "truck-13m": {
        "name": "13m 货车",
        "length": 13000,
        "width": 2400,
        "height": 2500,
    },
}

# Solver defaults
DEFAULT_SOLVER_TIMEOUT_MS = 30000
DEFAULT_CLEARANCE_MM = 0
DEFAULT_ALLOW_ROTATION = True
DEFAULT_ROTATION_AXES = "all"
DEFAULT_OPTIMIZE_FOR = "utilization"
DEFAULT_GRAVITY_STABLE = True
DEFAULT_SUPPORT_SURFACE_RATIO = 0.75

# Limits
MAX_CONTAINER_DIMENSION_MM = 50000
MAX_BILLET_DIMENSION_MM = 30000
MAX_TOTAL_BILLETS = 10000
MAX_BILLET_TYPE_QUANTITY = 5000
