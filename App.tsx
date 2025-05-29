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
  resizeImageData,
  knotMapToVisualDataURL
} from './services/imageUtils';
import { generateImageWithGemini } from './services/geminiService';
import SliderControl from './components/SliderControl';
import HarmonyVisualizer from './components/HarmonyVisualizer'; // Import new component

// LoadingSpinner Component
const LoadingSpinner: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-900 bg-opacity-80 z-50" role="alert" aria-live="assertive">
    <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="ml-4 text-xl text-sky-300 font-semibold">Processing...</p>
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
  const [knotMapVisualSrc, setKnotMapVisualSrc] = useState<string | null>(null); // For knot map visualization
  
  const [riemannStatsDisplay, setRiemannStatsDisplay] = useState<RiemannStats | null>(null); // Store full stats object
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
      setTransformedImageSrc(null);
      setKnotMapVisualSrc(null);
      setRiemannStatsDisplay(null);
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imgSrc = e.target?.result as string;
          setInputImageSrc(imgSrc);
          setOriginalImageForDisplaySrc(imgSrc); 
          const img = new Image();
          img.onload = () => {
            setInputImageDimensions({width: img.width, height: img.height});
            setIsLoading(false);
          }
          img.onerror = () => {
            setErrorMsg("Could not load image metadata. It might be corrupted or an unsupported format.");
            setIsLoading(false);
          }
          img.src = imgSrc; // This will trigger onload, Image can handle data URLs of SVGs too
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
    setTransformedImageSrc(null);
    setKnotMapVisualSrc(null);
    setRiemannStatsDisplay(null);
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
          img.onerror = () => {
            setErrorMsg("Could not load image metadata from Gemini result.");
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
    setRiemannStatsDisplay(null);
    setKnotMapVisualSrc(null);
    setProcessingTime("");
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
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

      const field_w = Math.max(32, Math.min(128, Math.floor(originalImageData.width / 8)));
      const field_h = Math.max(32, Math.min(128, Math.floor(originalImageData.height / 8)));
      const currentSubQGParams = { ...subQGParams, field_w, field_h };
      
      const simulator = new SubQGSimulator(currentSubQGParams);
      const { knot_map, total_knots } = simulator.runSimulation();
      const riemannStatsRaw = simulator.analyzeRiemannProjection();
      
      setRiemannStatsDisplay(riemannStatsRaw); // Store raw stats
      setKnotMapVisualSrc(knotMapToVisualDataURL(knot_map));


      const mainColors = extractMainColors(originalImageData, CATEGORY_LABELS_ORDERED.length);
      const categoryActivations = createCategoryActivations(mainColors);

      const resizedKnotMap = resizeKnotMap(knot_map, originalImageData.width, originalImageData.height);
      
      let processedImageData = processImageWithSubQG(
        originalImageData,
        categoryActivations,
        transformParams.brightness_factor,
        transformParams.contrast_factor,
        resizedKnotMap,
        riemannStatsRaw.harmony_score
      );

      const selectedResOption = RESOLUTION_OPTIONS.find(opt => opt.label === resolution);
      let targetWidth = originalImageData.width;
      let targetHeight = originalImageData.height;

      if (selectedResOption && selectedResOption.width && selectedResOption.height) {
        targetWidth = selectedResOption.width;
        targetHeight = selectedResOption.height;
      }
      
      processedImageData = await applyPostProcessing(processedImageData, riemannStatsRaw.harmony_score, targetWidth, targetHeight);
      
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

  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("process.env.API_KEY is not set. Gemini features will not work. Ensure your bundler (Vite, Webpack, etc.) is configured to replace this environment variable.");
    }
  }, []);

  const getStatsString = (stats: RiemannStats | null): string => {
    if (!stats) return "No data yet.";
    return (
      `Input Res: ${inputImageDimensions?.width || 'N/A'}x${inputImageDimensions?.height || 'N/A'}\n` +
      `SubQG Field: ${subQGParams.field_w}x${subQGParams.field_h} (W,H)\n` + // Use current params for display
      `Total Knots: ${stats.total_projected_knots}\n` + // total_knots from runSimulation might be more accurate raw count
      `Proj. Re(s) Mean: ${stats.mean_re_s.toFixed(3)}, StdDev: ${stats.std_dev_re_s.toFixed(3)}\n` +
      `Harmony Score: ${stats.harmony_score.toFixed(3)}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col">
      {isLoading && <LoadingSpinner />}
      <header className="mb-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-sky-400">Subquanten-Resonanz Bildtransformation</h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">Transformiert Bilder tiefgreifend basierend auf SubQG-Simulationen und Farbcharakteristik.</p>
      </header>

      {errorMsg && (
        <div className="my-4 p-3 bg-red-800 border border-red-600 text-white rounded-md text-center shadow-lg" role="alert">
          {errorMsg}
        </div>
      )}

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-1 bg-slate-800 p-4 md:p-6 rounded-lg shadow-xl self-stretch">
          <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-2"> {/* Added pr-2 for scrollbar space */}
            <h2 className="text-xl md:text-2xl font-semibold text-sky-500 mb-4 border-b-2 border-slate-700 pb-2">Controls</h2>
            
            <div className="mb-6 p-3 md:p-4 bg-slate-700/50 rounded-md">
              <h3 className="text-md md:text-lg font-semibold text-sky-400 mb-2">1. Input Image</h3>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/gif, image/webp, image/svg+xml, .svg" 
                onChange={handleImageUpload} 
                ref={fileInputRef}
                aria-label="Upload image"
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer mb-2" 
              />
              <div className="my-2 text-center text-xs text-slate-400">- OR -</div>
              <input 
                type="text" 
                value={geminiPrompt} 
                onChange={(e) => setGeminiPrompt(e.target.value)} 
                placeholder="Enter Gemini prompt" 
                aria-label="Gemini image prompt"
                className="w-full p-2 rounded-md bg-slate-600 text-slate-100 border border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 mb-2"
              />
              <button onClick={handleGeminiGenerate} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 md:px-4 rounded-md transition duration-150 ease-in-out mb-2 text-sm md:text-base">
                🖼️ Generate with Gemini
              </button>
              {inputImageSrc && (
                <button onClick={clearInputImage} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-3 md:px-4 rounded-md transition duration-150 ease-in-out text-sm md:text-base">
                  Clear Input Image
                </button>
              )}
            </div>

            <div className="mb-6 p-3 md:p-4 bg-slate-700/50 rounded-md">
              <h3 className="text-md md:text-lg font-semibold text-sky-400 mb-2">2. Global Transformation</h3>
              <SliderControl label="Brightness Shift" id="brightness_factor" value={transformParams.brightness_factor} min={-0.6} max={0.6} step={0.02} onChange={handleTransformParamChange} />
              <SliderControl label="Contrast Factor" id="contrast_factor" value={transformParams.contrast_factor} min={0.7} max={1.7} step={0.02} onChange={handleTransformParamChange} />
              <div>
                <label htmlFor="resolution" className="block text-sm font-medium text-slate-300 mb-1">Output Resolution</label>
                <select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} aria-label="Output resolution" className="w-full p-2 rounded-md bg-slate-600 text-slate-100 border border-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500">
                  {RESOLUTION_OPTIONS.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            
            <div className="mb-6 p-3 md:p-4 bg-slate-700/50 rounded-md">
              <h3 className="text-md md:text-lg font-semibold text-sky-400 mb-2">3. SubQG Simulator & Riemann</h3>
              <SliderControl label="Sim Duration" id="sim_duration" value={subQGParams.sim_duration} min={10} max={100} step={5} onChange={handleSubQGParamChange} />
              <SliderControl label="Noise Factor" id="noise_factor" value={subQGParams.noise_factor} min={0.0} max={0.25} step={0.01} onChange={handleSubQGParamChange} />
              <SliderControl label="Knot Threshold S" id="threshold_s" value={subQGParams.threshold_s} min={0.60} max={0.90} step={0.01} onChange={handleSubQGParamChange} />
              <SliderControl label="Decimal Precision" id="decimal_precision" value={subQGParams.decimal_precision} min={2} max={4} step={1} onChange={handleSubQGParamChange} />
              <SliderControl label="F_ENERGY" id="f_energy" value={subQGParams.f_energy} min={0.05} max={0.35} step={0.01} onChange={handleSubQGParamChange} />
              <SliderControl label="F_PHASE" id="f_phase" value={subQGParams.f_phase} min={0.05} max={0.35} step={0.001} onChange={handleSubQGParamChange} />
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
        </div>

        {/* Image Display Column */}
        <div className="lg:col-span-2 bg-slate-800 p-4 md:p-6 rounded-lg shadow-xl self-stretch">
           <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
            <h2 className="text-xl md:text-2xl font-semibold text-sky-500 mb-4 border-b-2 border-slate-700 pb-2 w-full text-center">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-4">
              <div className="flex flex-col items-center p-3 bg-slate-700/50 rounded-md">
                <h3 className="text-md font-semibold text-sky-400 mb-2">Original Input</h3>
                {originalImageForDisplaySrc ? (
                  <img src={originalImageForDisplaySrc} alt="Original Input" className="max-w-full max-h-60 md:max-h-72 object-contain rounded-md shadow-md" />
                ) : (
                  <div className="w-full h-60 md:h-72 bg-slate-600 rounded-md flex items-center justify-center text-slate-400 text-sm p-2">Upload or generate an image</div>
                )}
              </div>
              <div className="flex flex-col items-center p-3 bg-slate-700/50 rounded-md">
                <h3 className="text-md font-semibold text-sky-400 mb-2">Transformed Artwork</h3>
                {transformedImageSrc ? (
                  <>
                    <img src={transformedImageSrc} alt="Transformed Art" className="max-w-full max-h-60 md:max-h-72 object-contain rounded-md shadow-md" />
                    <a 
                      href={transformedImageSrc} 
                      download="transformed_art.png" 
                      className="mt-3 inline-block bg-green-600 hover:bg-green-500 text-white font-semibold py-1.5 px-3 rounded-md text-xs md:text-sm transition duration-150 ease-in-out"
                    >
                      Download Artwork
                    </a>
                  </>
                ) : (
                  <div className="w-full h-60 md:h-72 bg-slate-600 rounded-md flex items-center justify-center text-slate-400 text-sm p-2">Result will appear here</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="md:col-span-1 flex flex-col items-center p-3 bg-slate-700/50 rounded-md">
                  <h3 className="text-md font-semibold text-sky-400 mb-2">SubQG Knot Map</h3>
                  {knotMapVisualSrc ? (
                    <img 
                      src={knotMapVisualSrc} 
                      alt="SubQG Knot Map" 
                      className="w-28 h-28 md:w-32 md:h-32 object-contain rounded-sm shadow-md border border-slate-600" 
                      style={{ imageRendering: 'pixelated' }} 
                    />
                  ) : (
                    <div className="w-28 h-28 md:w-32 md:h-32 bg-slate-600 rounded-sm flex items-center justify-center text-slate-400 text-xs p-1">No map data</div>
                  )}
              </div>
              <div className="md:col-span-2 p-3 bg-slate-700/50 rounded-md">
                <h3 className="text-md font-semibold text-sky-400 mb-1">Simulation & Riemann Stats</h3>
                <HarmonyVisualizer harmonyScore={riemannStatsDisplay?.harmony_score ?? null} />
                <pre className="text-xs text-slate-300 bg-slate-600 p-2 rounded-md whitespace-pre-wrap h-24 md:h-[calc(theme(space.32)-theme(space.8))] overflow-y-auto">{getStatsString(riemannStatsDisplay)}</pre>
              </div>
            </div>
             <div className="mt-4 w-full p-3 bg-slate-700/50 rounded-md">
                <h3 className="text-md font-semibold text-sky-400 mb-2">Processing Time</h3>
                <pre className="text-sm text-slate-300 bg-slate-600 p-3 rounded-md whitespace-pre-wrap text-center">{processingTime || "N/A"}</pre>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center mt-6 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">SubQG Image Transformer - Powered by React, Tailwind, and Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;