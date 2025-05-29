
import { MainColor, KnotMap, ImageDimensions } from '../types';
import { CATEGORY_LABELS_ORDERED } from '../constants';
import { clamp } from './mathHelpers';

export const loadImageData = (imageSrc: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // For images from other domains like picsum or Gemini output
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

export const imageDataToDataURL = (imageData: ImageData): string => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

export const extractMainColors = (imageData: ImageData, numColors: number = 6): MainColor[] => {
  const pixels = imageData.data;
  const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number } } = {};
  const sampleRate = Math.max(1, Math.floor(pixels.length / (4 * 2000))); // Sample up to ~2000 pixels

  for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Filter out very dark/light pixels as in Python
    const sum = r + g + b;
    if (sum < 60 || sum > 700) continue;

    // Simple binning to group similar colors
    const rBin = Math.floor(r / 32) * 32;
    const gBin = Math.floor(g / 32) * 32;
    const bBin = Math.floor(b / 32) * 32;
    const key = `${rBin},${gBin},${bBin}`;

    if (!colorCounts[key]) {
      colorCounts[key] = { r: rBin + 16, g: gBin + 16, b: bBin + 16, count: 0 }; // Use bin center
    }
    colorCounts[key].count++;
  }

  const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);
  const mainColors: MainColor[] = [];

  for (let i = 0; i < Math.min(sortedColors.length, numColors); i++) {
    const color = sortedColors[i];
    const activation = (color.r / 255 + color.g / 255 + color.b / 255) / 3.0;
    mainColors.push({ r: color.r, g: color.g, b: color.b, activation });
  }
  
  // Fill with random colors if not enough found, similar to Python's fallback
  while (mainColors.length < numColors) {
      const r = Math.floor(Math.random() * 176) + 80; // 80-255
      const g = Math.floor(Math.random() * 176) + 80;
      const b = Math.floor(Math.random() * 176) + 80;
      const activation = (r / 255 + g / 255 + b / 255) / 3.0;
      mainColors.push({ r, g, b, activation });
  }
  return mainColors;
};

// Creates an array of activations based on extracted colors, matching CATEGORY_LABELS_ORDERED
export const createCategoryActivations = (mainColors: MainColor[]): number[] => {
    const activations = Array(CATEGORY_LABELS_ORDERED.length).fill(0.5); // Default activation
    mainColors.slice(0, CATEGORY_LABELS_ORDERED.length).forEach((color, index) => {
        activations[index] = color.activation;
    });
    return activations;
};


export const resizeKnotMap = (knotMap: KnotMap, targetWidth: number, targetHeight: number): number[][] => {
  if (!knotMap || knotMap.length === 0 || knotMap[0].length === 0) {
    return Array(targetHeight).fill(null).map(() => Array(targetWidth).fill(0));
  }

  const sourceHeight = knotMap.length;
  const sourceWidth = knotMap[0].length;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error("Cannot get source canvas context for knotmap resize");

  const sourceImageData = sourceCtx.createImageData(sourceWidth, sourceHeight);
  let maxKnotVal = 0;
  for (let r_idx = 0; r_idx < sourceHeight; r_idx++) {
    for (let c_idx = 0; c_idx < sourceWidth; c_idx++) {
      if (knotMap[r_idx][c_idx] > maxKnotVal) maxKnotVal = knotMap[r_idx][c_idx];
    }
  }
  if (maxKnotVal === 0) maxKnotVal = 1; 

  for (let r_idx = 0; r_idx < sourceHeight; r_idx++) {
    for (let c_idx = 0; c_idx < sourceWidth; c_idx++) {
      const normVal = Math.floor((knotMap[r_idx][c_idx] / maxKnotVal) * 255);
      const idx = (r_idx * sourceWidth + c_idx) * 4;
      sourceImageData.data[idx] = normVal;    
      sourceImageData.data[idx + 1] = normVal; 
      sourceImageData.data[idx + 2] = normVal; 
      sourceImageData.data[idx + 3] = 255;     
    }
  }
  sourceCtx.putImageData(sourceImageData, 0, 0);

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) throw new Error("Cannot get target canvas context for knotmap resize");
  
  targetCtx.imageSmoothingEnabled = true; 
  targetCtx.imageSmoothingQuality = 'high';
  targetCtx.drawImage(sourceCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  const resizedImageData = targetCtx.getImageData(0, 0, targetWidth, targetHeight);
  const resizedKnotMap: number[][] = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill(0));
  
  let maxResizedVal = 0;
  for (let r_idx = 0; r_idx < targetHeight; r_idx++) {
    for (let c_idx = 0; c_idx < targetWidth; c_idx++) {
      const val = resizedImageData.data[(r_idx * targetWidth + c_idx) * 4] / 255; 
      resizedKnotMap[r_idx][c_idx] = val;
      if (val > maxResizedVal) maxResizedVal = val;
    }
  }
  
  if (maxResizedVal > 0) {
    for (let r_idx = 0; r_idx < targetHeight; r_idx++) {
      for (let c_idx = 0; c_idx < targetWidth; c_idx++) {
        resizedKnotMap[r_idx][c_idx] /= maxResizedVal; // Normalize again
      }
    }
  }
  
  return resizedKnotMap;
};

