
import React from 'react';

interface SliderControlProps {
  label: string;
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
}

const SliderControl: React.FC<SliderControlProps> = ({ label, id, min, max, step, value, onChange, unit }) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
        {label}: <span className="font-semibold text-sky-400">{value.toFixed(id.includes('precision') ? 0 : (step < 0.01 ? 3 : (step < 0.1 ? 2 : 1)))}{unit}</span>
      </label>
      <input
        type="range"
        id={id}
        name={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
      />
    </div>
  );
};

export default SliderControl;
