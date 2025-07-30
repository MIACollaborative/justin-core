import sinon from 'sinon';
import { Log } from '../../logger/logger-manager';

export const initializeLoggerMocks = () => {
  const loggerMocks = {
    mockLogInfo: sinon.stub(Log, 'info'),
    mockLogWarn: sinon.stub(Log, 'warn'),
    mockLogError: sinon.stub(Log, 'error'),
    resetLoggerMocks: () => {
      loggerMocks.mockLogInfo.resetHistory();
      loggerMocks.mockLogWarn.resetHistory();
      loggerMocks.mockLogError.resetHistory();
    },
    restoreLoggerMocks: () => {
      loggerMocks.mockLogInfo.restore();
      loggerMocks.mockLogWarn.restore();
      loggerMocks.mockLogError.restore();
    },
  };

  return loggerMocks;
};

export type LoggerMocksType = ReturnType<typeof initializeLoggerMocks>;
