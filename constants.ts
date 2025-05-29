
import { ResolutionOption } from './types';

export const DEFAULT_SUBQG_PARAMS = {
  sim_duration: 30,
  noise_factor: 0.04,
  threshold_s: 0.75,
  decimal_precision: 3,
  f_energy: 0.15,
  f_phase: 0.155,
  re_s_scaling_c: 0.10,
  field_w: 64, // Default, will be adjusted based on image size
  field_h: 64, // Default, will be adjusted based on image size
};

export const DEFAULT_TRANSFORMATION_PARAMS = {
  brightness_factor: 0.0,
  contrast_factor: 1.0,
};

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { label: "Test Small (256px)", width: 256, height: 256 },
  { label: "Test Medium (512px)", width: 512, height: 512 },
  { label: "Original" }, // Width and height will be derived from the input image
  { label: "Cover (1024px)", width: 1024, height: 1024 },
  { label: "Instagram Post (1080px)", width: 1080, height: 1080 },
  { label: "HD (Landscape, 720p)", width: 1280, height: 720 },
  { label: "Full HD (Landscape, 1080p)", width: 1920, height: 1080 },
  { label: "2K Square (2048px)", width: 2048, height: 2048 },
  { label: "2K QHD (Landscape, 1440p)", width: 2560, height: 1440 },
  { label: "4K UHD (Landscape, 2160p)", width: 3840, height: 2160 },
];

export const CATEGORY_LABELS_ORDERED = ["Red", "Green", "Blue", "Yellow", "Cyan", "Magenta"];

// Use 'imagen-3.0-generate-002' for dedicated image generation as per SDK guidelines.
export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002'; 
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17'; // For text-based tasks if any were used.
