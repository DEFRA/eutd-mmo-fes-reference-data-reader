import { toDefraTradeCc } from '../../../src/landings/transformations/defraTradeValidation';

jest.mock('../../../src/landings/transformations/defraValidation', () => ({
  toTransportation: jest.fn((t) => {
    if (!t) return undefined;
    return {
      ...t,
      pointOfDestination: t.pointOfDestination,
      exportDate: t.exportDate
    };
  }),
  toDefraSdStorageFacility: jest.fn(() => ({}))
}));

const mockCertificateCase = { id: 'CASE1' } as any;

describe('toDefraTradeCc transportation selection', () => {
  it('prefers document.exportData.transportation when present', () => {
    const document = {
      exportData: {
        transportation: { vehicle: 'vessel', departurePlace: 'A', exportDate: '01/01/2024' },
        transportations: [{ vehicle: 'truck', cmr: 'Y' }]
      }
    } as any;

    const result = toDefraTradeCc(document, mockCertificateCase, []);
    expect(result.transportation).toBeDefined();
    expect(result.transportation?.vehicle).toBe('vessel');
    expect(result.transportation?.departurePlace).toBe('A');
  });

  it('falls back to transportations array when single missing', () => {
    const document = {
      exportData: {
        transportations: [{ vehicle: 'truck', cmr: 'Y' }, { vehicle: 'plane', departurePlace: 'B' }]
      }
    } as any;

    const result = toDefraTradeCc(document, mockCertificateCase, []);
    expect(result.transportation).toBeDefined();
    expect(['truck','plane']).toContain(result.transportation?.vehicle);
  });

  it('handles no transportation gracefully', () => {
    const document = { exportData: {} } as any;
    const result = toDefraTradeCc(document, mockCertificateCase, []);
    expect(result.transportation).toBeUndefined();
  });
});

describe('toDefraTradeSd transportation selection and filtering', () => {
  const { toDefraTradeSd } = require('../../../src/landings/transformations/defraTradeValidation');
  const defraValidation = require('../../../src/landings/transformations/defraValidation');

  it('calls toTransportation for export and arrival and filters undefined keys', () => {
    // Mock toTransportation to return some undefined fields
    defraValidation.toTransportation = jest.fn((t) => {
      if (!t) return undefined;
      return {
        modeofTransport: t.modeofTransport,
        hasRoadTransportDocument: t.hasRoadTransportDocument,
        exportDate: t.exportDate,
        pointOfDestination: t.pointOfDestination,
        placeOfUnloading: t.placeOfUnloading,
        optionalUndefined: undefined
      };
    });

    const document = {
      exportData: {
        transportation: { modeofTransport: 'truck', exportDate: '05/09/2023', pointOfDestination: 'Dover Port' },
        arrivalTransportation: { modeofTransport: 'truck', placeOfUnloading: 'Dover Port', exportDate: '05/09/2023' }
      }
    } as any;

    const result = toDefraTradeSd(document, { id: 'SD1' } as any, []);

    expect(defraValidation.toTransportation).toHaveBeenCalledTimes(2);
    expect(result.transportation).toBeDefined();
    expect(result.transportation?.optionalUndefined).toBeUndefined();
    // Ensure the filtering removed undefined keys (object should not have 'optionalUndefined')
    expect(Object.prototype.hasOwnProperty.call(result.transportation, 'optionalUndefined')).toBe(false);
    expect(result.arrivalTransportation).toBeDefined();
  });

  it('parses exportDate into YYYY-MM-DD when valid, otherwise falls back to utc', () => {
    defraValidation.toTransportation = jest.fn((t) => t ? ({ exportDate: t.exportDate }) : undefined);

    const document = {
      exportData: {
        transportation: { exportDate: '05/09/2023' }
      }
    } as any;

    const result = toDefraTradeSd(document, { id: 'SD2' } as any, []);
    expect(result.transportation.exportDate).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});


