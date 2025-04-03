import {
  executeDecisionRule,
  getDecisionRuleByName,
  registerDecisionRule,
} from '../decision-rule.manager';
import {
  HandlerType,
  DecisionRule,
  DecisionRuleRegistration,
  DecisionRuleStep,
} from '../handler.type';
import {
  initializeLoggerMocks,
  LoggerMocksType,
} from '../../__tests__/mocks/logger.mock';
import { recordResult } from '../../event/record-result';
import { executeStep } from '../steps.helpers';
import { JEvent } from '../../event/event.type';
import { JUser } from '../../user-manager/user.type';

jest.mock('../../event/record-result');
jest.mock('../steps.helpers');

describe('DecisionRuleManager', () => {
  let loggerMock: LoggerMocksType;

  beforeEach(() => {
    loggerMock = initializeLoggerMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerMock.restoreLoggerMocks();
  });

  describe('registerDecisionRule', () => {
    it('should register a decision rule and log success', () => {
      const mockRule: DecisionRuleRegistration = {
        name: 'mockRule',
        shouldActivate: jest.fn(),
        selectAction: jest.fn(),
        doAction: jest.fn(),
      };

      registerDecisionRule(mockRule);

      const retrievedRule = getDecisionRuleByName(mockRule.name);
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule!.name).toBe(mockRule.name);
      expect(
        loggerMock.mockLogInfo.calledWith(
          'Decision rule "mockRule" registered successfully.'
        )
      ).toBe(true);
    });
  });

  describe('getDecisionRuleByName', () => {
    it('should return undefined for a non-existent rule', () => {
      const result = getDecisionRuleByName('nonExistentRule');
      expect(result).toBeUndefined();
    });

    it('should retrieve a registered rule', () => {
      const mockRule: DecisionRuleRegistration = {
        name: 'existingRule',
        shouldActivate: jest.fn(),
        selectAction: jest.fn(),
        doAction: jest.fn(),
      };

      registerDecisionRule(mockRule);

      const result = getDecisionRuleByName(mockRule.name);
      expect(result).toBeDefined();
      expect(result!.name).toBe(mockRule.name);
    });
  });

  describe('executeDecisionRule', () => {
    const mockRule: DecisionRule = {
      name: 'testRule',
      type: HandlerType.DECISION_RULE,
      shouldActivate: jest.fn(),
      selectAction: jest.fn(),
      doAction: jest.fn(),
    };

    const mockEvent: JEvent = {
      id: 'event123',
      eventType: 'MOCK_EVENT',
      name: 'mockEvent',
      procedures: ['testProcedure'],
      timestamp: new Date(),
    };

    const mockUser: JUser = {
      id: 'user123',
      preferredName: 'Test User',
    };

    it('should log success and record results when all steps succeed', async () => {
      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: DecisionRuleStep.SHOULD_ACTIVATE,
        result: { status: 'success' },
      });
      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: DecisionRuleStep.SELECT_ACTION,
        result: { status: 'success' },
      });
      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: DecisionRuleStep.DO_ACTION,
        result: { status: 'success' },
      });

      await executeDecisionRule(mockRule, mockEvent, mockUser);

      expect(
        loggerMock.mockLogInfo.calledWith(
          'Starting decision rule "testRule" for user "user123" in event "MOCK_EVENT" with ID: event123.'
        )
      ).toBe(true);
      expect(
        loggerMock.mockLogInfo.calledWith(
          'Decision rule "testRule" completed for user "user123" in event "MOCK_EVENT".'
        )
      ).toBe(true);

      expect(recordResult).toHaveBeenCalledWith({
        event: mockEvent,
        name: mockRule.name,
        steps: [
          { step: DecisionRuleStep.SHOULD_ACTIVATE, result: { status: 'success' } },
          { step: DecisionRuleStep.SELECT_ACTION, result: { status: 'success' } },
          { step: DecisionRuleStep.DO_ACTION, result: { status: 'success' } },
        ],
        user: mockUser,
      });
    });


    it('should skip further steps if a step fails', async () => {

      (executeStep as jest.Mock).mockResolvedValueOnce({
        step: DecisionRuleStep.SHOULD_ACTIVATE,
        result: { status: 'failure' },
      });

      await executeDecisionRule(mockRule, mockEvent, mockUser);

      expect(executeStep).toHaveBeenCalledTimes(1);
    });

    it('should log an error if an exception occurs during execution', async () => {
      const mockError = new Error('Execution error');
      (executeStep as jest.Mock).mockRejectedValueOnce(mockError);

      await executeDecisionRule(mockRule, mockEvent, mockUser);

      expect(
        loggerMock.mockLogError.calledWith(
          `Error processing decision rule "testRule" for user "user123" in event "MOCK_EVENT": ${mockError}`
        )
      ).toBe(true);
      expect(recordResult).toHaveBeenCalled();
    });
  });
});
