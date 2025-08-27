import { Signal } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";

interface URLInputProps {
  url: Signal<string>;
}

export default function URLInput({ url }: URLInputProps) {
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [touched, setTouched] = useState(false);

  // URL validation function
  const validateURL = (urlString: string): boolean => {
    if (!urlString.trim()) return false;
    
    try {
      // Try basic URL validation
      if (urlString.includes('.') || urlString.startsWith('http')) {
        // Allow basic domains and URLs
        return urlString.length > 3;
      }
      return urlString.length > 0; // Allow any text for QR generation
    } catch {
      return urlString.length > 0; // Fallback: allow any non-empty string
    }
  };

  // Update validation state when URL changes
  useEffect(() => {
    if (!touched) return;
    
    const isValid = validateURL(url.value);
    const newState = url.value.trim() === '' ? 'idle' : (isValid ? 'valid' : 'invalid');
    
    if (newState !== validationState) {
      setValidationState(newState);
      
      // Haptic feedback for validation changes
      if (newState === 'valid' && validationState === 'invalid') {
        haptics.light();
      } else if (newState === 'invalid' && validationState === 'valid') {
        haptics.error();
      }
    }
  }, [url.value, touched, validationState]);

  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    url.value = input.value;
    
    if (!touched) {
      setTouched(true);
    }
  };

  const handleFocus = () => {
    haptics.medium();  // More satisfying haptic
    sounds.click();
  };

  const getInputClass = () => {
    const baseClass = `
      w-full px-4 py-3 text-lg
      bg-white border-3 border-black
      rounded-xl
      focus:outline-none focus:ring-4 focus:ring-pink-400 focus:border-pink-500
      focus:scale-[1.02] focus:shadow-xl
      transition-all duration-300 ease-out
      placeholder:text-gray-500
    `;

    if (!touched || validationState === 'idle') {
      return baseClass;
    }
    
    if (validationState === 'valid') {
      return `${baseClass} border-green-500`;
    }
    
    if (validationState === 'invalid') {
      return `${baseClass} border-red-500 animate-shake`;
    }

    return baseClass;
  };

  return (
    <div class="w-full">
      <div class="relative">
        <input
          type="url"
          value={url.value}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={() => setTouched(true)}
          placeholder="Enter URL or text here..."
          class={getInputClass()}
        />
        
        {/* Validation indicator */}
        {touched && validationState === 'valid' && (
          <div class="absolute right-4 top-1/2 transform -translate-y-1/2 
                      text-green-500 text-xl animate-pop">
            ✓
          </div>
        )}
      </div>

      {/* Helper text */}
      {touched && validationState === 'invalid' && url.value.trim() !== '' && (
        <p class="text-red-500 text-sm mt-2 text-center animate-slide-down">
          Enter any text or URL
        </p>
      )}
    </div>
  );
}
