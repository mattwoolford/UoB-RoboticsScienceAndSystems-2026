"""Regression checks; synthetic fixtures are never physical observations."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from analysis import centrepoint_drift, load_observations, score_models
from simulation_runner import SimulationRunner, select_candidates

ROOT = Path(__file__).resolve().parents[1]


class NotebookMenuChecks(unittest.TestCase):
    def test_menu_runs_first_from_repository_root(self):
        # A fresh Python process has no setup-cell variables and uses real stdin.
        # This reproduces the saved first-cell NameError, rather than preloading fixtures.
        notebook = ROOT / 'experiments/StraightLineDrift.ipynb'
        script = '''
import json, sys
from pathlib import Path
n = json.loads(Path(sys.argv[1]).read_text())
cell = next(c for c in n['cells'] if c.get('id') == 'run-menu')
scope = {}
exec(''.join(cell['source']), scope)
assert scope['RUN_MODE'] == 'single'
assert scope['SELECTED_CANDIDATE'] == 'right_fast'
assert [c['model_id'] for c in scope['ACTIVE_CANDIDATES']] == ['right_fast']
assert scope['ROOT'] == Path.cwd()
assert all(name in scope for name in ['SimulationRunner', 'pd', 'plt', 'BASE_SEED',
                                     'PROCESSING_RESOURCES', 'FIT_TIMES', 'N_RUNS'])
'''
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, '-c', script, str(notebook)],
                                    cwd=ROOT, input='1\n4\n', text=True, capture_output=True,
                                    timeout=60, env={**os.environ, 'MPLBACKEND': 'Agg',
                                                     'MPLCONFIGDIR': directory})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Selected: single | Models: right_fast', result.stdout)

    def test_setup_preserves_existing_settings(self):
        from experiment_setup import initialize_notebook
        candidates = [dict(model_id='custom', sensor_noise_counts=12)]
        scope = dict(N_RUNS=2, CANDIDATES=candidates, LIVE_PROCESSING=False)
        initialize_notebook(scope)
        self.assertIs(scope['CANDIDATES'], candidates)
        self.assertEqual(scope['N_RUNS'], 2)
        self.assertFalse(scope['LIVE_PROCESSING'])


class AnalysisChecks(unittest.TestCase):
    def test_signed_centrepoint_projection(self):
        points = pd.DataFrame({'centre_x_mm': [10, 10], 'centre_y_mm': [3, -4]})
        np.testing.assert_allclose(centrepoint_drift(points), [3, -4])
        # Facing north, west is left; account for translated line origin.
        np.testing.assert_allclose(centrepoint_drift(points, (12, 7), np.pi / 2), [2, 2])

    def test_crps_rewards_distribution_not_only_mean(self):
        predictions = pd.DataFrame([
            {'model_id': model, 'run_id': str(i), 'elapsed_s': t, 'signed_drift_mm': value}
            for model, values in [('point', [0]), ('spread', [-1, 1])]
            for i, value in enumerate(values) for t in [3, 4, 5]])
        observed = pd.DataFrame([
            {'run_id': str(i), 'elapsed_s': t, 'signed_drift_mm': value}
            for i, value in enumerate([-1, 1]) for t in [3, 4, 5]])
        scores = score_models(predictions, observed, [3, 4, 5]).set_index('model_id')
        self.assertAlmostEqual(scores.loc['spread', 'crps_mm'], .5)
        self.assertAlmostEqual(scores.loc['point', 'crps_mm'], 1)
        self.assertAlmostEqual(scores.loc['point', 'mean_prediction_rmse_mm'], 1)
        self.assertEqual(scores.index[0], 'spread')
        with self.assertRaises(ValueError):
            score_models(predictions[predictions.elapsed_s != 5], observed, [3, 4, 5])

    def test_physical_data_validation(self):
        data = pd.DataFrame({'run_id': ['A']*3, 'split': ['train']*3,
                             'elapsed_s': [3, 4, 5], 'centre_x_mm': [100, 150, 200],
                             'centre_y_mm': [1, 2, 3]})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'fixture.csv'
            data.to_csv(path, index=False)
            actual = load_observations(path, [3, 4, 5])
            np.testing.assert_array_equal(actual.signed_drift_mm, [1, 2, 3])
            for invalid in [data.iloc[:2], pd.concat([data, data.iloc[:1]]),
                            data.assign(split=['train', 'test', 'train']),
                            data.assign(centre_y_mm=[1, np.nan, 3])]:
                invalid.to_csv(path, index=False)
                with self.assertRaises(ValueError):
                    load_observations(path, [3, 4, 5])


class SimulationChecks(unittest.TestCase):
    def test_candidate_selection(self):
        candidates = [dict(model_id='noisy', sensor_noise_counts=25)]
        self.assertEqual(select_candidates(candidates, 'single', 'sterile'),
                         [dict(model_id='sterile')])
        self.assertEqual(select_candidates(candidates, 'single', 'noisy'), candidates)
        self.assertEqual(select_candidates(candidates, 'all_sequential'),
                         select_candidates(candidates, 'all_parallel'))
        for mode, selected, models in [('invalid', 'noisy', candidates),
                                       ('single', 'missing', candidates),
                                       ('all_parallel', 'noisy', candidates * 2),
                                       ('all_parallel', 'noisy', [dict(model_id='../escape')])]:
            with self.assertRaises(ValueError):
                select_candidates(models, mode, selected)

    def test_selected_sequential_and_parallel_results_match(self):
        candidates = [dict(model_id='low', sensor_noise_counts=25, wheel_noise_fraction=.02),
                      dict(model_id='high', sensor_noise_counts=80, wheel_noise_fraction=.08)]
        with tempfile.TemporaryDirectory() as directory, SimulationRunner(ROOT) as simulation:
            directory = Path(directory)
            sequential = simulation.run_candidates(directory/'sequential', candidates, runs=2)
            parallel = simulation.run_candidates(directory/'parallel', candidates,
                                                  mode='all_parallel', runs=2)
            self.assertEqual([p.stem for p in parallel], ['sterile', 'low', 'high'])
            for first, second in zip(sequential, parallel):
                pd.testing.assert_frame_equal(pd.read_csv(first), pd.read_csv(second))
            single = simulation.run_candidates(directory/'single', candidates,
                                               mode='single', selected='high', runs=2)
            self.assertEqual([p.name for p in (directory/'single').iterdir()], ['high.csv'])
            pd.testing.assert_frame_equal(pd.read_csv(single[0]), pd.read_csv(parallel[2]))
            # Validate every job before starting, even if a later output exists.
            with patch.object(simulation, '_command') as launch:
                with self.assertRaises(FileExistsError):
                    simulation.run_candidates(directory/'single', candidates)
                launch.assert_not_called()

    def test_parallel_failure_close_and_interrupt_stop_other_processes(self):
        real_popen = subprocess.Popen
        for ending in ['failure', 'closed', 'interrupt']:
            with self.subTest(ending=ending), tempfile.TemporaryDirectory() as directory:
                directory = Path(directory)
                started = directory/'started'
                processes = []

                def prepare(output, **params):
                    if params['model_id'] == 'sterile' or ending == 'interrupt':
                        script = 'import pathlib,sys,time; pathlib.Path(sys.argv[1]).touch(); time.sleep(30)'
                    else:
                        script = ('import pathlib,sys,time\n'
                                  'while not pathlib.Path(sys.argv[1]).exists(): time.sleep(.01)\n'
                                  f'sys.exit({3 if ending == "failure" else 0})')
                    return Path(output), [sys.executable, '-c', script, started]

                def launch(*args, **kwargs):
                    process = real_popen(*args, **kwargs)
                    processes.append(process)
                    return process

                real_sleep = time.sleep
                interrupted = False

                def sleep(seconds):
                    nonlocal interrupted
                    if ending == 'interrupt' and not interrupted:
                        interrupted = True
                        raise KeyboardInterrupt
                    real_sleep(seconds)

                simulation = SimulationRunner(ROOT)
                with patch.object(simulation, '_prepare_run', side_effect=prepare), \
                     patch('simulation_runner.subprocess.Popen', side_effect=launch), \
                     patch('simulation_runner.time.sleep', side_effect=sleep):
                    with self.assertRaises(KeyboardInterrupt if ending == 'interrupt' else RuntimeError):
                        simulation.run_candidates(directory, [dict(model_id='noisy')], mode='all_parallel')
                self.assertEqual(len(processes), 2)
                self.assertTrue(all(p.poll() is not None for p in processes))

    @unittest.skipUnless(os.environ.get('TEST_LIVE_PROCESSING') == '1',
                         'Set TEST_LIVE_PROCESSING=1 to open a real Processing window (~64 s).')
    def test_live_matches_headless_across_trials(self):
        params = dict(model_id='live_fixture', runs=2, seed=55, motor_tau_ms=80,
                      wheel_noise_fraction=.02, sensor_noise_counts=25)
        with tempfile.TemporaryDirectory() as directory, SimulationRunner(ROOT, live=True) as simulation:
            directory = Path(directory)
            start = time.monotonic()
            simulation.run(directory/'live.csv', **params)
            self.assertGreaterEqual(time.monotonic() - start, 60)
            simulation.live = False
            simulation.run(directory/'headless.csv', **params)
            pd.testing.assert_frame_equal(pd.read_csv(directory/'live.csv'),
                                          pd.read_csv(directory/'headless.csv'))

    def test_closed_window_does_not_report_success(self):
        with tempfile.TemporaryDirectory() as directory:
            simulation = SimulationRunner(ROOT, live=True)
            # A user-closed Processing window can exit normally without a CSV.
            simulation.temporary = object()
            simulation.java = 'java'
            simulation.classpath = 'unused'
            with patch.object(simulation, '_command', return_value=''):
                with self.assertRaisesRegex(RuntimeError, 'before the batch CSV was saved'):
                    simulation.run(Path(directory)/'cancelled.csv')

    def test_open_loop_mechanical_drift(self):
        with tempfile.TemporaryDirectory() as directory, SimulationRunner(ROOT) as simulation:
            directory = Path(directory)
            frames = {}
            for model, imbalance, sensor_noise in [('right', .015, 0),
                                                   ('left', -.015, 0),
                                                   ('sensor', .015, 1000)]:
                path = directory / (model + '.csv')
                simulation.run(path, model_id=model, gain_imbalance=imbalance,
                               sensor_noise_counts=sensor_noise)
                frames[model] = pd.read_csv(path)
            right, left = frames['right'], frames['left']
            for frame in frames.values():
                np.testing.assert_array_equal(frame.elapsed_s, np.arange(31))
                self.assertTrue(frame.drive_mode.eq('open_loop_equal_pwm').all())
                self.assertTrue(frame.controller_mode.eq(-1).all())
                self.assertTrue(frame.left_pwm.eq(45).all() & frame.right_pwm.eq(45).all())
            # Constant unequal wheel velocities describe a circle, without steering.
            speed = 56.25
            omega = speed * .015 / 90
            expected = speed / omega * (1 - np.cos(omega * right.elapsed_s))
            # PDE physics uses forward Euler integration at 10 ms; allow its <0.1 mm error.
            np.testing.assert_allclose(right.signed_drift_mm, expected, atol=.1)
            np.testing.assert_allclose(left.signed_drift_mm, -right.signed_drift_mm, atol=.03)
            self.assertGreater(right.signed_drift_mm.iloc[-1], 200)
            np.testing.assert_array_equal(frames['sensor'].signed_drift_mm, right.signed_drift_mm)

    def test_actual_model_repeatability_and_isolation(self):
        with tempfile.TemporaryDirectory() as directory, SimulationRunner(ROOT) as simulation:
            directory = Path(directory)
            simulation.run(directory/'sterile.csv')
            simulation.run(directory/'zero.csv', model_id='zero_extension')
            params = dict(model_id='noise_fixture', runs=2, seed=55, motor_tau_ms=80,
                          wheel_noise_fraction=.02, sensor_noise_counts=25)
            simulation.run(directory/'a.csv', **params)
            simulation.run(directory/'b.csv', **params)
            a, b = pd.read_csv(directory/'a.csv'), pd.read_csv(directory/'b.csv')
            pd.testing.assert_frame_equal(a, b)
            self.assertGreater(a.signed_drift_mm.abs().max(), 0)
            self.assertFalse(np.array_equal(a[a.seed == 55].signed_drift_mm,
                                           a[a.seed == 56].signed_drift_mm))
            sterile = pd.read_csv(directory/'sterile.csv')
            zero = pd.read_csv(directory/'zero.csv')
            np.testing.assert_allclose(sterile.signed_drift_mm, 0, atol=0)
            np.testing.assert_allclose(sterile.centre_x_mm, zero.centre_x_mm, atol=1e-5)
            np.testing.assert_allclose(sterile.centre_y_mm, zero.centre_y_mm, atol=1e-5)
            reference = pd.read_csv(ROOT/'DigitalTwin/results/sterile-baseline.csv')
            np.testing.assert_allclose(sterile.forward_mm, reference.forward_mm, atol=1e-5)
            self.assertEqual(len(a), 62)
            with self.assertRaises(ValueError):
                simulation.run(directory/'bad.csv', model_id='sterile', sensor_noise_counts=1)
            with self.assertRaises(FileExistsError):
                simulation.run(directory/'sterile.csv')


if __name__ == '__main__':
    unittest.main()
