# Testing

## Stack

`jest-expo` (preset) + `jest` + `@testing-library/react-native` + `react-test-renderer`. No E2E
framework (Detox/Maestro/etc.) is introduced — none existed before this phase, and the brief
explicitly scoped this to unit/integration-level testing.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Config lives in `package.json`'s `"jest"` key: `preset: "jest-expo"`, `moduleNameMapper` for the
`@/*` alias (mirrors `tsconfig.json`/`babel.config.js`), coverage collected from `src/**/*.{ts,tsx}`
excluding `.d.ts` and barrel `index.ts` files.

## RNTL v14 is async — this matters for every test you write

`@testing-library/react-native` 14.x made `render()`, `renderHook()`, `act()`, and the `unmount()`
it returns all **async** (built on React's concurrent test renderer). Every call site must
`await` them:

```ts
const { getByRole } = await renderWithProviders(<Button label="Submit" onPress={onPress} />);
const { result, unmount } = await renderHook(() => useConnectivity());
await act(() => { ... });
await unmount();
```

Forgetting `await` does not always throw — it can silently return `{}` or leave assertions racing
against an unresolved promise. If a test's queries ("getByRole is not a function") or assertions
look wrong for no apparent reason, check for a missing `await` first.

## Structure — colocated `__tests__`, one per architectural layer

Tests live next to the code they test, in a `__tests__/` folder, not in a parallel top-level tree.
This keeps a test discoverable the moment you're editing the file it covers.

| Layer | Example | What it verifies |
|---|---|---|
| Repository | `src/repositories/dashboard/__tests__/MockDashboardRepository.test.ts` | Contract shape, known fixture-mutation trait |
| Facade (unit) | `src/facades/jobWorkspace/__tests__/JobWorkspaceFacade.test.ts` | Orchestration logic against hand-rolled fakes — which repo gets called, cache invalidation on success/failure |
| Facade (integration) | `src/facades/jobWorkspace/__tests__/JobWorkspaceFacade.integration.test.ts` | The same facade against the *real* Mock repositories, the actual wiring the app uses |
| Manager | `src/platform/__tests__/NotificationManagerImpl.test.ts` | Derived values (unread count) aren't trusted from a stored counter; delegation is correct |
| Hook | `src/hooks/__tests__/useConnectivity.test.ts` | Initial state, live subscription updates, unsubscribe-on-unmount, via `jest.mock()` of the facade module |
| Component | `src/components/buttons/__tests__/Button.test.tsx` | Rendering, interaction, disabled/loading states, and — deliberately — an accessibility regression test that documents a known gap (see below) |

## Fakes over mocking frameworks, wherever constructor injection allows it

Every facade/manager accepts its dependencies via constructor parameters with real singleton
defaults (see [REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md)), so most tests pass a small
object literal satisfying the interface rather than `jest.mock()`-ing a module. Reserve
`jest.mock()` for hooks, which import a facade singleton directly rather than receiving it as a
parameter (see `useConnectivity.test.ts` for the pattern — mock variable names must be prefixed
`mock` or Jest's module-factory scoping check rejects the file).

## A test can be a finding, not just a check

`Button.test.tsx` includes a test named `ACCESSIBILITY GAP: loses its accessible name while
loading` — while `loading`, `Button` renders only an `ActivityIndicator` with no
`accessibilityLabel`, so the label text (and with it, the button's accessible name) disappears
exactly when a screen-reader user most needs to know what's happening. The test asserts this
*current* behaviour rather than the desired one, so it will fail loudly (forcing a conscious
decision) the moment someone fixes it, rather than silently going stale. See the Accessibility
Review for the recommended fix.
