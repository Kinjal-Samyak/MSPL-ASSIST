export function TrainingWorkspaceBanner() {
  return (
    <div
      role="status"
      aria-label="Training environment"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <p className="text-sm font-semibold leading-5">⚠ TRAINING ENVIRONMENT</p>
      <ul className="mt-1 space-y-0.5 text-[13px] leading-5">
        <li>Practice safely — no WhatsApp notifications</li>
        <li>No production data — changes remain in the training database</li>
      </ul>
    </div>
  );
}
