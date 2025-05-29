
import { SubQGParams, RiemannStats, KnotMap } from '../types';
import { calculateMean, calculateMedian, calculateStdDev, calculatePtp, linspace, clamp } from './mathHelpers';

export class SubQGSimulator {
  private params: SubQGParams;
  private energy_field: number[][];
  private phase_field: number[][];
  public knot_map: KnotMap;
  private detected_knot_base_values: number[];
  private rounding_factor: number;
  private omega_energy: number;
  private omega_phase: number;

  constructor(params: SubQGParams) {
    this.params = params;
    this.rounding_factor = Math.pow(10, params.decimal_precision);
    this.omega_energy = params.f_energy * 2 * Math.PI;
    this.omega_phase = params.f_phase * 2 * Math.PI;

    this.energy_field = Array(params.field_h).fill(null).map(() => Array(params.field_w).fill(0));
    this.phase_field = Array(params.field_h).fill(null).map(() => Array(params.field_w).fill(0));
    this.knot_map = Array(params.field_h).fill(null).map(() => Array(params.field_w).fill(0));
    this.detected_knot_base_values = [];
  }

  private updateWaves(t: number): void {
    const { field_w, field_h, sim_duration, noise_factor } = this.params;
    
    const time_component_energy = Math.sin(this.omega_energy * t / sim_duration);
    const time_component_phase = Math.sin(this.omega_phase * t / sim_duration);

    const xCoords = linspace(0, 2 * Math.PI, field_w);
    const yCoords = linspace(0, 2 * Math.PI, field_h);

    for (let r = 0; r < field_h; r++) {
      for (let c = 0; c < field_w; c++) {
        const xv = xCoords[c]; // Equivalent to meshgrid indexing='xy' where xv changes with column
        const yv = yCoords[r]; // Equivalent to meshgrid indexing='xy' where yv changes with row
        const spatial_component = Math.sin(xv) * Math.cos(yv);

        this.energy_field[r][c] = (Math.abs(time_component_energy + spatial_component) / 2 +
                                  Math.random() * noise_factor);
        this.phase_field[r][c] = (Math.abs(time_component_phase + spatial_component) / 2 +
                                   Math.random() * noise_factor);
        
        this.energy_field[r][c] = clamp(this.energy_field[r][c], 0, 1.0 + noise_factor);
        this.phase_field[r][c] = clamp(this.phase_field[r][c], 0, 1.0 + noise_factor);
      }
    }
  }

  public runSimulation(): { knot_map: KnotMap; total_knots: number } {
    this.knot_map = Array(this.params.field_h).fill(null).map(() => Array(this.params.field_w).fill(0));
    this.detected_knot_base_values = [];
    let total_knots_detected = 0;

    for (let t = 0; t < this.params.sim_duration; t++) {
      this.updateWaves(t);
      let num_knots_in_step = 0;
      for (let r = 0; r < this.params.field_h; r++) {
        for (let c = 0; c < this.params.field_w; c++) {
          const rounded_energy = Math.round(this.energy_field[r][c] * this.rounding_factor) / this.rounding_factor;
          const rounded_phase = Math.round(this.phase_field[r][c] * this.rounding_factor) / this.rounding_factor;

          const condition1 = this.energy_field[r][c] > this.params.threshold_s;
          const condition2 = this.phase_field[r][c] > this.params.threshold_s;
          const condition3 = rounded_energy === rounded_phase;
          
          const detected_knot_this_step = condition1 && condition2 && condition3;

          if (detected_knot_this_step) {
            this.knot_map[r][c] += 1;
            num_knots_in_step++;
            this.detected_knot_base_values.push(this.energy_field[r][c]);
          }
        }
      }
      total_knots_detected += num_knots_in_step;
    }
    return { knot_map: this.knot_map, total_knots: total_knots_detected };
  }

  public analyzeRiemannProjection(): RiemannStats {
    if (this.detected_knot_base_values.length === 0) {
      return {
        mean_re_s: 0.0, median_re_s: 0.0, std_dev_re_s: 1.0,
        count_near_0_5: 0, total_projected_knots: 0, harmony_score: 0.0,
        internal_prescale_factor_used: 0.0
      };
    }

    const internal_prescale_factor = 5.0;
    const projected_re_s_values = this.detected_knot_base_values.map(val => (val * internal_prescale_factor) * this.params.re_s_scaling_c);

    const mean_re_s = calculateMean(projected_re_s_values);
    const median_re_s = calculateMedian(projected_re_s_values);
    // Python: std_dev_re_s = np.std(projected_re_s_values) if projected_re_s_values.size > 1 and projected_re_s_values.ptp() > 0 else 1.0
    const std_dev_re_s = (projected_re_s_values.length > 1 && calculatePtp(projected_re_s_values) > 0) ? calculateStdDev(projected_re_s_values) : 1.0;
    
    const target_re_s = 0.5;
    const interval_radius = 0.05;
    const count_near_target = projected_re_s_values.filter(val => val >= target_re_s - interval_radius && val <= target_re_s + interval_radius).length;

    const mean_proximity_score = 1.0 - Math.min(1.0, Math.abs(mean_re_s - target_re_s) / (target_re_s * 0.5));
    const concentration_score = 1.0 - Math.min(1.0, std_dev_re_s / 0.15);
    const harmony_score = clamp((mean_proximity_score * 0.6 + concentration_score * 0.4), 0.0, 1.0);
    
    return {
      mean_re_s, median_re_s, std_dev_re_s,
      count_near_0_5: count_near_target,
      total_projected_knots: projected_re_s_values.length,
      harmony_score,
      internal_prescale_factor_used: internal_prescale_factor
    };
  }
}
