import sinon from 'sinon';
import { Readable } from 'stream';
import DataManager from '../../data-manager/data-manager';

export const createDataManagerStub = () => {
  const mockDataStream = new Readable({ objectMode: true });
  mockDataStream._read = jest.fn();

  const dataManagerStub = sinon.createStubInstance(DataManager);
  dataManagerStub.getChangeStream.returns(mockDataStream);

  // Stub the singleton get instance
  sinon.stub(DataManager, 'getInstance').returns(dataManagerStub as any);

  return { dataManagerStub, mockDataStream };
};

export const restoreDataManagerStub = () => {
  sinon.restore();
};
