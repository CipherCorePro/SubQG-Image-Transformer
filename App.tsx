
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SubQGParams, RiemannStats, TransformationParams, ResolutionOption, MainColor, KnotMap, ImageDimensions } from './types';
import { DEFAULT_SUBQG_PARAMS, DEFAULT_TRANSFORMATION_PARAMS, RESOLUTION_OPTIONS, CATEGORY_LABELS_ORDERED } from './constants';
import { SubQGSimulator } from './services/subqg';
import { 
  loadImageData, 
  imageDataToDataURL,
  extractMainColors, 
  createCategoryActivations,
  resizeKnotMap,
  processImageWithSubQG,
  applyPostProcessing,
  resizeImageData
} from './services/imageUtils';
import { generateImageWithGemini } from './services/geminiService';
import SliderControl from './components/SliderControl';

// LoadingSpinner Component
const LoadingSpinner: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-slate-800 bg-opacity-75 z-50">
    <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="ml-4 text-lg text-sky-300">Processing...</p>
  </div>
);

const App: React.FC = () => {
  const [subQGParams, setSubQGParams] = useState<SubQGParams>(DEFAULT_SUBQG_PARAMS);
  const [transformParams, setTransformParams] = useState<TransformationParams>(DEFAULT_TRANSFORMATION_PARAMS);
  const [resolution, setResolution] = useState<string>(RESOLUTION_OPTIONS[1].label); // Default "Test Medium"
  
  const [geminiPrompt, setGeminiPrompt] = useState<string>("photo of a surreal, vibrant nebula");
  const [inputImageSrc, setInputImageSrc] = useState<string | null>(null);
  const [inputImageDimensions, setInputImageDimensions] = useState<ImageDimensions | null>(null);
  
  const [originalImageForDisplaySrc, setOriginalImageForDisplaySrc] = useState<string | null>(null);
  const [transformedImageSrc, setTransformedImageSrc] = useState<string | null>(null);
  
  const [simulationStats, setSimulationStats] = useState<string>("");
  const [processingTime, setProcessingTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubQGParamChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSubQGParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  }, []);

  const handleTransformParamChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setTransformParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imgSrc = e.target?.result as string;
          setInputImageSrc(imgSrc);
          setOriginalImageForDisplaySrc(imgSrc); // Also show in original display
          const img = new Image();
          img.onload = () => {
            setInputImageDimensions({width: img.width, height: img.height});
            setIsLoading(false);
          }
          img.src = imgSrc;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Error loading image:", err);
        setErrorMsg("Failed to load image. Please try another file.");
        setIsLoading(false);
      }
    }
  }, []);

  const handleGeminiGenerate = async () => {
    if (!geminiPrompt.trim()) {
      setErrorMsg("Please enter a prompt for Gemini image generation.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const generatedImageBase64 = await generateImageWithGemini(geminiPrompt);
      if (generatedImageBase64) {
        setInputImageSrc(generatedImageBase64);
        setOriginalImageForDisplaySrc(generatedImageBase64);
         const img = new Image();
          img.onload = () => {
            setInputImageDimensions({width: img.width, height: img.height});
            setIsLoading(false);
          }
          img.src = generatedImageBase64;
      } else {
        setErrorMsg("Gemini did not return an image.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error generating image with Gemini:", err);
      const error = err as Error;
      setErrorMsg(`Gemini image generation failed: ${error.message}`);
      setIsLoading(false);
    }
  };
  
  const clearInputImage = () => {
    setInputImageSrc(null);
    setOriginalImageForDisplaySrc(null);
    setTransformedImageSrc(null);
    setInputImageDimensions(null);
    setSimulationStats("");
    setProcessingTime("");
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleTransform = async () => {
    if (!inputImageSrc || !inputImageDimensions) {
      setErrorMsg("Please upload or generate an input image first.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    const startTime = performance.now();

    try {
      const originalImageData = await loadImageData(inputImageSrc);

      // Adjust SubQG field size based on input image (optional, or use fixed)
      const field_w = Math.max(32, Math.min(128, originalImageData.width / 8));
      const field_h = Math.max(32, Math.min(128, originalImageData.height / 8));
      const currentSubQGParams = { ...subQGParams, field_w, field_h };
      
      const simulator = new SubQGSimulator(currentSubQGParams);
      const { knot_map, total_knots } = simulator.runSimulation();
      const riemannStats = simulator.analyzeRiemannProjection();

      const statsOutput = 
        `Input Res: ${originalImageData.width}x${originalImageData.height}\n` +
        `SubQG Field: ${field_w}x${field_h} (W,H)\n` +
        `Total Knots: ${total_knots}\n` +
        `Proj. Re(s) Mean: ${riemannStats.mean_re_s.toFixed(3)}, StdDev: ${riemannStats.std_dev_re_s.toFixed(3)}\n` +
        `Harmony Score: ${riemannStats.harmony_score.toFixed(3)}`;
      setSimulationStats(statsOutput);

      const mainColors = extractMainColors(originalImageData, CATEGORY_LABELS_ORDERED.length);
      const categoryActivations = createCategoryActivations(mainColors);

      const resizedKnotMap = resizeKnotMap(knot_map, originalImageData.width, originalImageData.height);
      
      let processedImageData = processImageWithSubQG(
        originalImageData,
        categoryActivations,
        transformParams.brightness_factor,
        transformParams.contrast_factor,
        resizedKnotMap,
        riemannStats.harmony_score
      );

      // Determine target resolution
      const selectedResOption = RESOLUTION_OPTIONS.find(opt => opt.label === resolution);
      let targetWidth = originalImageData.width;
      let targetHeight = originalImageData.height;

      if (selectedResOption && selectedResOption.width && selectedResOption.height) {
        targetWidth = selectedResOption.width;
        targetHeight = selectedResOption.height;
      }
      
      // Apply post-processing (blur/sharpen) AND resize to final output dimensions
      // The applyPostProcessing function now also handles drawing to the target size.
      processedImageData = await applyPostProcessing(processedImageData, riemannStats.harmony_score, targetWidth, targetHeight);
      
      // If original resolution was chosen but processed image size differs from original ImageData after post-processing logic (unlikely here, but good check)
      // or if a specific resolution was chosen and the processedImageData isn't that size yet (applyPostProcessing should handle this)
      if (processedImageData.width !== targetWidth || processedImageData.height !== targetHeight) {
         processedImageData = await resizeImageData(processedImageData, targetWidth, targetHeight);
      }

      setTransformedImageSrc(imageDataToDataURL(processedImageData));

    } catch (err) {
      console.error("Transformation error:", err);
      const error = err as Error;
      setErrorMsg(`Transformation failed: ${error.message}`);
    } finally {
      const endTime = performance.now();
      setProcessingTime(`Processing Time: ${( (endTime - startTime) / 1000).toFixed(2)}s`);
      setIsLoading(false);
    }
  };

  // Ensure API Key availability message is shown if process.env.API_KEY is not set by bundler.
  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("process.env.API_KEY is not set. Gemini features will not work. Ensure your bundler (Vite, Webpack, etc.) is configured to replace this environment variable.");
      // Optionally, set an error message for the user.
      // setErrorMsg("Gemini API Key is not configured. Image generation is disabled.");
    }
  }, []);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col relative">
      {isLoading && <LoadingSpinner />}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-sky-400">Subquanten-Resonanz Bildtransformation</h1>
        <p className="text-slate-400 mt-2">Transformiert Bilder tiefgreifend basierend auf SubQG-Simulationen und Farbcharakteristik.</p>
      </header>

      {errorMsg && (
        <div className="my-4 p-3 bg-red-700 border border-red-500 text-white rounded-md text-center">
          {errorMsg}
        </div>
      )}

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg shadow-xl overflow-y-auto max-h-[calc(100vh-180px)]">
          <h2 className="text-2xl font-semibold text-sky-500 mb-4 border-b-2 border-slate-700 pb-2">Controls</h2>
          
          <div className="mb-6 p-4 bg-slate-700 rounded-md">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">1. Input Image</h3>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              ref={fileInputRef}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer mb-2" 
            />
            <div className="my-2 text-center text-sm text-slate-400">- OR -</div>
            <input 
              type="text" 
              value={geminiPrompt} 
              onChange={(e) => setGeminiPrompt(e.target.value)} 
              placeholder="Enter DALL·E/Gemini prompt" 
              className="w-full p-2 rounded-md bg-slate-600 text-slate-100 border border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 mb-2"
            />
            <button onClick={handleGeminiGenerate} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out mb-2">
              🖼️ Generate with Gemini
            </button>
             {inputImageSrc && (
              <button onClick={clearInputImage} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                Clear Input Image
              </button>
            )}
          </div>

          <div className="mb-6 p-4 bg-slate-700 rounded-md">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">2. Global Transformation</h3>
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Brightness Shift" id="brightness_factor" value={transformParams.brightness_factor} min={-0.6} max={0.6} step={0.02} onChange={handleTransformParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Contrast Factor" id="contrast_factor" value={transformParams.contrast_factor} min={0.7} max={1.7} step={0.02} onChange={handleTransformParamChange} />
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium text-slate-300 mb-1">Output Resolution</label>
              <select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full p-2 rounded-md bg-slate-600 text-slate-100 border border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                {RESOLUTION_OPTIONS.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-slate-700 rounded-md">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">3. SubQG Simulator & Riemann</h3>
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Sim Duration" id="sim_duration" value={subQGParams.sim_duration} min={10} max={100} step={5} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Noise Factor" id="noise_factor" value={subQGParams.noise_factor} min={0.0} max={0.25} step={0.01} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Knot Threshold S" id="threshold_s" value={subQGParams.threshold_s} min={0.60} max={0.90} step={0.01} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Decimal Precision" id="decimal_precision" value={subQGParams.decimal_precision} min={2} max={4} step={1} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="F_ENERGY" id="f_energy" value={subQGParams.f_energy} min={0.05} max={0.35} step={0.01} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="F_PHASE" id="f_phase" value={subQGParams.f_phase} min={0.05} max={0.35} step={0.001} onChange={handleSubQGParamChange} />
            {/* Fix: Explicitly pass value prop and remove incorrect spreads for SliderControls */}
            <SliderControl label="Re(s) Scaling C" id="re_s_scaling_c" value={subQGParams.re_s_scaling_c} min={0.05} max={0.20} step={0.01} onChange={handleSubQGParamChange} />
          </div>

          <button 
            onClick={handleTransform} 
            disabled={isLoading || !inputImageSrc}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-md text-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🌌 Transform Image 🌌
          </button>
        </div>

        {/* Image Display Column */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col items-center overflow-y-auto max-h-[calc(100vh-180px)]">
          <h2 className="text-2xl font-semibold text-sky-500 mb-4 border-b-2 border-slate-700 pb-2 w-full text-center">Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full flex-grow">
            <div className="flex flex-col items-center p-3 bg-slate-700 rounded-md">
              <h3 className="text-lg font-semibold text-sky-400 mb-2">Original Input</h3>
              {originalImageForDisplaySrc ? (
                <img src={originalImageForDisplaySrc} alt="Original Input" className="max-w-full max-h-64 md:max-h-80 object-contain rounded-md shadow-md" />
              ) : (
                <div className="w-full h-64 md:h-80 bg-slate-600 rounded-md flex items-center justify-center text-slate-400">Upload or generate an image</div>
              )}
            </div>
            <div className="flex flex-col items-center p-3 bg-slate-700 rounded-md">
              <h3 className="text-lg font-semibold text-sky-400 mb-2">Transformed Artwork</h3>
              {transformedImageSrc ? (
                <>
                  <img src={transformedImageSrc} alt="Transformed Art" className="max-w-full max-h-64 md:max-h-80 object-contain rounded-md shadow-md" />
                  <a 
                    href={transformedImageSrc} 
                    download="transformed_art.png" 
                    className="mt-3 inline-block bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md text-sm transition duration-150 ease-in-out"
                  >
                    Download Artwork
                  </a>
                </>
              ) : (
                <div className="w-full h-64 md:h-80 bg-slate-600 rounded-md flex items-center justify-center text-slate-400">Result will appear here</div>
              )}
            </div>
          </div>
          <div className="mt-6 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-3 bg-slate-700 rounded-md">
              <h3 className="text-lg font-semibold text-sky-400 mb-2">Simulation & Riemann Stats</h3>
              <pre className="text-xs text-slate-300 bg-slate-600 p-3 rounded-md whitespace-pre-wrap h-36 overflow-y-auto">{simulationStats || "No data yet."}</pre>
            </div>
            <div className="p-3 bg-slate-700 rounded-md">
              <h3 className="text-lg font-semibold text-sky-400 mb-2">Processing Time</h3>
              <pre className="text-sm text-slate-300 bg-slate-600 p-3 rounded-md whitespace-pre-wrap h-36 flex items-center justify-center">{processingTime || "N/A"}</pre>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center mt-8 py-4 border-t border-slate-700">
        <p className="text-sm text-slate-500">SubQG Image Transformer - Powered by React, Tailwind, and Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
