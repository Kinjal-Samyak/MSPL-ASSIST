export type AnalyticsProperties = Record<string, unknown>;

/**
 * Product-analytics abstraction. Deliberately provider-agnostic: no event taxonomy, no batching
 * policy, no PII rules baked in here - those are decisions for whichever real provider (Mixpanel,
 * Amplitude, etc.) is chosen at integration time. Nothing in the app should import a provider SDK
 * directly; everything goes through this interface.
 */
export interface AnalyticsService {
  trackEvent(name: string, properties?: AnalyticsProperties): void;
  identify(userId: string, traits?: AnalyticsProperties): void;
  /** Call on logout - clears any provider-side user association. */
  reset(): void;
}
