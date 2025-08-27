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
    haptics.light();
    sounds.click();
  };

  const getInputClass = () => {
    const baseClass = `
      w-10/12 px-6 py-4 text-xl
      bg-white/90 backdrop-blur
      rounded-chunky border-4
      shadow-chunky
      focus:shadow-glow focus:scale-[1.02]
      focus:outline-none
      transition-all duration-200
      placeholder:text-gray-400
      font-medium
    `;

    if (!touched || validationState === 'idle') {
      return `${baseClass} border-black focus:border-qr-sunset2`;
    }
    
    if (validationState === 'valid') {
      return `${baseClass} border-green-500 focus:border-green-600`;
    }
    
    if (validationState === 'invalid') {
      return `${baseClass} border-red-500 focus:border-red-600 animate-shake`;
    }

    return baseClass;
  };

  return (
    <div class="flex flex-col items-center space-y-2">
      <div class="relative w-full flex justify-center">
        <input
          type="url"
          value={url.value}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={() => setTouched(true)}
          placeholder="Your link here"
          class={getInputClass()}
        />
        
        {/* Validation indicator */}
        {touched && validationState === 'valid' && (
          <div class="absolute right-4 top-1/2 transform -translate-y-1/2 
                      text-green-500 text-2xl animate-pop">
            ✓
          </div>
        )}
      </div>

      {/* Helper text */}
      <div class="text-center text-sm h-4">
        {touched && validationState === 'invalid' && url.value.trim() !== '' && (
          <p class="text-red-500 animate-slide-down">
            Enter any text or URL to generate a QR code
          </p>
        )}
        {touched && validationState === 'valid' && (
          <p class="text-green-600 animate-slide-down">
            Ready to generate QR code!
          </p>
        )}
      </div>
    </div>
  );
}
