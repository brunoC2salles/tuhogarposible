import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

/**
 * Clasificación de agentes de 1 a 5 estrellas.
 * Solo editable por admin (readOnly=false).
 */
export function AgentStarRating({ value, onChange, readOnly = false, size = 18 }: AgentStarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(null)}
          className={cn(
            'p-0.5 rounded transition-colors',
            readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-muted',
          )}
          aria-label={`Asignar ${n} estrellas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              n <= shown ? 'fill-primary text-primary' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Peso "muy suave": 1★=1.00 … 5★=1.40 */
export function starWeight(estrellas: number): number {
  const s = Math.min(5, Math.max(1, Math.round(estrellas || 3)));
  return 1 + (s - 1) * 0.1;
}
