import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/utils';
import type { PartSearchResult } from '@/services/ticketService';

interface PartSearchPickerProps {
  results: PartSearchResult[];
  buttonLabel?: string;
  onAdd: (part: PartSearchResult, quantity: number) => void;
}

/** Select one part from the search results, enter its quantity once, then a single Add button - not one input/button pair per result row. */
export function PartSearchPicker({
  results,
  buttonLabel = 'Add to List',
  onAdd,
}: PartSearchPickerProps) {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    setSelectedPartId(null);
    setQuantity('');
  }, [results]);

  const selectedPart = results.find((part) => part.id === selectedPartId) ?? null;
  const parsedQuantity = Number(quantity);
  const canAdd =
    Boolean(selectedPart) &&
    quantity !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0;

  const handleAdd = () => {
    if (!selectedPart || !canAdd) return;
    onAdd(selectedPart, parsedQuantity);
    setSelectedPartId(null);
    setQuantity('');
  };

  if (results.length === 0) return null;

  return (
    <div className="space-y-1 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
      {results.map((part) => (
        <button
          type="button"
          key={part.id}
          aria-pressed={selectedPartId === part.id}
          onClick={() => setSelectedPartId(part.id)}
          className={cn(
            'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
            selectedPartId === part.id
              ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-400 dark:bg-blue-500/10 dark:text-blue-200'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
          )}
        >
          {part.partCode} · {part.partName} · Available: {part.availableQuantity}
        </button>
      ))}
      {selectedPart && (
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedPart.partCode}
          </span>
          <Input
            aria-label={`Required quantity for ${selectedPart.partCode}`}
            placeholder="Qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-20"
          />
          <Button size="sm" disabled={!canAdd} onClick={handleAdd}>
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
