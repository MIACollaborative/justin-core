import sinon, { SinonSandbox, SinonStub } from 'sinon';
import { createLogger } from '../logger';
import * as utils from '../utils';
import * as globalFns from '../global';

describe('createLogger', () => {
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
      .stub(utils, 'normalizeExtraArg')
      .callsFake((extras: unknown) => ({ normalized: extras }));

    getGlobalEmitFnStub = sb.stub(globalFns, 'getGlobalEmitFn');
    getGlobalLogCallbackStub = sb.stub(globalFns, 'getGlobalLogCallback');
    getGlobalLogContextStub = sb
      .stub(globalFns, 'getGlobalLogContext')
      .returns({ globalKey: 'globalVal' });
    getGlobalMinLogLevelStub = sb.stub(globalFns, 'getGlobalMinLogLevel').returns('DEBUG');
    getGlobalSeverityRankingStub = sb.stub(globalFns, 'getGlobalSeverityRanking').returns(undefined);
    defaultEmitStub = sb.stub(globalFns, 'defaultEmit');
  });

  afterEach(() => {
    sb.restore();
  });

  it('emits using the effective emit (instance → global → default)', () => {
    const instanceEmit = sinon.spy();

    const logger = createLogger({
      emitFn: instanceEmit as any,
      context: { service: 'test' },
    });

    logger.emit('INFO', 'hello', { extra: 1 });

    expect(normalizeExtraArgStub.calledWith({ extra: 1 })).toBe(true);

    expect(instanceEmit.calledOnce).toBe(true);
    const [entry, mergedCtx] = instanceEmit.getCall(0).args;

    expect(entry).toMatchObject({
      severity: 'INFO',
      message: 'hello',
    });

    expect(mergedCtx).toEqual({
      globalKey: 'globalVal',
      service: 'test',
      normalized: { extra: 1 },
    });

    expect(defaultEmitStub.called).toBe(false);
  });

  it('falls back to global emit when no instance emit is provided', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();
    logger.info('hey');

    expect(globalEmit.calledOnce).toBe(true);
    const [entry, ctx] = globalEmit.getCall(0).args;

    expect(entry.severity).toBe('INFO');
    expect(entry.message).toBe('hey');
    expect(ctx).toEqual({ globalKey: 'globalVal' });
  });

  it('falls back to default emit when neither instance nor global emit are provided', () => {
    getGlobalEmitFnStub.returns(undefined as any);

    const logger = createLogger();
    logger.warn('careful');

    expect(defaultEmitStub.calledOnce).toBe(true);
    const [entry, ctx] = defaultEmitStub.getCall(0).args;

    expect(entry.severity).toBe('WARNING');
    expect(entry.message).toBe('careful');
    expect(ctx).toEqual({ globalKey: 'globalVal' });
  });

  it('respects the minimum log level from globals', () => {
    getGlobalMinLogLevelStub.returns('WARNING');

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.debug('nope');
    logger.info('still nope');
    logger.warn('yes');
    logger.error('also yes');

    expect(globalEmit.callCount).toBe(2);
    expect(globalEmit.getCall(0).args[0].severity).toBe('WARNING');
    expect(globalEmit.getCall(1).args[0].severity).toBe('ERROR');
  });

  it('can override minimum log level per logger via options', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger({ emitLevel: 'DEBUG' });

    logger.debug('should emit');

    expect(globalEmit.calledOnce).toBe(true);
    expect(globalEmit.getCall(0).args[0].message).toBe('should emit');
  });

  it('setLevel updates min level at runtime', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.debug('first');
    expect(globalEmit.callCount).toBe(1);

    logger.setLevel('ERROR');

    logger.info('second');
    logger.warn('third');
    expect(globalEmit.callCount).toBe(1);

    logger.error('fourth');
    expect(globalEmit.callCount).toBe(2);
    expect(globalEmit.getCall(1).args[0].message).toBe('fourth');
  });

  it('setContext merges instance context for later emits', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger({ context: { service: 'svc' } });

    logger.info('before');
    logger.setContext({ requestId: 'req-1' });
    logger.info('after');

    const [, ctx2] = globalEmit.getCall(1).args;
    expect(ctx2).toEqual({
      globalKey: 'globalVal',
      service: 'svc',
      requestId: 'req-1',
    });
  });

  it('uppercases severity passed to emit', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.emit('info' as any, 'message');

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

    logger.info('hi');

    expect(instanceCb.calledOnce).toBe(true);
    expect(globalCb.called).toBe(false);
  });

  it('calls global callback when no instance callback is provided', () => {
    const globalCb = sinon.spy();
    getGlobalLogCallbackStub.returns(globalCb as any);

    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();
    logger.info('hey');

    expect(globalCb.calledOnce).toBe(true);
    const [entry] = globalCb.getCall(0).args;
    expect((entry as any).message).toBe('hey');
  });

  it('passes normalized extras in the merged context', () => {
    const globalEmit = sinon.spy();
    getGlobalEmitFnStub.returns(globalEmit as any);

    const logger = createLogger();

    logger.info('has extras', { user: { id: 'u1' } });

    expect(normalizeExtraArgStub.calledWith({ user: { id: 'u1' } })).toBe(true);

    const [entry, ctx] = globalEmit.getCall(0).args;
    expect(entry).toEqual({
      severity: 'INFO',
      message: 'has extras',
    });
    expect(ctx).toEqual({
      globalKey: 'globalVal',
      normalized: { user: { id: 'u1' } },
    });
  });
});
