import * as DataCache from '../../src/data/cache';
import * as SUT from '../../src/handler/vesselService'
import { ILanding, LandingSources } from '../../src/landings/types/landing';

describe('vesselService', () => {

  describe('getPlnsForLandings', () => {

    const vesselData = [
      {
        "rssNumber": "RSS1",
        "registrationNumber": "PLN1",
        "fishingLicenceValidFrom": "2020-01-01T00:00:00",
        "fishingLicenceValidTo": "2020-02-01T00:00:00"
      },
      {
        "rssNumber": "RSS2",
        "registrationNumber": "PLN2",
        "fishingLicenceValidFrom": "2020-01-01T00:00:00",
        "fishingLicenceValidTo": "2020-02-01T00:00:00"
      }
    ];

    let mockGetVesselData;

    beforeEach(() => {
      mockGetVesselData = jest.spyOn(DataCache, 'getVesselsData');
      mockGetVesselData.mockReturnValue(vesselData);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('will match vessel data by rssNumber', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS1',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        },
        {
          rssNumber: 'RSS2',
          dateTimeLanded: '2020-01-02',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([
        {rssNumber: input[0].rssNumber, dateLanded: input[0].dateTimeLanded, pln: 'PLN1'},
        {rssNumber: input[1].rssNumber, dateLanded: input[1].dateTimeLanded, pln: 'PLN2'}
      ]);
    });

    it('will match vessel data by rssNumber and dateTimeLanded', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS1',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        },
        {
          rssNumber: 'RSS2',
          dateTimeLanded: '2000-01-01',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([
        {rssNumber: input[0].rssNumber, dateLanded: input[0].dateTimeLanded, pln: 'PLN1'}
      ]);
    });

    it('will return an empty array when no matches are found', () => {
      const input: ILanding[] = [
        {
          rssNumber: 'RSS3',
          dateTimeLanded: '2020-01-01',
          source: LandingSources.CatchRecording,
          items: []
        }
      ];

      const output = SUT.getPlnsForLandings(input);

      expect(output).toEqual([]);
    });

  });

  describe('getVesselLength', () => {

    let mockGetRss;
    let mockGetVessel;

    beforeEach(() => {
      mockGetRss = jest.spyOn(SUT, 'getRssNumber');
      mockGetVessel = jest.spyOn(SUT, 'getVesselDetails');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    })

    it('will return undefined if the rss number is not found', () => {
      mockGetRss.mockReturnValue(undefined);

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return undefined if the vessel could not be found', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue(undefined);

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return undefined if the vessel length is not known', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue({test: 'test'});

      expect(SUT.getVesselLength('pln', 'date')).toBeUndefined();
    });

    it('will return the vessel length if it is known', () => {
      mockGetRss.mockReturnValue('rss');
      mockGetVessel.mockReturnValue({vesselLength: 22});

      expect(SUT.getVesselLength('pln', 'date')).toBe(22);
    });

  });

});