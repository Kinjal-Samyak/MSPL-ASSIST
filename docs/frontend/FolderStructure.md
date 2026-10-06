# Frontend Folder Structure

```text
src/
  api/
  components/
  config/
  constants/
  features/
    <feature>/
      api/
      components/
      hooks/
      pages/
      types/
  hooks/
  layouts/
    AppLayout/
    AuthLayout/
  pages/
  routes/
  services/
  store/
  styles/
  themes/
  types/
  utils/
```

## Strategy
- Put feature-specific screens and future feature UI under `features/`.
- Keep truly shared UI and infrastructure in top-level shared folders.
- Avoid cross-feature imports except through shared abstractions.
