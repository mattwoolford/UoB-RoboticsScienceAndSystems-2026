"""Shared defaults and setup for independently runnable notebook entry cells."""


def default_candidates():
    """Return fresh dictionaries so notebook edits do not mutate shared defaults."""
    return [
        dict(model_id="balanced_low", gain_imbalance=0.0, motor_tau_ms=80.0,
             wheel_noise_fraction=0.02, sensor_noise_counts=0.0),
        dict(model_id="balanced_high", gain_imbalance=0.0, motor_tau_ms=80.0,
             wheel_noise_fraction=0.08, sensor_noise_counts=0.0),
        dict(model_id="right_fast", gain_imbalance=0.015, motor_tau_ms=80.0,
             wheel_noise_fraction=0.02, sensor_noise_counts=0.0),
        dict(model_id="left_fast", gain_imbalance=-0.015, motor_tau_ms=80.0,
             wheel_noise_fraction=0.02, sensor_noise_counts=0.0),
    ]


COLORS = {"sterile": "#30343b", "balanced_low": "#0072B2",
          "balanced_high": "#D55E00", "right_fast": "#8a6f00", "left_fast": "#a64d79"}
LABELS = {"sterile": "Sterile", "balanced_low": "Balanced, low noise",
          "balanced_high": "Balanced, high noise", "right_fast": "Right wheel faster",
          "left_fast": "Left wheel faster"}


def initialize_notebook(namespace):
    """Supply missing setup only, preserving settings already chosen in the notebook."""
    from pathlib import Path
    from datetime import datetime, timezone
    import hashlib
    import importlib.metadata
    import json
    import os
    import sys
    import uuid
    import numpy as np
    import pandas as pd
    import matplotlib.pyplot as plt
    from IPython.display import display, Markdown
    from simulation_runner import SimulationRunner, select_candidates
    from workbook_results import read_simulations
    from analysis import centrepoint_drift, load_observations, score_models

    root = Path(__file__).resolve().parents[1]
    if 'plt' not in namespace:
        plt.rcParams.update({"figure.figsize": (10, 4.5), "figure.dpi": 120,
                             "font.size": 11, "axes.spines.top": False,
                             "axes.spines.right": False, "axes.grid": True,
                             "grid.alpha": 0.2, "axes.axisbelow": True})
        pd.options.display.float_format = "{:.4f}".format
    defaults = {
        "Path": Path, "datetime": datetime, "timezone": timezone,
        "hashlib": hashlib, "importlib": importlib, "json": json, "os": os,
        "sys": sys, "uuid": uuid, "np": np, "pd": pd, "plt": plt,
        "display": display, "Markdown": Markdown,
        "ROOT": root, "WORKBOOK": root / "experiments/data/straight_line_results.xlsx",
        "read_simulations": read_simulations, "SimulationRunner": SimulationRunner,
        "select_candidates": select_candidates,
        "centrepoint_drift": centrepoint_drift, "load_observations": load_observations,
        "score_models": score_models,
        "PROCESSING_RESOURCES": Path(os.environ.get(
            "PROCESSING_RESOURCES", "/Applications/Processing.app/Contents/app/resources")),
        "LIVE_PROCESSING": True, "N_RUNS": 24, "BASE_SEED": 2026,
        "FIT_TIMES": np.arange(3.0, 31.0, 1.0),
        "CANDIDATES": default_candidates(), "COLORS": dict(COLORS), "LABELS": dict(LABELS),
    }
    for name, value in defaults.items():
        namespace.setdefault(name, value)
