import { ObjectId } from 'mongodb';
import { toObjectId } from '../mongo.helpers';
import { initializeLoggerMocks, LoggerMocksType } from '../../../__tests__/mocks/logger.mock';

let loggerMock: LoggerMocksType;

beforeEach(() => {
  loggerMock = initializeLoggerMocks();
});

afterEach(() => {
  loggerMock.restoreLoggerMocks();
});

describe('toObjectId', () => {
  it('should convert a valid string to ObjectId', () => {
    const validId = '64febb404de6e5bd745c4c63';
    const result = toObjectId(validId);

    expect(result).toBeInstanceOf(ObjectId);
    expect(result?.toString()).toBe(validId);
    expect(loggerMock.mockLogError.callCount).toBe(0); // No error logs expected
  });

  it('should return null for an invalid ObjectId string and log an error', () => {
    const invalidId = 'invalid-object-id';
    const result = toObjectId(invalidId);

    expect(result).toBeNull();
    expect(
      loggerMock.mockLogError.calledWithMatch(
        `Invalid ObjectId format: ${invalidId}`
      )
    ).toBe(true);
  });

  it('should return null for an empty string and log an error', () => {
    const emptyId = '';
    const result = toObjectId(emptyId);

    expect(result).toBeNull();
    expect(
      loggerMock.mockLogError.calledWithMatch(`Invalid ObjectId format: ${emptyId}`)
    ).toBe(true);
  });

  it('should return null for a null or undefined input and log an error', () => {
    const nullId = null as unknown as string;
    const undefinedId = undefined as unknown as string;

    const nullResult = toObjectId(nullId);
    const undefinedResult = toObjectId(undefinedId);

    expect(nullResult).toBeNull();
    expect(undefinedResult).toBeNull();

    expect(
      loggerMock.mockLogError.calledWithMatch('Invalid ObjectId format: null')
    ).toBe(true);

    expect(
      loggerMock.mockLogError.calledWithMatch('Invalid ObjectId format: undefined')
    ).toBe(true);
  });
});
