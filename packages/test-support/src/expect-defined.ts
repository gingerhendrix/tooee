export const expectDefined = <T>(
  value: T | null | undefined,
  message = "Expected a defined value",
): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};
