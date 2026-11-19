"""Shared candidate definitions used by the dashboard and Python callers."""


def default_candidates():
    """Return fresh dictionaries so caller edits do not mutate shared defaults."""
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
