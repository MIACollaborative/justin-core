import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import DataManager from '../../data-manager/data-manager';
import {
  handleDecisionRuleResult,
  handleTaskResult,
  setDecisionRuleResultRecorder,
  setTaskResultRecorder,
  hasResultRecord,
} from '../result-recorder';
import { RecordResult } from '../handler.type';
import {
  DECISION_RULE_RESULTS,
  TASK_RESULTS,
} from '../../data-manager/data-manager.constants';

describe('Result Recorder Integration', () => {
  let mongod: MongoMemoryServer;
  let dataManager: DataManager;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    process.env.DB_NAME = 'testdb';

    dataManager = DataManager.getInstance();
    await dataManager.init();
  });

  afterAll(async () => {
    await dataManager.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await dataManager.clearCollection(DECISION_RULE_RESULTS);
    await dataManager.clearCollection(TASK_RESULTS);

    setDecisionRuleResultRecorder(null as any);
    setTaskResultRecorder(null as any);
  });

  it('should insert decision rule result when no recorder override', async () => {
    const now = new Date();
    const record: RecordResult = { steps: [{ step: 'test', result: { status: 'success' }, timestamp: now }], event: null as any, name: 'r', user: null as any };
    await handleDecisionRuleResult(record);

    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const docs = await db.collection(DECISION_RULE_RESULTS).find().toArray();
    expect(docs.length).toBe(1);
    expect(docs[0].steps).toEqual(record.steps);
    await client.close();
  });

  it('should not insert decision rule result when recorder override is set', async () => {
    const callback = jest.fn();
    setDecisionRuleResultRecorder(callback);
    const now = new Date();
    const record: RecordResult = { steps: [{ step: 'x', result: { status: 'success' }, timestamp: now }], event: null as any, name: 'r', user: null as any };

    await handleDecisionRuleResult(record);
    expect(callback).toHaveBeenCalledWith(record);

    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const docs = await db.collection(DECISION_RULE_RESULTS).find().toArray();
    expect(docs.length).toBe(0);
    await client.close();
  });

  it('should insert task result when no recorder override', async () => {
    const now = new Date();
    const record: RecordResult = { steps: [{ step: 't', result: { status: 'success' }, timestamp: now }], event: null as any, name: 'r', user: null as any };
    await handleTaskResult(record);

    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const docs = await db.collection(TASK_RESULTS).find().toArray();
    expect(docs.length).toBe(1);
    expect(docs[0].steps).toEqual(record.steps);
    await client.close();
  });

  it('should fallback to decision recorder when task recorder not set but decision set', async () => {
    const decisionCb = jest.fn();
    setDecisionRuleResultRecorder(decisionCb);
    const now = new Date();
    const record: RecordResult = { steps: [{ step: 'f', result: { status: 'success' }, timestamp: now }], event: null as any, name: 'r', user: null as any };

    await handleTaskResult(record);
    expect(decisionCb).toHaveBeenCalledWith(record);

    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const count = await client.db(process.env.DB_NAME).collection(TASK_RESULTS).countDocuments();
    // no task collection insert
    expect(count).toBe(0);
    await client.close();
  });

  it('should not insert when hasResultRecord is false', async () => {
    const empty: RecordResult = { steps: [], event: null as any, name: '', user: null as any };
    await handleDecisionRuleResult(empty);
    await handleTaskResult(empty);

    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    expect(await db.collection(DECISION_RULE_RESULTS).countDocuments()).toBe(0);
    expect(await db.collection(TASK_RESULTS).countDocuments()).toBe(0);
    await client.close();
  });
});
