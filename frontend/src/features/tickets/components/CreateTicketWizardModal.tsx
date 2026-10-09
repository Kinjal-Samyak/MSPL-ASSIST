import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { Modal } from '@/components/layout';
import { Button, Card, Input, Textarea } from '@/components/ui';
import {
  customerService,
  type CustomerSearchItem,
  type CustomerVehicleResponse,
} from '@/services/customerService';
import { toApiErrorMessage } from '@/services/apiService';
import { getBookingsByUserId } from '@/services/rentalBookingService';
import { searchRentalUsers, type RentalUserResult } from '@/services/rentalUserService';
import { ticketService, type CreateTicketResponse } from '@/services/ticketService';
import { lookupService, type IssueCategoryLookupResponse } from '@/services/lookupService';
import { useTicketConversation } from '@/features/tickets/hooks/useTicketConversation';
import type {
  ConversationIssueGroup,
  ConversationPhoto,
  RideabilityStatus,
} from '@/features/tickets/types/conversation.types';
import {
  countConversationWords,
  validateConversationStep,
  validateConversationSubmission,
} from '@/features/tickets/utils/conversation.validation';

async function registeredMobileForTicket(rider: CustomerSearchItem): Promise<string> {
  const digits = rider.mobileNumber.replace(/\D/g, '');
  if (rider.customerId) {
    return digits;
  }

  const page = await customerService.searchCustomers({
    page: 1,
    pageSize: 20,
    search: digits,
  });
  const exact = page.items.find((item) => item.mobileNumber.replace(/\D/g, '') === digits);
  if (exact) {
    return exact.mobileNumber.replace(/\D/g, '');
  }

  await customerService.createCustomer({
    customerName: rider.customerName.trim(),
    registeredMobile: digits,
  });
  return digits;
}

export interface CreateTicketSubmission {
  customerId: string;
  registeredMobile: string;
  vehicleNumber?: string;
  mvTrackNumber?: string;
  issueCategoryId: string;
  issueCategory: string;
  issueSubcategory: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  description: string;
  attachments: File[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTicketSubmission) => Promise<void>;
  onConversationCreated?: (ticket: CreateTicketResponse) => void;
  onViewTicket?: (ticketId: string) => void;
}

const STEPS = [
  'Find rider',
  'Confirm vehicle',
  'Can you ride it?',
  'What is the problem?',
  'Tell us more',
  'Another issue?',
  'Anything else?',
  'Upload photo',
  'Review',
  'Success',
];

