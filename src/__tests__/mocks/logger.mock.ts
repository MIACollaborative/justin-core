import sinon from 'sinon';
import { Log } from '../../logger/logger-manager';

export const initializeLoggerMocks = () => {
  const loggerMocks = {
    mockLogInfo: sinon.stub(Log, 'info'),
    mockLogWarn: sinon.stub(Log, 'warn'),
    mockLogError: sinon.stub(Log, 'error'),
    mockLogHandlerResults: sinon.stub(Log, 'handlerResult'),
    resetLoggerMocks: () => {
      loggerMocks.mockLogInfo.resetHistory();
      loggerMocks.mockLogWarn.resetHistory();
      loggerMocks.mockLogError.resetHistory();
      loggerMocks.mockLogHandlerResults.resetHistory();
    },
    restoreLoggerMocks: () => {
      loggerMocks.mockLogInfo.restore();
      loggerMocks.mockLogWarn.restore();
      loggerMocks.mockLogError.restore();
      loggerMocks.mockLogHandlerResults.restore();
    },
  };

  return loggerMocks;
};

export type LoggerMocksType = ReturnType<typeof initializeLoggerMocks>;