export const processImageWithSubQG = (
  originalImageData: ImageData,
  categoryActivations: number[], 
  brightnessFactor: number, 
  contrastFactor: number,   
  resizedKnotMap: number[][], 
  harmonyScore: number
): ImageData => {
  const { width: imgWidth, height: imgHeight, data: originalData } = originalImageData;
  const newImageData = new ImageData(new Uint8ClampedArray(originalData.slice()), imgWidth, imgHeight);
  const newData = newImageData.data;

  // --- SubQG Wave Field Parameters (tune these for desired effect) ---
  const waveFrequencyX = 3.0 + harmonyScore * 4.0; // Higher harmony = higher frequency waves
  const waveFrequencyY = 2.0 + harmonyScore * 3.0;
  const knotPhaseInfluence = Math.PI; // How much local knot value shifts the phase
  const globalPhaseOffsetX = Math.random() * Math.PI * 2; // Random global offset for variety
  const globalPhaseOffsetY = Math.random() * Math.PI * 2;
  // Strength of the wave field's modulation on color and brightness
  const fieldColorModulationStrength = 0.15 * (1.0 - harmonyScore); // Lower harmony = stronger color modulation by field
  const fieldBrightnessVariationStrength = 0.10 * (1.0 - harmonyScore); // Lower harmony = stronger brightness variation by field

  // Global color adjustment factors based on harmonyScore
  const colorTempShift = (harmonyScore - 0.5) * 0.25; // Max +/- 0.125 shift
  const saturationFactor = 1.0 + (harmonyScore - 0.5) * 0.25; // Max 0.875 to 1.125 factor

  for (let r_idx = 0; r_idx < imgHeight; r_idx++) {
    for (let c_idx = 0; c_idx < imgWidth; c_idx++) {
      const pixelIdx = (r_idx * imgWidth + c_idx) * 4;

      let r = originalData[pixelIdx] / 255.0;
      let g = originalData[pixelIdx + 1] / 255.0;
      let b = originalData[pixelIdx + 2] / 255.0;

      // 1. Base Brightness/Contrast (from sliders and category activations)
      let currentBrightnessMod = brightnessFactor;
      let currentContrastMod = contrastFactor;
      categoryActivations.forEach(activation => {
        currentBrightnessMod += (activation - 0.5) * 0.15; // Activation centered around 0.5
        currentContrastMod *= (1.0 + (activation - 0.5) * 0.10);
      });
      
      r = (r - 0.5) * currentContrastMod + 0.5 + currentBrightnessMod;
      g = (g - 0.5) * currentContrastMod + 0.5 + currentBrightnessMod;
      b = (b - 0.5) * currentContrastMod + 0.5 + currentBrightnessMod;
      
      r = clamp(r, 0, 1);
      g = clamp(g, 0, 1);
      b = clamp(b, 0, 1);

      // 2. Calculate SubQG Wave Field Influence for current pixel
      const normX = c_idx / imgWidth;
      const normY = r_idx / imgHeight;
      const knotValue = resizedKnotMap[r_idx][c_idx]; // Normalized 0-1

      const waveX = Math.sin(normX * waveFrequencyX * Math.PI * 2 + knotValue * knotPhaseInfluence + globalPhaseOffsetX);
      const waveY = Math.sin(normY * waveFrequencyY * Math.PI * 2 + knotValue * knotPhaseInfluence + globalPhaseOffsetY);
      // Combine waves: (waveX+waveY)/2 gives values roughly in [-1, 1]
      // Or multiply for more complex interference: waveX * waveY
      const fieldInfluence = (waveX + waveY) / 2.0; 

      // 3. Apply Global Color Mood (Harmony Score based), modulated by SubQG Wave Field
      let effectiveColorTempShift = colorTempShift * (1 + fieldInfluence * fieldColorModulationStrength);
      let effectiveSaturationFactor = saturationFactor * (1 + fieldInfluence * fieldColorModulationStrength * 0.5); // Saturation modulation less intense

      // Apply Color Temperature Shift
      if (effectiveColorTempShift > 0) { // Warmer
        r = clamp(r + effectiveColorTempShift * 0.20, 0, 1); 
        g = clamp(g + effectiveColorTempShift * 0.10, 0, 1); 
        b = clamp(b - effectiveColorTempShift * 0.15, 0, 1); 
      } else { // Cooler
        r = clamp(r + effectiveColorTempShift * 0.15, 0, 1); 
        b = clamp(b - effectiveColorTempShift * 0.20, 0, 1); 
      }
      
      // Apply Saturation Shift
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(luma + (r - luma) * effectiveSaturationFactor, 0, 1);
      g = clamp(luma + (g - luma) * effectiveSaturationFactor, 0, 1);
      b = clamp(luma + (b - luma) * effectiveSaturationFactor, 0, 1);
      
      // 4. Apply Subtle Brightness Variation from SubQG Wave Field
      const brightnessFieldVariation = fieldInfluence * fieldBrightnessVariationStrength;
      r = clamp(r + brightnessFieldVariation, 0, 1);
      g = clamp(g + brightnessFieldVariation, 0, 1);
      b = clamp(b + brightnessFieldVariation, 0, 1);
            
      // Final assignment to new image data
      newData[pixelIdx]     = clamp(r * 255, 0, 255);
      newData[pixelIdx + 1] = clamp(g * 255, 0, 255);
      newData[pixelIdx + 2] = clamp(b * 255, 0, 255);
      newData[pixelIdx + 3] = originalData[pixelIdx + 3]; 
    }
  }
  return newImageData;
};


