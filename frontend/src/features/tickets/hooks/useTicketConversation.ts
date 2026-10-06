import { useCallback, useEffect, useReducer, useRef } from 'react';
import type {
  ConversationPhoto,
  TicketConversationState,
} from '@/features/tickets/types/conversation.types';
import {
  maxConversationPhotoBytes,
  supportedConversationPhotoTypes,
  toWorkflowProjection,
} from '@/features/tickets/utils/conversation.validation';
import {
  cancelWorkflow,
  editWorkflow,
  nextWorkflow,
  previousWorkflow,
  submitWorkflow,
} from '@mspl/conversation-workflow';

const createInitialState = (): TicketConversationState => ({
  currentStep: 0,
  query: '',
  searchResults: [],
  selectedRider: null,
  deploymentVehicles: [],
  selectedVehicle: null,
  rideability: null,
  issueCategories: [],
  selectedCategory: null,
  subcategories: [],
  selectedSubcategory: null,
  issueGroups: [],
  remarks: '',
  photos: [],
  metadata: { channel: 'WEB', startedAt: new Date().toISOString() },
  validation: { riderSearch: '', issueCollection: '', photos: '', submission: '' },
  isSearching: false,
  isIssueLoading: false,
  submissionStatus: 'IDLE',
  createdTicket: null,
});

type Action =
  | { type: 'PATCH'; patch: Partial<TicketConversationState> }
  | { type: 'SET_ISSUE_COLLECTION_VALIDATION'; message: string }
  | { type: 'SET_PHOTO_VALIDATION'; message: string }
  | { type: 'RESET' };

function reducer(state: TicketConversationState, action: Action): TicketConversationState {
  if (action.type === 'RESET') {
    return createInitialState();
  }
  if (action.type === 'SET_ISSUE_COLLECTION_VALIDATION') {
    return {
      ...state,
      validation: { ...state.validation, issueCollection: action.message },
    };
  }
  if (action.type === 'SET_PHOTO_VALIDATION') {
    return {
      ...state,
      validation: { ...state.validation, photos: action.message },
    };
  }
  return { ...state, ...action.patch };
}

export function useTicketConversation() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const photosRef = useRef<ConversationPhoto[]>(state.photos);

  const patch = useCallback((next: Partial<TicketConversationState>) => {
    dispatch({ type: 'PATCH', patch: next });
  }, []);

  const reset = useCallback(() => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    cancelWorkflow();
    dispatch({ type: 'RESET' });
  }, []);
  const setIssueCollectionMessage = useCallback(
    (message: string) => dispatch({ type: 'SET_ISSUE_COLLECTION_VALIDATION', message }),
    []
  );
  const setPhotoMessage = useCallback(
    (message: string) => dispatch({ type: 'SET_PHOTO_VALIDATION', message }),
    []
  );

  const addPhotos = useCallback((files: FileList | null) => {
    if (!files) return;
    const selectedFiles = Array.from(files);
    const validFiles = selectedFiles.filter(
      (file) =>
        supportedConversationPhotoTypes.includes(file.type) &&
        file.size <= maxConversationPhotoBytes
    );
    const rejectedCount = selectedFiles.length - validFiles.length;
    const nextPhotos = validFiles.map((file) => ({
      id:
        typeof crypto?.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${file.name}-${file.lastModified}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    dispatch({ type: 'PATCH', patch: { photos: [...photosRef.current, ...nextPhotos] } });
    dispatch({
      type: 'SET_PHOTO_VALIDATION',
      message: rejectedCount ? 'Only JPG, PNG, and WebP photos up to 5 MB can be added.' : '',
    });
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    const photo = photosRef.current.find((item) => item.id === photoId);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    dispatch({
      type: 'PATCH',
      patch: { photos: photosRef.current.filter((item) => item.id !== photoId) },
    });
  }, []);

  const next = useCallback(() => {
    const transition = nextWorkflow(toWorkflowProjection(state));
    dispatch({ type: 'PATCH', patch: { currentStep: transition.step } });
    return transition.validation;
  }, [state]);

  const back = useCallback(() => {
    const transition = previousWorkflow(toWorkflowProjection(state));
    dispatch({ type: 'PATCH', patch: { currentStep: transition.step } });
  }, [state]);

  const edit = useCallback(
    (step: number) => {
      const transition = editWorkflow(toWorkflowProjection(state), step);
      dispatch({ type: 'PATCH', patch: { currentStep: transition.step } });
      return transition.validation;
    },
    [state]
  );

  const complete = useCallback(() => {
    const transition = submitWorkflow(toWorkflowProjection(state));
    dispatch({ type: 'PATCH', patch: { currentStep: transition.step } });
    return transition.validation;
  }, [state]);

  useEffect(() => {
    photosRef.current = state.photos;
  }, [state.photos]);

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    []
  );

  return {
    state,
    patch,
    reset,
    setIssueCollectionMessage,
    setPhotoMessage,
    addPhotos,
    removePhoto,
    next,
    back,
    edit,
    complete,
  };
}
