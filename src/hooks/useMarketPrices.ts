import { useState, useEffect } from 'react';
import type { MarketPrice } from '@/data/marketPrices';

/**
 * Hook to lazy-load market prices data.
 * Only loads the ~4MB JSON when this hook is first used.
 */
export function useMarketPrices() {
  const [map, setMap] = useState<Record<string, MarketPrice> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    setLoading(true);
    
    import('@/data/marketPrices').then(async (mod) => {
      const data = await mod.getMarketPricesMap();
      if (!cancelled) {
        setMap(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setMap({});
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { map, loading };
}
