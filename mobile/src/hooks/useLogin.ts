import { useMemo, useState } from 'react';
import { ApiError, normalizeError } from '@/api';
import { validateMobileNumber, validatePassword } from '@/utils';
import { useAuth } from './useAuth';

interface UseLoginResult {
  mobileNumber: string;
  password: string;
  setMobileNumber: (value: string) => void;
  setPassword: (value: string) => void;
  mobileNumberError: string | null;
  passwordError: string | null;
  formError: string | null;
  isSubmitting: boolean;
  isValid: boolean;
  submit: () => Promise<void>;
}

/**
 * Owns the Login screen's form state and submission flow so the screen component itself stays
 * purely presentational. Talks to authentication only through `useAuth().login()` - it has no
 * knowledge of `AuthRepository`, let alone which concrete implementation is active.
 */
export function useLogin(): UseLoginResult {
  const { login, isLoggingIn } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mobileNumberValidation = validateMobileNumber(mobileNumber);
  const passwordValidation = validatePassword(password);
  const isValid = mobileNumberValidation === null && passwordValidation === null;

  const submit = async () => {
    setHasAttemptedSubmit(true);
    setFormError(null);

    if (!isValid || isLoggingIn) {
      return;
    }

    try {
      await login({ mobileNumber, password });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : normalizeError(error);
      setFormError(apiError.message);
    }
  };

  return useMemo(
    () => ({
      mobileNumber,
      password,
      setMobileNumber,
      setPassword,
      mobileNumberError: hasAttemptedSubmit ? mobileNumberValidation : null,
      passwordError: hasAttemptedSubmit ? passwordValidation : null,
      formError,
      isSubmitting: isLoggingIn,
      isValid,
      submit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mobileNumber, password, hasAttemptedSubmit, formError, isLoggingIn, isValid]
  );
}
