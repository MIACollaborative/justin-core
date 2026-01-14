import { handleDbError } from '../data-manager.helpers';
import { loggerSpies } from '../../__tests__/testkit';
import { expectLog } from '../../__tests__/helpers';

describe('DataManager Helpers', () => {
  describe('handleDbError (unit)', () => {
    let logs: ReturnType<typeof loggerSpies>;

    beforeEach(() => {
      logs = loggerSpies();
    });

    afterEach(() => {
      logs.restore();
    });

    it('logs and rethrows the same Error instance', () => {
      const original = new Error('boom');

      expect(() => handleDbError('db context', 'testFn', original)).toThrow(original);

      expectLog(logs.last(), { severity: 'ERROR', messageSubstr: 'db context' });

      // normalizeExtraArg turns Error into { name, message, stack }
      expect(logs.last()?.ctx).toMatchObject({
        function: 'testFn',
        error: expect.objectContaining({
          name: 'Error',
          message: 'boom',
        }),
      });
    });

    it('logs and throws a new Error when given a string', () => {
      expect(() => handleDbError('failed to write', 'saveItem', 'oops')).toThrow('failed to write');

      expectLog(logs.last(), { severity: 'ERROR', messageSubstr: 'failed to write' });

      expect(logs.last()?.ctx).toMatchObject({
        function: 'saveItem',
        // string stays a string in the composite extras case
        error: 'oops',
      });
    });

    it('logs and throws a new Error when given a non-Error object', () => {
      const notAnError = { code: 123, msg: 'nope' };

      expect(() => handleDbError('insert failed', 'insertItem', notAnError)).toThrow(
        'insert failed',
      );

      expectLog(logs.last(), { severity: 'ERROR', messageSubstr: 'insert failed' });

      expect(logs.last()?.ctx).toMatchObject({
        function: 'insertItem',
        // non-Error objects are passed through as-is
        error: notAnError,
      });
    });
  });
});
