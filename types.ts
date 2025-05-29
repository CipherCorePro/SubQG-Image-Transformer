export interface SubQGParams {
  sim_duration: number;
  noise_factor: number;
  threshold_s: number;
  decimal_precision: number;
  f_energy: number;
  f_phase: number;
  re_s_scaling_c: number;
  field_w: number;
  field_h: number;
}

export interface RiemannStats {
  mean_re_s: number;
  median_re_s: number;
  std_dev_re_s: number;
  count_near_0_5: number;
  total_projected_knots: number;
  harmony_score: number;
  internal_prescale_factor_used: number;
  knot_map_visual_uri?: string; // For displaying the raw knot map
}

export interface TransformationParams {
  brightness_factor: number;
  contrast_factor: number;
}

export interface ResolutionOption {
  label: string;
  width?: number; // Optional for "Original"
  height?: number; // Optional for "Original"
}

export interface MainColor {
  r: number;
  g: number;
  b: number;
  activation: number;
}

export type KnotMap = number[][];

// Defines the structure for a point in 2D space
export interface Point {
  x: number;
  y: number;
}

// Defines the structure for image data dimensions
export interface ImageDimensions {
  width: number;
  height: number;
}