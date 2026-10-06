import type { IssueCategory } from "../engine-context";

/**
 * Menu builder helper functions for formatting conversation responses.
 *
 * Extracted here to:
 * - Reduce handler size
 * - Enable reuse across multiple handlers
 * - Simplify localization in future
 * - Improve readability and maintainability
 */

/**
 * Build a numbered menu from issue categories.
 *
 * Example output:
 * 1️⃣ Battery
 * 2️⃣ Charging Issue
 * ...
 * N️⃣ Last Category
 *
 * @param categories - Array of issue categories
 * @returns Formatted menu string
 */
export function buildIssueCategoryMenu(categories: IssueCategory[]): string {
  return categories
    .map((category, index) => `${index + 1}️⃣ ${category.name}`)
    .join("\n");
}

/**
 * Build the main menu display.
 *
 * @returns Formatted main menu string
 */
export function buildMainMenu(): string {
  return `Welcome to MSPL Assist 👋\n\nPlease choose an option:\n\n1️⃣ Register Service Issue\n\n2️⃣ Track Existing Ticket`;
}

/**
 * Build the "add more issues" confirmation menu.
 *
 * @returns Formatted add more issues menu
 */
export function buildAddMoreIssuesMenu(): string {
  return `1️⃣ Yes\n\n2️⃣ No`;
}

/**
 * Build the "upload photo" menu after all descriptions are collected.
 *
 * @returns Formatted photo upload menu
 */
export function buildPhotoMenu(): string {
  return `1️⃣ Yes\n\n2️⃣ Skip`;
}

/**
 * Build the "upload photo for specific issue" menu.
 *
 * @param issueName - Name of the issue
 * @returns Formatted menu asking to upload photo for specific issue
 */
export function buildPhotoMenuForIssue(issueName: string): string {
  return `Would you like to upload photos for ${issueName}?\n\n1️⃣ Yes\n\n2️⃣ Skip`;
}

/**
 * Build the prompt for uploading photos.
 *
 * @returns Message asking for photo upload with DONE instruction
 */
export function buildPhotoUploadPrompt(): string {
  return `Please upload one or more photos of the issue.\n\nWhen finished, type:\n\nDONE`;
}

/**
 * Get the emoji for a menu number (1-9, then fallback to regular number).
 *
 * @param index - Zero-based index
 * @returns Emoji number string
 */
export function getEmojiNumber(index: number): string {
  const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  return emojiNumbers[index] ?? `${index + 1}`;
}
