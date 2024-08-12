import * as Service from '../../src/landings/updateIgnoreFlagName';
import * as CatchCertPersistance from '../../src/landings/persistence/catchCert';

describe('updateIgnoreFlagName', () => {

  let mockGetAllCatchCerts;
  let mockHasProductsToUpdate;
  let mockUpdateProducts;
  let mockUpsertProductsByIgnore;

  beforeAll(async () => {

    mockGetAllCatchCerts = jest.spyOn(CatchCertPersistance, 'getAllCatchCertsWithProducts');
    mockGetAllCatchCerts.mockResolvedValue([
      {documentNumber: 'cert1'},
      {documentNumber: 'cert2'},
      {documentNumber: 'cert3'}
    ]);

    mockHasProductsToUpdate = jest.spyOn(Service, 'hasProductsToUpdate');
    mockHasProductsToUpdate.mockReturnValueOnce(false);
    mockHasProductsToUpdate.mockReturnValue(true);

    mockUpdateProducts = jest.spyOn(Service, 'updateProducts');
    mockUpdateProducts.mockImplementation(cert => ({...cert, updated: true}));

    mockUpsertProductsByIgnore = jest.spyOn(CatchCertPersistance, 'upsertProductsByIgnore');
    mockUpsertProductsByIgnore.mockReturnValue(null);

    await Service.updateIgnoreFlagName();

  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('will check every cert', () => {
    expect(mockHasProductsToUpdate).toHaveBeenCalledTimes(3);
  })

  it('will only update certs which need updating', async () => {
    expect(mockUpdateProducts).toHaveBeenCalledTimes(2);
    expect(mockUpdateProducts).toHaveBeenCalledWith({documentNumber: 'cert2'});
    expect(mockUpdateProducts).toHaveBeenCalledWith({documentNumber: 'cert3'});
  });

  it('will save all updated certs to the db', () => {
    expect(mockUpsertProductsByIgnore).toHaveBeenCalledTimes(2);
    expect(mockUpsertProductsByIgnore).toHaveBeenCalledWith({documentNumber: 'cert2', updated: true}, 'cert2');
    expect(mockUpsertProductsByIgnore).toHaveBeenCalledWith({documentNumber: 'cert3', updated: true}, 'cert3');
  });

});

describe('updateCaughtBy', () => {

  it('will rename the _ignore flag to vesselOverriddenByAdmin', () => {

    const res = Service.updateCaughtBy([
      {vessel: 'WIRON 5', _ignore: true},
      {vessel: 'WIRON 6'}
    ]);

    expect(res).toEqual([
      {vessel: 'WIRON 5', vesselOverriddenByAdmin: true},
      {vessel: 'WIRON 6'}
    ]);

  });

});

describe('updateProducts', () => {

  it('update _ignore to vesselOverriddenByAdmin in caughtBy in products', () => {

    const cert = {
      documentNumber: 'CC1',
      exportData: {
        products: [
          {
            speciesCode: 'COD',
            caughtBy: [
              { vessel: 'DAYBREAK1' },
              { vessel: 'DAYBREAK2' }
            ],
          },
          {
            speciesCode: 'HER',
            caughtBy: [
              { vessel: 'DAYBREAK3' },
              { vessel: 'DAYBREAK4', _ignore: true },
              { vessel: 'DAYBREAK5', _ignore: true }
            ],
          }
        ]
      }
    }

    const res = Service.updateProducts(cert);

    expect(res).toEqual([
      {
        speciesCode: 'COD',
        caughtBy: [
          { vessel: 'DAYBREAK1' },
          { vessel: 'DAYBREAK2' }
        ],
      },

      {
        speciesCode: 'HER',
        caughtBy: [
          { vessel: 'DAYBREAK3' },
          { vessel: 'DAYBREAK4', vesselOverriddenByAdmin: true },
          { vessel: 'DAYBREAK5', vesselOverriddenByAdmin: true }
        ],
      }
    ]);
  });

});

describe('hasLandingsToUpdate', () => {

  it('will return true if a product has landings which need updating', () => {
    const product = {
      speciesCode: 'COD',
      caughtBy: [
        { vessel: 'DAYBREAK' },
        { vessel: 'DAYBREAK', _ignore: true }
      ],
    };

    expect(Service.hasLandingsToUpdate(product)).toBe(true);
  });

  it('will return false if a product does not have landings', () => {
    const product = {
      speciesCode: 'COD'
    };

    expect(Service.hasLandingsToUpdate(product)).toBe(false);
  });

  it('will return false if a product does not have landings which need updating', () => {
    const product = {
      speciesCode: 'COD',
      caughtBy: [
        { vessel: 'DAYBREAK' },
        { vessel: 'DAYBREAK' }
      ],
    };

    expect(Service.hasLandingsToUpdate(product)).toBe(false);
  });

  it('should not fail with a null value in caughtBy', () => {
    const product = {
      speciesCode: 'COD',
      caughtBy: [
        null
      ],
    };

    expect(Service.hasLandingsToUpdate(product)).toBe(false);
  });

});

describe('hasProductsToUpdate', () => {

  let mockHasLandingsToUpdate;

  beforeEach(() => {
    mockHasLandingsToUpdate = jest.spyOn(Service, 'hasLandingsToUpdate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  })

  it('will return false for a certificate without exportData', () => {
    const cert = {
      documentNumber: 'CC1'
    }

    const res = Service.hasProductsToUpdate(cert);

    expect(res).toBe(false);
  });

  it('will return false for a certificate without products', () => {
    mockHasLandingsToUpdate.mockReturnValue(true);

    const cert = {
      documentNumber: 'CC1',
      exportData: {
        products: []
      }
    }

    const res = Service.hasProductsToUpdate(cert);

    expect(res).toBe(false);
  });

  it('will return true if hasLandingsToUpdate returns true for a product', () => {
    mockHasLandingsToUpdate.mockReturnValue(true);

    const cert = {
      documentNumber: 'CC1',
      exportData: {
        products: [
          {species: 'COD'}
        ]
      }
    }

    const res = Service.hasProductsToUpdate(cert);

    expect(res).toBe(true);
  });

  it('will return true as soon as hasLandingsToUpdate returns true for any product', () => {
    mockHasLandingsToUpdate.mockReturnValueOnce(false);
    mockHasLandingsToUpdate.mockReturnValueOnce(false);
    mockHasLandingsToUpdate.mockReturnValue(true);

    const cert = {
      documentNumber: 'CC1',
      exportData: {
        products: [
          {species: 'COD'},
          {species: 'HER'},
          {species: 'LBE'},
          {species: 'AAA'},
          {species: 'BBB'},
          {species: 'CCC'}
        ]
      }
    }

    const res = Service.hasProductsToUpdate(cert);

    expect(res).toBe(true);
    expect(mockHasLandingsToUpdate).toHaveBeenCalledTimes(3);
  });

});