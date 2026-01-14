import sinon from 'sinon';
// eslint-disable-next-line no-duplicate-imports
import type { SinonSandbox, SinonStub } from 'sinon';
import DataManager from '../../data-manager/data-manager';
import { ChangeListenerManager } from '../../data-manager/change-listener.manager';
import * as HelpersModule from '../../data-manager/data-manager.helpers';

export type CoreManagersSandbox = {
  /**
   * The underlying Sinon sandbox. Prefer using `.restore()` on the returned object.
   */
  sb: SinonSandbox;

  /**
   * Real singleton instance, with methods stubbed for unit tests.
   */
  dm: ReturnType<typeof DataManager.getInstance>;

  /**
   * Real singleton instance, with methods stubbed for unit tests.
   */
  clm: ChangeListenerManager;

  /**
   * Stubbed handleDbError that always throws the underlying error (or a new Error).
   */
  handleDbErrorStub: SinonStub;

  /**
   * Restore all sinon stubs/spies in this sandbox.
   */
  restore(): void;
};

/**
 * Creates a shared sandbox for unit tests that depend on core singletons.
 *
 * This mirrors the "clean beforeEach" pattern:
 * - DataManager singleton with common methods stubbed
 * - ChangeListenerManager singleton with listener methods stubbed
 * - handleDbError stub that always throws
 *
 * @example
 * ```ts
 * let t: CoreManagersSandbox;
 *
 * beforeEach(() => {
 *   t = makeCoreManagersSandbox();
 * });
 *
 * afterEach(() => {
 *   t.restore();
 * });
 * ```
 */
export function makeCoreManagersSandbox(): CoreManagersSandbox {
  const sb = sinon.createSandbox();

  const dm = DataManager.getInstance();
  const clm = ChangeListenerManager.getInstance();

  // DataManager stubs (baseline safe defaults)
  sb.stub(dm, 'init').resolves();
  sb.stub(dm, 'ensureStore').resolves();
  sb.stub(dm, 'ensureIndexes').resolves();
  sb.stub(dm, 'getInitializationStatus').returns(true);

  sb.stub(dm, 'getAllInCollection').resolves([]);
  sb.stub(dm, 'addItemToCollection').resolves(null as any);
  sb.stub(dm, 'updateItemByIdInCollection').resolves(null as any);
  sb.stub(dm, 'removeItemFromCollection').resolves(false as any);
  sb.stub(dm, 'clearCollection').resolves();

  // ChangeListenerManager stubs
  sb.stub(clm, 'addChangeListener');
  sb.stub(clm, 'removeChangeListener');
  sb.stub(clm, 'clearChangeListeners');

  /**
   * handleDbError stub
   *
   * Supports both call styles:
   *   handleDbError(message, error)
   *   handleDbError(message, methodName, error)
   *
   * Always rethrows the underlying Error (if present), or a new Error(message).
   */
  const handleDbErrorStub = sb
    .stub(HelpersModule, 'handleDbError')
    .callsFake((...args: unknown[]): never => {
      const [message, maybeMethod, maybeError] = args;
      const msg = String(message);
      const error = maybeError ?? maybeMethod;

      const err =
        error instanceof Error ? error : new Error(String(error ?? msg));

      // Useful for assertions if tests want it.
      (err as any).dbMessage = msg;

      throw err;
    });

  return {
    sb,
    dm,
    clm,
    handleDbErrorStub,
    restore() {
      sb.restore();
    },
  };
}
