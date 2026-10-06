export enum ConversationCommand {
  START = "START",
  RESET = "RESET",
  NEW = "NEW",
}

export type ConversationCommandType = `${ConversationCommand}`;

export function isValidConversationCommand(value: unknown): value is ConversationCommand {
  if (typeof value !== "string") {
    return false;
  }
  return Object.values(ConversationCommand).includes(value as ConversationCommand);
}

export function getConversationCommand(value: string): ConversationCommand | null {
  const normalized = value.trim().toUpperCase();
  return isValidConversationCommand(normalized) ? (normalized as ConversationCommand) : null;
}
