import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Log } from '../../logger/logger-manager';
import { JUser } from '../../user-manager/user.type';
import { JEvent } from '../event.type';
import { StepReturnResult } from '../../handlers/handler.type';
import EventManager from '../event.manager';
import * as DecisionRuleManager from '../../handlers/decision-rule.manager';
import * as EventQueue from '../event-queue';
import DataManager from '../../data-manager/data-manager';
import { UserManager } from '../../user-manager/user-manager';

describe('Event Manager Integration Test', () => {

  let mongoServer: MongoMemoryReplSet;
  let dataManager: DataManager;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;
    Log.info('Mongo Server was launched');
    dataManager = DataManager.getInstance();
    await dataManager.init()
  });

  afterAll(async () => {
    await dataManager.close();
    await mongoServer.stop();
  });

  it('dispatch an event to a decision rule', (done) => {
    const eventName = 'test-event';
    const eventType = 'test-event-type';
    const decisionRuleName = 'test-decision-rule';

    const doTest = async () => {
      const SuccessResult: StepReturnResult = {
        status: 'success',
        result: true
      };

      const decisionRule = {
        name: decisionRuleName,
        shouldActivate: async (user: JUser, event: JEvent) => {
          setTimeout(() => done(), 1000); // let EQ finish its works
          return SuccessResult;
        },
        selectAction: async () => SuccessResult,
        doAction: async () => SuccessResult
      };

      const user = {
        id: 'test-user-id',
      };
      await UserManager.createUser(user);
      DecisionRuleManager.registerDecisionRule(decisionRule);
      await EventManager.registerCustomEventHandlers(eventName, eventType, [decisionRuleName]);
      EventQueue.setupEventQueueListener();
      await EventQueue.publishEventInstance(eventName, {detail:'foo'});
    };

    doTest();
  });
});



