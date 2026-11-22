/** Shared browser contract for the local simulation and robot bridge. */
export interface Candidate {
  model_id: string;
  label: string;
  description: string;
}
export interface Sample {
  model_id: string;
  run_id: string;
  elapsed_s: number;
  forward_mm: number;
  signed_drift_mm: number;
  heading_rad: number;
  left_pwm: number;
  right_pwm: number;
  left_count: number;
  right_count: number;
}
export interface Summary {
  model_id: string;
  runs: number;
  mean_drift_mm: number;
  rms_drift_mm: number;
  mean_forward_mm: number;
}
export interface SavedWorkbook {
  filename: string;
  kind: 'simulation' | 'pwm_sweep';
  saved_at: string;
}
export interface Telemetry {
  timestamp_ms: number;
  x_mm: number;
  y_mm: number;
  heading_rad: number;
  left_pwm: number;
  right_pwm: number;
  left_count: number;
  right_count: number;
  sensors: number[];
  state: string;
  ready: boolean;
  pose_source: 'odometry';
}
export interface DriftSettings {
  drift_correction: boolean;
  drift_path_recovery: boolean;
}
export interface ResumableSweep {
  filename: string;
  runs: number;
  saved_runs: number;
  saved_at?: string;
}
export interface PwmSweep {
  status: 'idle' | 'running' | 'saving' | 'completed' | 'cancelled' | 'failed';
  message: string;
  runs: number;
  completed_steps: number;
  total_steps: number;
  has_export: boolean;
  filename?: string | null;
  saved_runs?: number;
  resumable?: ResumableSweep[];
}
export interface DashboardState {
  simulation: {
    status: 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
    message: string;
    models: string[];
    progress: number;
    samples: Sample[];
    summary: Summary[];
    run_id: string | null;
    has_exports?: boolean;
    has_workbook?: boolean;
  };
  robot: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    connection_id: string | null;
    settings: DriftSettings | null;
    message: string;
    telemetry: Telemetry | null;
    history: Telemetry[];
    supports_pwm_sweep: boolean;
    pwm_sweep: PwmSweep;
  };
  candidates: Candidate[];
}
export type Source = 'virtual' | 'robot';
export type Procedure =
  | 'open_loop'
  | 'line_follow'
  | 'motor_test'
  | 'pwm_sweep';
export interface SimulationConfig {
  mode: 'single' | 'all_sequential' | 'all_parallel';
  selected: string;
  runs: number;
  seed: number;
  live: boolean;
}