export function CreateTicketWizardModal({
  isOpen,
  onClose,
  onConversationCreated,
  onViewTicket,
}: Props) {
  const {
    state,
    patch,
    reset,
    setIssueCollectionMessage,
    addPhotos,
    removePhoto,
    next,
    back,
    edit,
    complete,
  } = useTicketConversation();
  const step = state.currentStep;
  const query = state.query;
  const results = state.searchResults;
  const rider = state.selectedRider;
  const vehicles = state.deploymentVehicles;
  const vehicle = state.selectedVehicle;
  const {
    rideability,
    issueCategories,
    selectedCategory,
    subcategories,
    selectedSubcategory,
    issueGroups,
    remarks,
    photos,
    createdTicket,
  } = state;
  const loading = state.isSearching;
  const issueLoading = state.isIssueLoading;
  const submitting = state.submissionStatus === 'SUBMITTING';
  const message = state.validation.riderSearch;
  const issueMessage = state.validation.issueCollection;
  const submissionError = state.validation.submission;
  const stepTitleRef = useRef<HTMLParagraphElement>(null);
  const [rentalUsers, setRentalUsers] = useState<RentalUserResult[]>([]);
  const [rentalMessage, setRentalMessage] = useState('');
  const [selectedRentalUserId, setSelectedRentalUserId] = useState<string | null>(null);

  const setQuery = (value: string) => patch({ query: value });
  const setVehicle = (value: CustomerVehicleResponse | null) => patch({ selectedVehicle: value });
  const setRideability = (value: RideabilityStatus | null) => patch({ rideability: value });
  const setSelectedCategory = (value: IssueCategoryLookupResponse | null) =>
    patch({ selectedCategory: value });
  const setSubcategories = (value: string[]) => patch({ subcategories: value });
  const setSelectedSubcategory = (value: string | null) => patch({ selectedSubcategory: value });
  const setIssueGroups = (
    next:
      ConversationIssueGroup[] | ((groups: ConversationIssueGroup[]) => ConversationIssueGroup[])
  ) => patch({ issueGroups: typeof next === 'function' ? next(state.issueGroups) : next });
  const setIssueLoading = (value: boolean) => patch({ isIssueLoading: value });
  const setRemarks = (value: string) => patch({ remarks: value });
  const setLoading = (value: boolean) => patch({ isSearching: value });
  const setMessage = (value: string) =>
    patch({ validation: { ...state.validation, riderSearch: value } });
  const setIssueMessage = (value: string) =>
    patch({ validation: { ...state.validation, issueCollection: value } });
  const setSubmissionError = (value: string) =>
    patch({ validation: { ...state.validation, submission: value } });

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => stepTitleRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, step]);

  const cancelConversation = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen || step !== 3 || issueCategories.length > 0) {
      return;
    }
    let current = true;
    patch({ isIssueLoading: true });
    setIssueCollectionMessage('');
    void lookupService
      .getIssueCategories()
      .then((categories) => {
        if (current) {
          patch({ issueCategories: categories.filter((category) => category.active) });
        }
      })
      .catch((error) => {
        if (current) {
          setIssueCollectionMessage(toApiErrorMessage(error));
        }
      })
      .finally(() => {
        if (current) {
          patch({ isIssueLoading: false });
        }
      });
    return () => {
      current = false;
    };
  }, [isOpen, issueCategories.length, patch, setIssueCollectionMessage, step]);

  const find = async () => {
    if (!query.trim()) {
      setMessage('Enter a registered mobile number or rider name.');
      setRentalUsers([]);
      setRentalMessage('');
      setSelectedRentalUserId(null);
      return;
    }
    setLoading(true);
    setMessage('');
    setSelectedRentalUserId(null);
    try {
      const users = await searchRentalUsers(query.trim());
      setRentalUsers(users);
      setRentalMessage(users.length ? '' : 'No users matched that search.');
    } catch (error: unknown) {
      setRentalUsers([]);
      setRentalMessage(error instanceof Error ? error.message : 'User search failed.');
    } finally {
      setLoading(false);
    }

    // Existing MSPL rider search. Commented so this step uses GetAllUsers only.
    // const setResults = (value: CustomerSearchItem[]) => patch({ searchResults: value });
    // try {
    //   const data = await customerService.searchCustomers({
    //     page: 1,
    //     pageSize: 20,
    //     search: query.trim(),
    //   });
    //   setResults(data.items);
    //   setMessage(data.items.length ? '' : "We couldn't find a rider with those details.");
    // } catch (error) {
    //   setMessage(toApiErrorMessage(error));
    // }
  };

  const selectRentalUser = async (user: RentalUserResult) => {
    setSelectedRentalUserId(user.id);
    setRentalMessage('');
    setLoading(true);
    try {
      const phoneDigits = user.phone.replace(/\D/g, '');
      const phoneWithoutCountry =
        phoneDigits.startsWith('91') && phoneDigits.length > 10
          ? phoneDigits.slice(2)
          : phoneDigits;
      const searches = [user.name, phoneDigits, phoneWithoutCountry].filter(
        (value, index, all) => value.length > 0 && all.indexOf(value) === index
      );
      const bookingsRequest = getBookingsByUserId(user.id).then(
        (vehicles) => ({ vehicles, message: '' }),
        (error: unknown) => ({
          vehicles: [] as CustomerVehicleResponse[],
          message: error instanceof Error ? error.message : 'Could not load bookings.',
        })
      );
      const [pages, bookings] = await Promise.all([
        Promise.all(
          searches.map((search) =>
            customerService.searchCustomers({
              page: 1,
              pageSize: 20,
              search,
            })
          )
        ),
        bookingsRequest,
      ]);
      const seen = new Set<string>();
      const candidates = pages
        .flatMap((page) => page.items)
        .filter((item) => {
          if (seen.has(item.customerId)) {
            return false;
          }
          seen.add(item.customerId);
          return true;
        });
      const name = user.name.trim().toLowerCase();
      const match =
        candidates.find((item) => {
          const saved = item.mobileNumber.replace(/\D/g, '');
          const savedWithoutCountry =
            saved.startsWith('91') && saved.length > 10 ? saved.slice(2) : saved;
          return phoneWithoutCountry.length >= 4 && savedWithoutCountry === phoneWithoutCountry;
        }) ?? candidates.find((item) => item.customerName.trim().toLowerCase() === name);

      await selectRider(
        match ?? {
          customerId: '',
          customerName: user.name,
          mobileNumber: user.phone,
          hub: null,
          activeDeploymentCount: 0,
        },
        bookings.vehicles,
        bookings.message
      );
    } catch (error) {
      setRentalMessage(toApiErrorMessage(error));
      setLoading(false);
    }
  };

  const selectRider = async (
    selectedRider: CustomerSearchItem,
    rentalVehicles: CustomerVehicleResponse[] = [],
    bookingMessage = ''
  ) => {
    const clearedValidation = { riderSearch: '', issueCollection: '', photos: '', submission: '' };
    reset();
    patch({
      selectedRider,
      deploymentVehicles: rentalVehicles,
      isSearching: rentalVehicles.length === 0 && Boolean(selectedRider.customerId),
      currentStep: 1,
      validation: clearedValidation,
    });
    if (rentalVehicles.length > 0) {
      return;
    }
    if (!selectedRider.customerId) {
      patch({
        currentStep: 1,
        validation: {
          ...clearedValidation,
          riderSearch: bookingMessage || 'No bookings found for this rider.',
        },
      });
      return;
    }
    try {
      const data = await customerService.getCustomerVehicles(selectedRider.customerId);
      const active = data.filter(
        (item) => item.rentalStatus === 'ACTIVE' || item.rentalStatus === 'PENDING'
      );
      patch({
        deploymentVehicles: active,
        currentStep: 1,
        validation: {
          ...clearedValidation,
          riderSearch: active.length
            ? ''
            : bookingMessage || 'This rider does not have an active deployment.',
        },
      });
    } catch (error) {
      setMessage(bookingMessage || toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = async (category: IssueCategoryLookupResponse) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSubcategories([]);
    setIssueLoading(true);
    setIssueMessage('');
    try {
      const groups = await lookupService.getIssueSubcategories(category.id);
      const subcategoryGroup = groups.find((group) => group.issueCategoryId === category.id);
      const availableSubcategories = subcategoryGroup?.subcategories ?? [];
      setSubcategories(availableSubcategories);
      setIssueMessage(
        availableSubcategories.length
          ? ''
          : 'There are no active options for this problem. Please choose another one.'
      );
    } catch (error) {
      setIssueMessage(toApiErrorMessage(error));
    } finally {
      setIssueLoading(false);
    }
  };

  const continueFromSubcategory = () => {
    if (!selectedCategory || !selectedSubcategory) {
      return;
    }
    setIssueGroups((groups) =>
      groups.some(
        (group) =>
          group.categoryId === selectedCategory.id && group.subcategory === selectedSubcategory
      )
        ? groups
        : [
            ...groups,
            {
              categoryId: selectedCategory.id,
              categoryName: selectedCategory.name,
              subcategory: selectedSubcategory,
            },
          ]
    );
    edit(5);
  };

  const addAnotherIssue = () => {
    setSelectedCategory(null);
    setSubcategories([]);
    setSelectedSubcategory(null);
    setIssueMessage('');
    edit(3);
  };

  const removeIssueGroup = (index: number) => {
    setIssueGroups((groups) => groups.filter((_, groupIndex) => groupIndex !== index));
  };

  const moveIssueGroup = (index: number, direction: -1 | 1) => {
    setIssueGroups((groups) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= groups.length) return groups;
      const reordered = [...groups];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const editIssueGroup = async (index: number) => {
    const issueGroup = issueGroups[index];
    const category = issueCategories.find((item) => item.id === issueGroup?.categoryId);
    if (!issueGroup || !category) {
      setIssueMessage('This problem can no longer be edited because its category is unavailable.');
      return;
    }
    setIssueGroups((groups) => groups.filter((_, groupIndex) => groupIndex !== index));
    await selectCategory(category);
    setSelectedSubcategory(issueGroup.subcategory);
    edit(4);
  };

  const updateRemarks = (value: string) => {
    if (countConversationWords(value) <= 200) {
      setRemarks(value);
    }
  };

  const submitConversation = async () => {
    const validationError = validateConversationSubmission(state);
    if (validationError) {
      setSubmissionError(validationError);
      return;
    }
    if (!rider || !vehicle || !rideability) return;
    patch({ submissionStatus: 'SUBMITTING', validation: { ...state.validation, submission: '' } });
    try {
      const registeredMobile = await registeredMobileForTicket(rider);
      const created = await ticketService.createConversationTicket({
        registeredMobile,
        mvTrackNumber: vehicle.batteryNumber,
        vehicleNumber: vehicle.vehicleNumber,
        rideabilityStatus: rideability === 'RIDEABLE' ? 'MOVABLE' : 'NOT_MOVABLE',
        issueGroups: issueGroups.map((group) => ({
          issueCategoryId: group.categoryId,
          issueSubcategory: group.subcategory,
          description: group.subcategory,
        })),
        remarks: remarks.trim() || undefined,
        photoReferences: photos.map((photo) => ({
          fileUrl: `attachment://conversation/${Date.now()}-${encodeURIComponent(photo.file.name)}`,
          fileType: photo.file.type || 'image/*',
        })),
        conversationMetadata: {
          ...state.metadata,
          riderName: rider.customerName,
          vehicleModel: vehicle.vehicleModel,
          hub: vehicle.hub,
          submittedAt: new Date().toISOString(),
        },
      });
      patch({ createdTicket: created, submissionStatus: 'SUCCEEDED' });
      onConversationCreated?.(created);
      complete();
    } catch (error) {
      patch({
        submissionStatus: 'FAILED',
        validation: { ...state.validation, submission: toApiErrorMessage(error) },
      });
    }
  };

  const createAnother = () => {
    reset();
  };

  const stepValidation = validateConversationStep(step, state);
  const nextDisabled = Boolean(stepValidation);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step > 0 && step < 9 ? 'Resume Ticket Conversation' : 'Create New Ticket'}
      size="xl"
    >
      <div className="conversation-modern space-y-5">
        <div aria-label="Conversation progress" className="flex gap-1 overflow-auto">
          {STEPS.map((label, index) => (
            <span
              key={label}
              aria-current={index === step ? 'step' : undefined}
              className={`flex h-7 min-w-7 items-center justify-center rounded-full text-xs ${index === step ? 'bg-yellow-400 text-slate-950' : index < step ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'}`}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p
          ref={stepTitleRef}
          tabIndex={-1}
          className="text-xs font-semibold uppercase tracking-[.16em] text-yellow-300"
        >
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        {step === 0 ? (
          <RiderSearch
            query={query}
            setQuery={setQuery}
            results={results}
            selected={rider}
            loading={loading}
            message={message}
            rentalUsers={rentalUsers}
            rentalMessage={rentalMessage}
            selectedRentalUserId={selectedRentalUserId}
            onFind={() => void find()}
            onSelectRentalUser={(user) => void selectRentalUser(user)}
            onSelect={(selectedRider) => void selectRider(selectedRider)}
          />
        ) : step === 1 ? (
          <VehicleStep
            rider={rider}
            vehicles={vehicles}
            selected={vehicle}
            loading={loading}
            message={message}
            onSelect={setVehicle}
            onSearchAgain={reset}
          />
        ) : step === 2 ? (
          <RideabilityStep value={rideability} onChange={setRideability} />
        ) : step === 3 ? (
          <IssueCategoryStep
            categories={issueCategories}
            selected={selectedCategory}
            loading={issueLoading}
            message={issueMessage}
            onSelect={(category) => void selectCategory(category)}
          />
        ) : step === 4 ? (
          <IssueSubcategoryStep
            category={selectedCategory}
            subcategories={subcategories}
            selected={selectedSubcategory}
            loading={issueLoading}
            message={issueMessage}
            onSelect={setSelectedSubcategory}
          />
        ) : step === 5 ? (
          <IssueGroupsStep
            issueGroups={issueGroups}
            onAddAnother={addAnotherIssue}
            onEdit={editIssueGroup}
            onRemove={removeIssueGroup}
            onMove={moveIssueGroup}
            onContinue={() => edit(6)}
          />
        ) : step === 6 ? (
          <RemarksStep value={remarks} onChange={updateRemarks} />
        ) : step === 7 ? (
          <PhotoStep
            photos={photos}
            message={state.validation.photos}
            onAddPhotos={addPhotos}
            onRemove={removePhoto}
          />
        ) : step === 8 ? (
          <ReviewStep
            rider={rider}
            vehicle={vehicle}
            rideability={rideability}
            issueGroups={issueGroups}
            remarks={remarks}
            photos={photos}
            startedAt={new Date(state.metadata.startedAt)}
            onEdit={edit}
          />
        ) : step === 9 ? (
          <SuccessStep
            ticket={createdTicket}
            onViewTicket={() => {
              if (createdTicket?.ticketId) onViewTicket?.(createdTicket.ticketId);
            }}
            onCreateAnother={createAnother}
            onClose={cancelConversation}
          />
        ) : (
          <Placeholder title={STEPS[step]} />
        )}

        <div className="flex justify-between border-t border-slate-700 pt-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Exit & Resume Later
            </Button>
            <Button variant="ghost" onClick={cancelConversation}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={step === 0}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={back}
            >
              Back
            </Button>
            {step === 8 ? (
              <Button loading={submitting} onClick={() => void submitConversation()}>
                Create Ticket
              </Button>
            ) : step < 9 && step !== 5 ? (
              <Button
                disabled={nextDisabled}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => (step === 4 ? continueFromSubcategory() : next())}
              >
                Next
              </Button>
            ) : (
              <Button onClick={onClose}>Back to Tickets</Button>
            )}
          </div>
        </div>
        {submissionError && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
            {submissionError}
          </p>
        )}
        {stepValidation && step !== 8 && (
          <p aria-live="polite" className="text-sm text-amber-300">
            {stepValidation}
          </p>
        )}
      </div>
    </Modal>
  );
}

function displayPhone(phone: string): string {
  const value = phone.trim();
  if (value.startsWith('+91') && value.length > 3) {
    return value.slice(3).trim();
  }
  if (value.startsWith('91') && value.length > 2) {
    return value.slice(2);
  }
  return value;
}

function RiderSearch({
  query,
  setQuery,
  results,
  selected,
  loading,
  message,
  rentalUsers,
  rentalMessage,
  selectedRentalUserId,
  onFind,
  onSelect,
  onSelectRentalUser,
}: {
  query: string;
  setQuery: (value: string) => void;
  results: CustomerSearchItem[];
  selected: CustomerSearchItem | null;
  loading: boolean;
  message: string;
  rentalUsers: RentalUserResult[];
  rentalMessage: string;
  selectedRentalUserId: string | null;
  onFind: () => void;
  onSelect: (rider: CustomerSearchItem) => void;
  onSelectRentalUser: (user: RentalUserResult) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Find the rider</h2>
      <Input
        label="Registered Mobile Number or Rider Name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Enter mobile number or rider name"
      />
      <Button loading={loading} leftIcon={<Search className="h-4 w-4" />} onClick={onFind}>
        Search
      </Button>
      {message && (
        <p role="alert" className="text-sm text-amber-300">
          {message}
        </p>
      )}
      <div className="space-y-2">
        {results.map((item) => (
          <button
            type="button"
            key={item.customerId}
            aria-pressed={selected?.customerId === item.customerId}
            onClick={() => onSelect(item)}
            className={`w-full rounded-xl border p-3 text-left ${selected?.customerId === item.customerId ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900'}`}
          >
            <p className="font-semibold text-slate-100">{item.customerName}</p>
            <p className="text-sm text-slate-300">
              {item.mobileNumber} · {item.hub ?? 'No hub'}
            </p>
          </button>
        ))}
      </div>
      {(rentalUsers.length > 0 || rentalMessage) && (
        <div className="space-y-2 border-t border-slate-700 pt-4">
          <p className="text-sm font-medium text-slate-200">Rental users</p>
          {rentalMessage && (
            <p role="status" className="text-sm text-amber-300">
              {rentalMessage}
            </p>
          )}
          {rentalUsers.map((user) => (
            <button
              type="button"
              key={user.id}
              aria-pressed={selectedRentalUserId === user.id}
              onClick={() => onSelectRentalUser(user)}
              className={`w-full rounded-xl border p-3 text-left ${selectedRentalUserId === user.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900'}`}
            >
              <p className="font-semibold text-slate-100">{user.name || 'Unnamed user'}</p>
              <p className="text-sm text-slate-300">
                {displayPhone(user.phone) || 'No phone number'}
              </p>
              {user.email && <p className="text-sm text-slate-400">{user.email}</p>}
              {user.role && <p className="text-sm text-slate-400">{user.role}</p>}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }
  return (
    <p className="grid grid-cols-[8.75rem_1fr] text-sm text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span>: {value}</span>
    </p>
  );
}

function VehicleStep({
  rider,
  vehicles,
  selected,
  loading,
  message,
  onSelect,
  onSearchAgain,
}: {
  rider: CustomerSearchItem | null;
  vehicles: CustomerVehicleResponse[];
  selected: CustomerVehicleResponse | null;
  loading: boolean;
  message: string;
  onSelect: (vehicle: CustomerVehicleResponse) => void;
  onSearchAgain: () => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Is this your vehicle?</h2>
      <p className="text-sm text-slate-300">{rider?.customerName}</p>
      {message && (
        <p role="alert" className="text-sm text-amber-300">
          {message}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-400">Loading vehicles…</p>
      ) : (
        vehicles.map((item) => (
          <button
            type="button"
            key={item.vehicleNumber}
            aria-pressed={selected?.vehicleNumber === item.vehicleNumber}
            onClick={() => onSelect(item)}
            className={`w-full rounded-xl border p-3 text-left ${selected?.vehicleNumber === item.vehicleNumber ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900'}`}
          >
            {item.bookingId || item.planName || item.vehicleName ? (
              <>
                <Detail label="Vehicle name" value={item.vehicleName} />
                <Detail label="Model" value={item.vehicleModel} />
                <Detail label="Vehicle number" value={item.batteryNumber} />
                <Detail label="Plan name" value={item.planName} />
                <Detail label="Booking id" value={item.bookingId} />
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-100">
                  MV Track Number: {item.batteryNumber}
                </p>
                <p className="text-sm text-slate-300">
                  {item.vehicleModel} · {item.hub}
                </p>
              </>
            )}
          </button>
        ))
      )}
      <Button variant="outline" onClick={onSearchAgain}>
        Search Again
      </Button>
    </Card>
  );
}

function RideabilityStep({
  value,
  onChange,
}: {
  value: RideabilityStatus | null;
  onChange: (value: RideabilityStatus) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Can you ride the vehicle?</h2>
      <p className="text-sm text-slate-300">
        Please choose the option that best describes the vehicle right now.
      </p>
      <div role="group" aria-label="Rideability" className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={value === 'RIDEABLE'}
          onClick={() => onChange('RIDEABLE')}
          className={`rounded-xl border p-4 text-left transition-colors ${value === 'RIDEABLE' ? 'border-green-400 bg-green-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
        >
          <p className="font-semibold text-slate-100">Yes, I can ride it.</p>
          <p className="mt-1 text-sm text-slate-300">The vehicle is still rideable.</p>
        </button>
        <button
          type="button"
          aria-pressed={value === 'NOT_RIDEABLE'}
          onClick={() => onChange('NOT_RIDEABLE')}
          className={`rounded-xl border p-4 text-left transition-colors ${value === 'NOT_RIDEABLE' ? 'border-red-400 bg-red-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
        >
          <p className="font-semibold text-slate-100">No, it is stopped.</p>
          <p className="mt-1 text-sm text-slate-300">The vehicle cannot be ridden.</p>
        </button>
      </div>
      {value === 'NOT_RIDEABLE' && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          We will share this with the service team as part of your request.
        </p>
      )}
    </Card>
  );
}

function IssueCategoryStep({
  categories,
  selected,
  loading,
  message,
  onSelect,
}: {
  categories: IssueCategoryLookupResponse[];
  selected: IssueCategoryLookupResponse | null;
  loading: boolean;
  message: string;
  onSelect: (category: IssueCategoryLookupResponse) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">What is the problem?</h2>
      <p className="text-sm text-slate-300">
        Choose the problem that best matches what you are experiencing.
      </p>
      {loading ? (
        <p className="text-sm text-slate-400">Loading available problems…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => onSelect(category)}
              className={`rounded-xl border p-4 text-left transition-colors ${selected?.id === category.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
            >
              <p className="font-semibold text-slate-100">{category.name}</p>
            </button>
          ))}
        </div>
      )}
      {message && <p className="text-sm text-amber-300">{message}</p>}
    </Card>
  );
}

function IssueSubcategoryStep({
  category,
  subcategories,
  selected,
  loading,
  message,
  onSelect,
}: {
  category: IssueCategoryLookupResponse | null;
  subcategories: string[];
  selected: string | null;
  loading: boolean;
  message: string;
  onSelect: (subcategory: string) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Tell us more about the problem</h2>
      <p className="text-sm text-slate-300">
        {category
          ? `Choose the option that best describes the ${category.name.toLowerCase()} problem.`
          : 'Choose an option.'}
      </p>
      {loading ? (
        <p className="text-sm text-slate-400">Loading available options…</p>
      ) : (
        <div className="space-y-2">
          {subcategories.map((subcategory) => (
            <button
              type="button"
              key={subcategory}
              onClick={() => onSelect(subcategory)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${selected === subcategory ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
            >
              <p className="font-medium text-slate-100">{subcategory}</p>
            </button>
          ))}
        </div>
      )}
      {message && <p className="text-sm text-amber-300">{message}</p>}
    </Card>
  );
}

function IssueGroupsStep({
  issueGroups,
  onAddAnother,
  onEdit,
  onRemove,
  onMove,
  onContinue,
}: {
  issueGroups: ConversationIssueGroup[];
  onAddAnother: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onContinue: () => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Is there another issue?</h2>
      <p className="text-sm text-slate-300">
        You can include more than one problem in this service request.
      </p>
      <div className="space-y-2">
        {issueGroups.map((group, index) => (
          <div
            key={`${group.categoryId}-${group.subcategory}`}
            className="rounded-xl border border-slate-700 bg-slate-900 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-100">{group.categoryName}</p>
                <p className="text-sm text-slate-300">{group.subcategory}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  aria-label={`Move ${group.categoryName} up`}
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onMove(index, -1)}
                >
                  Up
                </Button>
                <Button
                  aria-label={`Move ${group.categoryName} down`}
                  variant="ghost"
                  size="sm"
                  disabled={index === issueGroups.length - 1}
                  onClick={() => onMove(index, 1)}
                >
                  Down
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(index)}>
                  Edit
                </Button>
                <Button
                  aria-label={`Remove ${group.categoryName}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onAddAnother}>
          Add Another
        </Button>
        <Button disabled={issueGroups.length === 0} onClick={onContinue}>
          No, Continue
        </Button>
      </div>
    </Card>
  );
}

function RemarksStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Anything else you want to tell us?</h2>
      <p className="text-sm text-slate-300">
        This is optional. Details can help our service team understand the problem faster.
      </p>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tell us anything else that might help our service team."
        rows={6}
      />
      <p className="text-right text-xs text-slate-400">
        {countConversationWords(value)} / 200 words
      </p>
    </Card>
  );
}

function PhotoStep({
  photos,
  message,
  onAddPhotos,
  onRemove,
}: {
  photos: ConversationPhoto[];
  message: string;
  onAddPhotos: (files: FileList | null) => void;
  onRemove: (photoId: string) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-50">Would you like to upload a photo?</h2>
      <p className="text-sm text-slate-300">
        A photo can help our service team understand the problem faster. JPG, PNG, and WebP photos
        up to 5 MB are supported.
      </p>
      <label className="inline-flex cursor-pointer items-center rounded-lg border border-yellow-400/70 px-4 py-2 text-sm font-medium text-yellow-200 transition-colors hover:bg-yellow-400/10">
        <span>Upload Photo</span>
        <input
          aria-label="Upload service-request photos"
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            onAddPhotos(event.target.files);
            event.currentTarget.value = '';
          }}
        />
      </label>
      {message && (
        <p role="alert" className="text-sm text-amber-300">
          {message}
        </p>
      )}
      {photos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
            >
              <img
                src={photo.previewUrl}
                alt={`Selected photo: ${photo.file.name}`}
                className="h-32 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">{photo.file.name}</p>
                  <p className="text-xs text-green-300">Ready to attach</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(photo.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-slate-400">You can also skip this step.</p>
    </Card>
  );
}

function ReviewStep({
  rider,
  vehicle,
  rideability,
  issueGroups,
  remarks,
  photos,
  startedAt,
  onEdit,
}: {
  rider: CustomerSearchItem | null;
  vehicle: CustomerVehicleResponse | null;
  rideability: RideabilityStatus | null;
  issueGroups: ConversationIssueGroup[];
  remarks: string;
  photos: ConversationPhoto[];
  startedAt: Date;
  onEdit: (step: number) => void;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Please check your details</h2>
        <p className="mt-1 text-sm text-slate-300">
          Review the information before creating your service request.
        </p>
      </div>
      <ReviewSection title="Your information" onEdit={() => onEdit(0)}>
        <ReviewRow label="Mobile Number" value={rider?.mobileNumber} />
        <ReviewRow label="MV Track Number" value={vehicle?.batteryNumber} />
        <ReviewRow label="Vehicle Model" value={vehicle?.vehicleModel} />
        <ReviewRow
          label="Can you ride the vehicle?"
          value={
            rideability === 'RIDEABLE'
              ? 'Yes, I can ride it.'
              : rideability === 'NOT_RIDEABLE'
                ? 'No, it is stopped.'
                : undefined
          }
        />
      </ReviewSection>
      <ReviewSection title="Problems reported" onEdit={() => onEdit(3)}>
        {issueGroups.map((group) => (
          <ReviewRow
            key={`${group.categoryId}-${group.subcategory}`}
            label={group.categoryName}
            value={group.subcategory}
          />
        ))}
      </ReviewSection>
      <ReviewSection title="Additional details" onEdit={() => onEdit(6)}>
        <ReviewRow label="Remarks" value={remarks || 'None'} />
        <ReviewRow
          label="Uploaded Photos"
          value={
            photos.length
              ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected`
              : 'None'
          }
        />
      </ReviewSection>
      <ReviewSection title="System information">
        <ReviewRow label="Rider Name" value={rider?.customerName} />
        <ReviewRow label="Hub" value={vehicle?.hub ?? rider?.hub} />
        <ReviewRow label="Ticket Source" value="Conversation" />
        <ReviewRow label="Date & Time" value={startedAt.toLocaleString()} />
      </ReviewSection>
    </Card>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-100">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-200">{value || 'Not available'}</span>
    </div>
  );
}

function SuccessStep({
  ticket,
  onViewTicket,
  onCreateAnother,
  onClose,
}: {
  ticket: CreateTicketResponse | null;
  onViewTicket: () => void;
  onCreateAnother: () => void;
  onClose: () => void;
}) {
  const isExistingTicket = ticket?.existingTicket;
  return (
    <Card className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-400/15 text-2xl text-green-300">
        ✓
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-50">
          {isExistingTicket
            ? 'An active service request already exists.'
            : 'Your service request has been submitted successfully.'}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {isExistingTicket
            ? 'We did not create a duplicate request. You can view the existing ticket for updates.'
            : "Our service team will review your request shortly. You'll receive updates on WhatsApp."}
        </p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
          Ticket Number
        </p>
        <p className="mt-1 text-lg font-semibold text-yellow-300">
          {ticket?.ticketNumber ?? 'Not available'}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Current Status: {ticket?.currentStatus ?? 'Open'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ticket?.ticketId && (
          <Button variant="outline" onClick={onViewTicket}>
            View Ticket
          </Button>
        )}
        <Button variant="outline" onClick={onCreateAnother}>
          Create Another Ticket
        </Button>
        <Button onClick={onClose}>Back to Tickets</Button>
      </div>
    </Card>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <Card className="min-h-56">
      <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">
        This step will be implemented in the next milestone.
      </p>
    </Card>
  );
}
