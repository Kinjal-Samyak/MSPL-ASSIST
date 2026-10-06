export const logger = {
  info: (message: string | Record<string, unknown>): void => {
    if (typeof message === "string") {
      console.info(message);
    } else {
      console.info(JSON.stringify(message));
    }
  },
  error: (message: string | Record<string, unknown>): void => {
    if (typeof message === "string") {
      console.error(message);
    } else {
      console.error(JSON.stringify(message));
    }
  },
};
