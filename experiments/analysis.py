"""Centrepoint projection, observation validation, and held-out model scoring."""
import numpy as np
import pandas as pd


def centrepoint_drift(frame, origin=(0.0, 0.0), heading_rad=0.0):
    """Signed perpendicular distance: left of the directed line is positive."""
    dx = frame['centre_x_mm'] - origin[0]
    dy = frame['centre_y_mm'] - origin[1]
    return -np.sin(heading_rad) * dx + np.cos(heading_rad) * dy


def load_observations(path, sample_times, origin=(0.0, 0.0), heading_rad=0.0):
    required = ['run_id', 'split', 'elapsed_s', 'centre_x_mm', 'centre_y_mm']
    from pathlib import Path
    if Path(path).suffix.lower() == '.xlsx':
        frame = pd.read_excel(path, sheet_name='real_world', engine='openpyxl',
                              dtype={'run_id': str, 'split': str}).dropna(how='all')
    else:
        frame = pd.read_csv(path, dtype={'run_id': 'str', 'split': 'str'})
    missing = set(required) - set(frame.columns)
    if missing:
        raise ValueError(f'Missing observation columns: {sorted(missing)}')
    if frame.empty:
        return frame.assign(signed_drift_mm=pd.Series(dtype=float))
    if frame[required].isna().any().any() or (frame.run_id.str.strip() == '').any():
        raise ValueError('Observation values and run IDs must not be missing.')
    for column in ['elapsed_s', 'centre_x_mm', 'centre_y_mm']:
        frame[column] = pd.to_numeric(frame[column], errors='raise')
        if not np.isfinite(frame[column]).all():
            raise ValueError(f'{column} must contain only finite numbers.')
    if (frame.elapsed_s < 0).any() or frame.duplicated(['run_id', 'elapsed_s']).any():
        raise ValueError('Negative times or duplicate (run_id, elapsed_s) observations.')
    if not set(frame.split).issubset({'train', 'test'}):
        raise ValueError('split must be train or test, assigned before fitting.')
    if (frame.groupby('run_id').split.nunique() != 1).any():
        raise ValueError('A whole physical run must belong to one split; do not split its timestamps.')
    expected = set(map(float, sample_times))
    for run_id, run in frame.groupby('run_id'):
        if not expected.issubset(set(run.elapsed_s)):
            raise ValueError(f'{run_id}: missing requested sample times {sorted(expected - set(run.elapsed_s))}')
    frame = frame[frame.elapsed_s.isin(sample_times)].copy()
    frame['signed_drift_mm'] = centrepoint_drift(frame, origin, heading_rad)
    return frame.sort_values(['run_id', 'elapsed_s']).reset_index(drop=True)


def score_models(simulated, observed, sample_times):
    """Equal weight per physical run and requested time; no seed selection.

    Empirical CRPS = mean(|X-y|) - 0.5 mean(|X-X'|), in mm.
    This scores the marginal drift distribution, not a trajectory likelihood.
    """
    if observed.empty:
        raise ValueError('Real observations are required to score models.')
    expected = set(map(float, sample_times))
    if not expected or not expected.issubset(set(observed.elapsed_s)):
        raise ValueError('Missing scoring times.')
    if observed.duplicated(['run_id', 'elapsed_s']).any():
        raise ValueError('Duplicate observation times.')
    for _, run in observed.groupby('run_id'):
        if not expected.issubset(set(run.elapsed_s)):
            raise ValueError('Each run must cover the same scoring times.')
    scores = []
    for model_id, model in simulated.groupby('model_id', sort=False):
        if model.duplicated(['run_id', 'elapsed_s']).any():
            raise ValueError('Duplicate simulation samples.')
        for _, run in model.groupby('run_id'):
            if not expected.issubset(set(run.elapsed_s)):
                raise ValueError(f'{model_id}: missing simulation times; no extrapolation allowed.')
        crps, squared_error, absolute_error = [], [], []
        for time in sample_times:
            predictions = model.loc[model.elapsed_s == time, 'signed_drift_mm'].to_numpy(float)
            measurements = observed.loc[observed.elapsed_s == time, 'signed_drift_mm'].to_numpy(float)
            if not np.isfinite(predictions).all() or not np.isfinite(measurements).all():
                raise ValueError('Non-finite drift data cannot be scored.')
            spread_term = 0.5 * np.abs(predictions[:, None] - predictions[None, :]).mean()
            crps.extend(np.abs(predictions[:, None] - measurements[None, :]).mean(axis=0) - spread_term)
            errors = predictions.mean() - measurements
            squared_error.extend(errors**2)
            absolute_error.extend(np.abs(errors))
        scores.append({'model_id': model_id, 'crps_mm': np.mean(crps),
                       'mean_prediction_rmse_mm': np.sqrt(np.mean(squared_error)),
                       'mean_prediction_mae_mm': np.mean(absolute_error),
                       'physical_runs': observed.run_id.nunique(),
                       'sample_times': len(sample_times)})
    return pd.DataFrame(scores).sort_values(['crps_mm', 'model_id']).reset_index(drop=True)
