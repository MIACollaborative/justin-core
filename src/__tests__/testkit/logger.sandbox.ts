import sinon from 'sinon';
// eslint-disable-next-line no-duplicate-imports
import type { SinonSandbox, SinonSpy } from 'sinon';
import type { LoggerEntry } from '../../logger/types';
import * as GlobalLogger from '../../logger/global';

export type CapturedEmit = {
  entry: LoggerEntry<string>;
  ctx: Record<string, unknown>;
};

export interface LoggerSandboxOptions {
  minLevel?: string;
  ctx?: Record<string, unknown>;
}

export type LoggerSandbox = {
  sb: SinonSandbox;
  captured: CapturedEmit[];
  emitSpy: SinonSpy;
  restore(): void;
  last(): CapturedEmit | undefined;
  findByMessage(substr: string): CapturedEmit[];
};

/**
 * Creates a sinon-backed logger sandbox that captures all emitted log entries.
 *
 * Notes:
 * - This file intentionally contains **no Jest expectations**.
 * - Tests can assert however they want (Jest, chai, etc.).
 */
export function makeLoggerSandbox(options: LoggerSandboxOptions = {}): LoggerSandbox {
  const sb = sinon.createSandbox();
  const captured: CapturedEmit[] = [];

  const baseCtx: Record<string, unknown> = {
    testSuite: 'unit',
    ...(options.ctx ?? {}),
  };

  const emitSpy = sb.spy((entry: LoggerEntry<string>, ctx: Record<string, unknown>) => {
    captured.push({ entry, ctx });
  });

  const minLevel: string = options.minLevel ?? 'DEBUG';

  sb.stub(GlobalLogger, 'getGlobalEmitFn').returns(emitSpy as any);
  sb.stub(GlobalLogger, 'defaultEmit').callsFake(emitSpy as any);
  sb.stub(GlobalLogger, 'getGlobalLogContext').returns(baseCtx);
  sb.stub(GlobalLogger, 'getGlobalMinLogLevel').returns(minLevel as any);
  sb.stub(GlobalLogger, 'getGlobalSeverityRanking').returns(undefined as any);
  sb.stub(GlobalLogger, 'getGlobalLogCallback').returns(undefined as any);

  return {
    sb,
    captured,
    emitSpy,
    restore() {
      sb.restore();
    },
    last() {
      return captured[captured.length - 1];
    },
    findByMessage(substr: string) {
      return captured.filter((c) => String(c.entry.message).includes(substr));
    },
  };
}