export const applyPostProcessing = (
    imageData: ImageData, 
    harmonyScore: number,
    targetWidth: number,
    targetHeight: number
): Promise<ImageData> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth; 
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(imageData); 
      return;
    }

    const tempSrcCanvas = document.createElement('canvas');
    tempSrcCanvas.width = imageData.width;
    tempSrcCanvas.height = imageData.height;
    const tempSrcCtx = tempSrcCanvas.getContext('2d');
    if(!tempSrcCtx) {
        resolve(imageData); return;
    }
    tempSrcCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempSrcCanvas, 0, 0, imageData.width, imageData.height, 0, 0, targetWidth, targetHeight);
    
    const imageToFilter = ctx.getImageData(0, 0, targetWidth, targetHeight);
    ctx.clearRect(0,0,targetWidth, targetHeight); 

    let filterString = "";
    if (harmonyScore > 0.75) { 
      filterString = "contrast(1.05) saturate(1.03)"; // Very subtle sharpen
    } else if (harmonyScore < 0.25) { 
      const blurRadius = clamp((1.0 - harmonyScore) * 1.0, 0, 3); // Max blur 3px
      filterString = `blur(${blurRadius.toFixed(1)}px)`;
    }

    if (filterString) {
      ctx.filter = filterString;
      const tempFilterCanvas = document.createElement('canvas');
      tempFilterCanvas.width = targetWidth;
      tempFilterCanvas.height = targetHeight;
      const tempFilterCtx = tempFilterCanvas.getContext('2d');
      if(tempFilterCtx){
        tempFilterCtx.putImageData(imageToFilter, 0, 0);
        ctx.drawImage(tempFilterCanvas, 0, 0);
      } else {
         ctx.putImageData(imageToFilter,0,0);
      }
      ctx.filter = 'none'; 
    } else {
      ctx.putImageData(imageToFilter, 0, 0);
    }
    
    resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
  });
};


export const resizeImageData = (imageData: ImageData, newWidth: number, newHeight: number): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Failed to get 2D context for resizing"));
        ctx.putImageData(imageData, 0, 0);

        const newCanvas = document.createElement('canvas');
        newCanvas.width = newWidth;
        newCanvas.height = newHeight;
        const newCtx = newCanvas.getContext('2d');
        if (!newCtx) return reject(new Error("Failed to get 2D context for new canvas"));
        
        newCtx.imageSmoothingEnabled = true;
        newCtx.imageSmoothingQuality = 'high';
        newCtx.drawImage(canvas, 0, 0, imageData.width, imageData.height, 0, 0, newWidth, newHeight); 
        
        resolve(newCtx.getImageData(0, 0, newWidth, newHeight));
    });
};
