import logger from "../../src/logger";
import * as blob from '../../src/data/blob-storage';
import { BlobServiceClient, ContainerClient, BlobClient } from "@azure/storage-blob";

jest.mock("@azure/storage-blob");

describe('getEuMemberStates', () => {
  let mockLogError;
  let mockReadToText;
  let mockBlobClient;

  const container = "eumemberstates";
  const file = "eumemberstates.csv";

  beforeEach(() => {
    mockLogError = jest.spyOn(logger, 'error');
    mockReadToText = jest.spyOn(blob, 'readToText');

    mockBlobClient = jest.spyOn(BlobServiceClient, 'fromConnectionString');
    const containerObj = new ContainerClient(container);
    containerObj.getBlobClient = () => new BlobClient(file);
    mockBlobClient.mockImplementation(() => ({
      getContainerClient: () => containerObj,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('will log and rethrow any errors', async () => {
    const error = new Error('EuMemberStatesMockError');
    mockReadToText.mockRejectedValue(error);

    await expect(blob.getEuMemberStates('connString')).rejects.toThrow(error);

    expect(mockLogError).toHaveBeenNthCalledWith(1, error);
    expect(mockLogError).toHaveBeenNthCalledWith(2, `Cannot read remote file ${file} from container ${container}`);
  });

  it('will return EU member states as array of country names', async () => {
    const csvContent = 'Austria\nBelgium\nBulgaria\nCroatia\n\nCyprus\n';
    mockReadToText.mockResolvedValue(csvContent);
    
    const expected = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus'];

    const res = await blob.getEuMemberStates('connString');

    expect(res).toStrictEqual(expected);
  });

  it('will filter out empty lines and trim whitespace', async () => {
    const csvContent = '  France  \n\n  Germany\n  \n  Italy  \n';
    mockReadToText.mockResolvedValue(csvContent);
    
    const expected = ['France', 'Germany', 'Italy'];

    const res = await blob.getEuMemberStates('connString');

    expect(res).toStrictEqual(expected);
  });
});
