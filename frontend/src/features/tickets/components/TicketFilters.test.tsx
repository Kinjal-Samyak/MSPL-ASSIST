import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TicketFilters } from './TicketFilters';
import type {
  TicketFilterOptions,
  TicketFiltersState,
} from '@/features/tickets/types/ticket.types';

const FILTERS: TicketFiltersState = {
  search: '',
  hub: '',
  priority: '',
  status: '',
  category: '',
  technician: '',
  vehicleModel: '',
  vehicleType: '',
  startDate: '',
  endDate: '',
};

const OPTIONS: TicketFilterOptions = {
  hubs: ['KOL-TARATALA'],
  priorities: ['P1', 'P2', 'P3', 'P4'],
  statuses: ['OPEN', 'ASSIGNED'],
  categories: ['Electrical'],
  technicians: ['Ravi'],
  vehicleModels: ['Activa'],
};

describe('TicketFilters', () => {
  it('renders a Vehicle Model dropdown seeded from options and reports changes', () => {
    const onChange = vi.fn();
    render(<TicketFilters filters={FILTERS} options={OPTIONS} onChange={onChange} />);

    const vehicleModelSelect = screen.getByDisplayValue('Vehicle Model');
    fireEvent.change(vehicleModelSelect, { target: { value: 'Activa' } });

    expect(onChange).toHaveBeenCalledWith({ vehicleModel: 'Activa' });
  });

  it('renders a free-text Vehicle Type filter and reports changes', () => {
    const onChange = vi.fn();
    render(<TicketFilters filters={FILTERS} options={OPTIONS} onChange={onChange} />);

    const vehicleTypeInput = screen.getByPlaceholderText('Vehicle Type');
    fireEvent.change(vehicleTypeInput, { target: { value: 'Scooter' } });

    expect(onChange).toHaveBeenCalledWith({ vehicleType: 'Scooter' });
  });
});
