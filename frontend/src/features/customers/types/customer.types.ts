export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CustomerFiltersState {
  search: string;
  status: '' | CustomerStatus;
}

export interface CustomerSortState {
  key: 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}
