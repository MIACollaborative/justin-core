import { CapturedEmit } from "../testkit/logger.sandbox";

export function expectLog(
  log: CapturedEmit | undefined,
  opts: {
    severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
    messageSubstr?: string;
  } = {},
): void {
  expect(log).toBeDefined();

  if (!log) return;

  if (opts.severity) {
    expect(log.entry.severity).toBe(opts.severity);
  }

  if (opts.messageSubstr) {
    expect(String(log.entry.message)).toContain(opts.messageSubstr);
  }
}
