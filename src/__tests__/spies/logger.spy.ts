import sinon, { SinonSpy } from 'sinon';
import { Log } from '../../logger/logger-manager';

export type LoggerSpies = {
  spyLogInfo: SinonSpy;
  spyLogWarn: SinonSpy;
  spyLogError: SinonSpy;
  spyLogHandlerResults: SinonSpy;
  resetLogSpies: () => void;
  restoreLogSpies: () => void;
};

/**
 * Initializes logger spies using Sinon.
 * @returns An object containing Sinon spies and utility functions.
 */
export const initializeLoggerSpies = (): LoggerSpies => {
  const spyLogInfo = sinon.spy(Log, 'info');
  const spyLogWarn = sinon.spy(Log, 'warn');
  const spyLogError = sinon.spy(Log, 'error');
  const spyLogHandlerResults = sinon.spy(Log, 'handlerResult');

  return {
    spyLogInfo,
    spyLogWarn,
    spyLogError,
    spyLogHandlerResults,
    resetLogSpies: () => {
      spyLogInfo.resetHistory();
      spyLogWarn.resetHistory();
      spyLogError.resetHistory();
      spyLogHandlerResults.resetHistory();
    },
    restoreLogSpies: () => {
      spyLogInfo.restore();
      spyLogWarn.restore();
      spyLogError.restore();
      spyLogHandlerResults.restore();
    },
  };
};

export type LogSpyType = ReturnType<typeof initializeLoggerSpies>;
