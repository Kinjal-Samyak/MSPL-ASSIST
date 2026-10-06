import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its label and exposes the button accessibility role', async () => {
    const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={() => {}} />);

    expect(getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={onPress} />);

    fireEvent.press(getByRole('button', { name: 'Submit' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={onPress} disabled />);

    fireEvent.press(getByRole('button', { name: 'Submit' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress while loading (loading implies disabled)', async () => {
    const onPress = jest.fn();
    // No `name` filter here: while loading, the label Text is replaced by a bare ActivityIndicator
    // with no accessibilityLabel, so the button has no accessible name at all - see the next test.
    const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={onPress} loading />);

    fireEvent.press(getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('ACCESSIBILITY GAP: loses its accessible name while loading, since only the label Text carries it', async () => {
    const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={() => {}} loading />);

    const button = getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
    // Documents current behaviour, not desired behaviour: a screen reader announces this button as
    // unlabeled while it is busy - exactly when the user most needs to know what is loading. See
    // the Accessibility Review recommendations for the fix (an explicit accessibilityLabel prop).
    expect(button.props.accessibilityLabel).toBeUndefined();
  });
});
