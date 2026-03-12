import { useRef, useCallback, useState } from 'react';
import { MRP_REGEX } from '../utils/constants';

interface UseOcr {
  extractMrp: (blob: Blob) => Promise<string | null>;
  extractFullText: (blob: Blob) => Promise<string>;
  isProcessing: boolean;
}

export function useOcr(): UseOcr {
  const workerRef = useRef<import('tesseract.js').Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getWorker = useCallback(async () => {
    if (!workerRef.current) {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng');
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const extractMrp = useCallback(
    async (blob: Blob): Promise<string | null> => {
      setIsProcessing(true);
      try {
        const worker = await getWorker();
        const { data } = await worker.recognize(blob);
        const match = data.text.match(MRP_REGEX);
        return match ? match[1].replace(/,/g, '') : null;
      } catch {
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [getWorker],
  );

  const extractFullText = useCallback(
    async (blob: Blob): Promise<string> => {
      try {
        const worker = await getWorker();
        const { data } = await worker.recognize(blob);
        return data.text.trim();
      } catch {
        return '';
      }
    },
    [getWorker],
  );

  return { extractMrp, extractFullText, isProcessing };
}
