import sinon from 'sinon';
import { Log } from '../../logger/logger-manager';
import * as recorder from '../result-recorder';

describe('Result Recorder Module', () => {
  let warnStub: sinon.SinonStub;
  let consoleLogStub: sinon.SinonStub;

  const emptyRecord = { steps: [] } as any;
  const nonEmptyRecord = { steps: [{}, {}] } as any;

  beforeEach(() => {
    recorder.setDecisionRuleResultRecorder(null as any);
    recorder.setTaskResultRecorder(null as any);

    warnStub = sinon.stub(Log, 'warn');
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    warnStub.restore();
    consoleLogStub.restore();
  });

  describe('hasResultRecord', () => {
    it('returns false for empty steps', () => {
      expect(recorder.hasResultRecord(emptyRecord)).toBe(false);
    });
    it('returns true for non-empty steps', () => {
      expect(recorder.hasResultRecord(nonEmptyRecord)).toBe(true);
    });
  });

  describe('handleDecisionRuleResult', () => {
    it('warns on empty', async () => {
      await recorder.handleDecisionRuleResult(emptyRecord);
      sinon.assert.calledOnceWithExactly(
        warnStub,
        'No steps found.',
        JSON.stringify(emptyRecord)
      );
      sinon.assert.notCalled(consoleLogStub);
    });

    it('logs console fallback', async () => {
      await recorder.handleDecisionRuleResult(nonEmptyRecord);
      sinon.assert.notCalled(warnStub);
      sinon.assert.calledOnceWithExactly(
        consoleLogStub,
        '[Result] DecisionRule result:',
        nonEmptyRecord
      );
    });

    it('calls decision recorder when set', async () => {
      const callback = sinon.spy();
      recorder.setDecisionRuleResultRecorder(callback);
      await recorder.handleDecisionRuleResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(callback, nonEmptyRecord);
      sinon.assert.notCalled(consoleLogStub);
    });
  });

  describe('handleTaskResult', () => {
    it('warns on empty', async () => {
      await recorder.handleTaskResult(emptyRecord);
      sinon.assert.calledOnceWithExactly(
        warnStub,
        'No steps found.',
        JSON.stringify(emptyRecord)
      );
      sinon.assert.notCalled(consoleLogStub);
    });

    it('calls task recorder when set', async () => {
      const taskCb = sinon.spy();
      recorder.setTaskResultRecorder(taskCb);
      await recorder.handleTaskResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(taskCb, nonEmptyRecord);
      sinon.assert.notCalled(consoleLogStub);
    });

    it('falls back to decision recorder', async () => {
      const decisionCb = sinon.spy();
      recorder.setDecisionRuleResultRecorder(decisionCb);
      await recorder.handleTaskResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(decisionCb, nonEmptyRecord);
      sinon.assert.notCalled(consoleLogStub);
    });

    it('logs console fallback when no recorders', async () => {
      await recorder.handleTaskResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(
        consoleLogStub,
        '[Result] Task result:',
        nonEmptyRecord
      );
    });
  });
});
