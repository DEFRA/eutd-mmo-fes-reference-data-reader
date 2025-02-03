const moment = require('moment');
import { type ILanding, ccQuery, LandingSources } from 'mmo-shared-reference-data';
import { CsvConverter } from '../../src/utils/csvConverter';
import { generateIndex } from 'mmo-shared-reference-data';

describe('When creating a Catch Ceritficate report, the CSV generator', () => {

  it('will generate the appropriate CSV', async () => {

    const vessels = [
      {
        registrationNumber:"WA1",
        fishingLicenceValidTo:"2020-12-20T00:00:00",
        fishingLicenceValidFrom:"2010-12-29T00:00:00",
        rssNumber: "rssWA1",
        adminPort: 'GUERNSEY'
      }
    ]

    const documents = [
      { documentNumber: "CC1",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products : [
            { speciesCode : "LBE",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10T00:00:00.000Z", weight: 100 },
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-11T00:00:00.000Z", weight: 100 }
              ]
            },
            { speciesCode : "COD",
              caughtBy : [
                { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10T00:00:00.000Z", weight: 500 },
              ]
            },
          ], }, },
      { documentNumber: "CC2",
        createdAt: "2019-07-10T08:26:06.939Z",
        exportData: {
          products : [
            { speciesCode : "LBE",
              caughtBy : [ { vessel: "DAYBREAK", pln: "WA1", date: "2019-07-10T00:00:00.000Z", weight: 300 } ] } ], }, },
    ]

    const landings: ILanding[] = [
			{ rssNumber: 'rssWA1',
        source: LandingSources.LandingDeclaration,
				dateTimeLanded: moment.utc('20190710T010000Z').toISOString(),
				items: [
					{ species: 'LBE', weight: 30, factor: 1 } ]},
			{ rssNumber: 'rssWA1',
        source: LandingSources.LandingDeclaration,
				dateTimeLanded: moment.utc('20190711T010000Z').toISOString(),
				items: [
					{ species: 'LBE', weight: 100, factor: 1 } ]},
    ]

    const vesselsIdx = generateIndex(vessels);

    const mockGetSpeciesAlias = jest.fn();
    mockGetSpeciesAlias.mockImplementation((speciesName) => {
      const list = {
        'MON': ['ANF'],
        'ANF': ['MON']
      }
      return list[speciesName] ?? []
    });

    const parser = new CsvConverter();
    const results: any[] = Array.from(ccQuery(documents, landings, vesselsIdx, moment.utc(), mockGetSpeciesAlias))
    const output = parser.generateCatchCertificateReport(results);

    const lines = output.split('\n')

    expect(lines.length).toBe(results.length + 1)

    const expecteCSVdHeaders = Object.keys(results[0]).map(key => `"${key}"`).join(',')
    const generatedHeaders = lines[0];

    expect(generatedHeaders).toEqual(expecteCSVdHeaders);

  })
})


