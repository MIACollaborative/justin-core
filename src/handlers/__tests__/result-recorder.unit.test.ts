import sinon from 'sinon';
import { Log } from '../../logger/logger-manager';
import * as recorder from '../result-recorder';
import DataManager from '../../data-manager/data-manager';

describe('Result Recorder Module', () => {
  let warnStub: sinon.SinonStub;
  let dmGetInstanceStub: sinon.SinonStub;
  let dmInstance: { addItemToCollection: sinon.SinonStub };

  const emptyRecord = { steps: [] } as any;
  const nonEmptyRecord = { steps: [{}, {}] } as any;

  beforeEach(() => {
    recorder.setDecisionRuleResultRecorder(null as any);
    recorder.setTaskResultRecorder(null as any);

    warnStub = sinon.stub(Log, 'warn');

    dmInstance = { addItemToCollection: sinon.stub().resolves() };
    jest.spyOn(DataManager, 'getInstance').mockReturnValue(dmInstance as any);
  });

  afterEach(() => {
    warnStub.restore();
    (DataManager.getInstance as jest.Mock).mockRestore();
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
    it('calls decision recorder when set', async () => {
      const callback = sinon.spy();
      recorder.setDecisionRuleResultRecorder(callback);
      await recorder.handleDecisionRuleResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(callback, nonEmptyRecord);
      sinon.assert.notCalled(dmInstance.addItemToCollection);
    });
  });

  describe('handleTaskResult', () => {
    it('calls task recorder when set', async () => {
      const taskCb = sinon.spy();
      recorder.setTaskResultRecorder(taskCb);
      await recorder.handleTaskResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(taskCb, nonEmptyRecord);
      sinon.assert.notCalled(dmInstance.addItemToCollection);
    });

    it('falls back to decision recorder', async () => {
      const decisionCb = sinon.spy();
      recorder.setDecisionRuleResultRecorder(decisionCb);
      await recorder.handleTaskResult(nonEmptyRecord);
      sinon.assert.calledOnceWithExactly(decisionCb, nonEmptyRecord);
      sinon.assert.notCalled(dmInstance.addItemToCollection);
    });
  });
});
