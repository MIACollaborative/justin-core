import sinon, { SinonSandbox, SinonStub } from 'sinon';
import { createLogger } from '../logger';
import * as globalFns from '../global';
import * as utilFns from '../utils';

describe('logger integration', () => {
  let sb: SinonSandbox;

  let normalizeExtraArgStub: SinonStub;

  let getGlobalEmitFnStub: SinonStub;
  let getGlobalLogCallbackStub: SinonStub;
  let getGlobalLogContextStub: SinonStub;
  let getGlobalMinLogLevelStub: SinonStub;
  let getGlobalSeverityRankingStub: SinonStub;
  let defaultEmitStub: SinonStub;

  beforeEach(() => {
    sb = sinon.createSandbox();

    normalizeExtraArgStub = sb
      .stub(utilFns, 'normalizeExtraArg')
      .callsFake((extras: unknown) => ({ normalized: extras }));

    getGlobalEmitFnStub = sb.stub(globalFns, 'getGlobalEmitFn');
    getGlobalLogCallbackStub = sb.stub(globalFns, 'getGlobalLogCallback');
    getGlobalLogContextStub = sb.stub(globalFns, 'getGlobalLogContext').returns({ app: 'demo' });
    getGlobalMinLogLevelStub = sb.stub(globalFns, 'getGlobalMinLogLevel').returns('INFO');
    getGlobalSeverityRankingStub = sb
      .stub(globalFns, 'getGlobalSeverityRanking')
      .returns(undefined);
    defaultEmitStub = sb.stub(globalFns, 'defaultEmit');
  });

  afterEach(() => {
    sb.restore();
  });

  it('emits with entry {severity,message} and flattened context (global + instance + extras)', () => {
    const instanceEmit = sinon.spy();

    const logger = createLogger({
      emitFn: instanceEmit as any,
      context: { service: 'users' },
    });

    logger.info('user created', { userId: 'u-1' });

    expect(normalizeExtraArgStub.calledWith({ userId: 'u-1' })).toBe(true);
    expect(instanceEmit.calledOnce).toBe(true);

    const [entry, ctx] = instanceEmit.getCall(0).args;

    expect(entry).toEqual({
      severity: 'INFO',
      message: 'user created',
    });
    expect(ctx).toEqual({
      app: 'demo', // from global
      service: 'users', // from instance
      normalized: { userId: 'u-1' }, // from extras
    });
  });

  it('falls back to global emit when instance emit is not provided', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();
    logger.warn('pay attention');

    expect(globalEmit.calledOnce).toBe(true);
    const [entry, ctx] = globalEmit.getCall(0).args;

    expect(entry).toEqual({
      severity: 'WARNING',
      message: 'pay attention',
    });
    expect(ctx).toEqual({ app: 'demo' });
  });

  it('falls back to defaultEmit when neither instance nor global emit is available', () => {
    // Explicitly say "no global emit"
    getGlobalEmitFnStub.returns(undefined as any);

    const logger = createLogger();
    logger.error('oh no', { err: 'boom' });

    expect(defaultEmitStub.calledOnce).toBe(true);
    const [entry, ctx] = defaultEmitStub.getCall(0).args;

    expect(entry).toEqual({
      severity: 'ERROR',
      message: 'oh no',
    });
    expect(ctx).toEqual({
      app: 'demo',
      normalized: { err: 'boom' },
    });
  });

  it('respects global min log level when instance does not override', () => {
    getGlobalMinLogLevelStub.returns('WARNING');

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.debug('no'); // < WARNING → filtered
    logger.info('still no');
    logger.warn('yes');
    logger.error('also yes');

    expect(globalEmit.callCount).toBe(2);
    expect(globalEmit.getCall(0).args[0].severity).toBe('WARNING');
    expect(globalEmit.getCall(1).args[0].severity).toBe('ERROR');
  });

  it('instance emitLevel overrides global min log level', () => {
    getGlobalMinLogLevelStub.returns('WARNING');

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger({ emitLevel: 'DEBUG' });

    logger.debug('should log');
    expect(globalEmit.calledOnce).toBe(true);
    expect(globalEmit.getCall(0).args[0].message).toBe('should log');
  });

  it('setLevel changes the threshold at runtime', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger(); // global INFO

    logger.info('1'); // logs
    logger.debug('2'); // filtered (INFO)
    expect(globalEmit.callCount).toBe(1);

    logger.setLevel('ERROR'); // now only ERROR+

    logger.warn('3'); // filtered
    logger.error('4'); // logged
    expect(globalEmit.callCount).toBe(2);
    expect(globalEmit.getCall(1).args[0].message).toBe('4');
  });

  it('setContext merges additional instance context', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger({ context: { service: 'svc' } });

    logger.info('before');
    logger.setContext({ requestId: 'req-123' });
    logger.info('after');

    const [, ctx2] = globalEmit.getCall(1).args;
    expect(ctx2).toEqual({
      app: 'demo',
      service: 'svc',
      requestId: 'req-123',
    });
  });

  it('uppercases severity passed to emit', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();
    logger.emit('info' as any, 'lowercase');

    expect(globalEmit.calledOnce).toBe(true);
    const [entry] = globalEmit.getCall(0).args;
    expect((entry as any).severity).toBe('INFO');
  });

  it('calls instance callback first, otherwise global callback', () => {
    const globalCb = sinon.spy();
    getGlobalLogCallbackStub.returns(globalCb as any);

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const instanceCb = sinon.spy();
    const logger = createLogger({ cb: instanceCb as any });

    logger.info('hello');

    expect(instanceCb.calledOnce).toBe(true);
    expect(instanceCb.getCall(0).args[0]).toEqual({
      severity: 'INFO',
      message: 'hello',
    });
    expect(globalCb.called).toBe(false);
  });

  it('falls back to global callback when no instance callback is provided', () => {
    const globalCb = sinon.spy();
    getGlobalLogCallbackStub.returns(globalCb as any);

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();
    logger.info('hi');

    expect(globalCb.calledOnce).toBe(true);
    expect(globalCb.getCall(0).args[0]).toEqual({
      severity: 'INFO',
      message: 'hi',
    });
  });

  it('honors global severity ranking when present', () => {
    getGlobalSeverityRankingStub.returns({
      DEBUG: 5,
      INFO: 10,
      WARNING: 50,
      ERROR: 100,
    });
    getGlobalMinLogLevelStub.returns('INFO');

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.debug('too low');
    logger.info('ok');
    logger.error('also ok');

    expect(globalEmit.callCount).toBe(2);
    expect(globalEmit.getCall(0).args[0].message).toBe('ok');
    expect(globalEmit.getCall(1).args[0].message).toBe('also ok');
  });
});
