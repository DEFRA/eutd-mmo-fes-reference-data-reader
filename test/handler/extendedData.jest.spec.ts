import * as extendedDataService from '../../src/landings/extendedValidationDataService';
import * as Hapi from '@hapi/hapi';
import { extendedDataRoutes } from '../../src/handler/extendedData';

const moment = require('moment')
moment.suppressDeprecationWarnings = true

const sinon = require('sinon');

const dataMock = sinon.stub(extendedDataService, 'getExtendedValidationData')

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9012,
    host: 'localhost'
  });

  extendedDataRoutes(server)

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});


describe("When retrieving raw landings", () => {

  describe('we will throw a bad request when',() => {
    it('there is no dateLanded', async () => {
        const req = {
            method: 'GET',
            url: '/v1/extendedData/rawLandings'
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);


      });

    it('dateLanded is invalid', async () => {
        const req = {
            method: 'GET',
            url: '/v1/extendedData/rawLandings?dateLanded=test'
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);


    });

    it('there is no rssNumber', async () => {
        const req = {
            method: 'GET',
            url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01'
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);


      });

    it('rssNumber is empty', async () => {
        const req = {
            method: 'GET',
            url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01&rssNumber='
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(400);


    });
  });

  describe('we will throw an internal server error when', () => {
      it('something goes wrong retrieving the raw landings', async () => {
        dataMock.reset();
        dataMock.throws();

        const req = {
            method: 'GET',
            url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01&rssNumber=test'
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);


      })
  });

  it('will return 200 if all goes OK', async () => {
    dataMock.reset();
    dataMock.returns([{}]);

    const req = {
        method: 'GET',
        url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01&rssNumber=test'
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);


  });

  it('will attempt to retrieve RawLandings', async () => {

    dataMock.reset();
    dataMock.returns([{}]);

    const req = {
        method: 'GET',
        url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01&rssNumber=test'
      };

    await server.inject(req);

    expect(dataMock.getCall(0).args[2]).toBe("rawLandings");


  });

  it('will return retrieved data', async () => {
    dataMock.reset();
    dataMock.returns({landing: "Landing"});

    const req = {
        method: 'GET',
        url: '/v1/extendedData/rawLandings?dateLanded=2019-01-01&rssNumber=test'
        };

    const response = await server.inject(req);

    expect(response.payload).toBe(JSON.stringify({landing: "Landing"}));


   });
});

describe("When retrieving sales notes", () => {

    describe('we will throw a bad request when',() => {
        it('there is no dateLanded', async () => {
            const req = {
                method: 'GET',
                url: '/v1/extendedData/salesNotes'
            };

            const response = await server.inject(req);

            expect(response.statusCode).toBe(400);


        });

        it('dateLanded is invalid', async () => {
            const req = {
                method: 'GET',
                url: '/v1/extendedData/salesNotes?dateLanded=test'
            };

            const response = await server.inject(req);

            expect(response.statusCode).toBe(400);


        });

        it('there is no rssNumber', async () => {
            const req = {
                method: 'GET',
                url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01'
            };

            const response = await server.inject(req);

            expect(response.statusCode).toBe(400);


        });

        it('rssNumber is empty', async () => {
            const req = {
                method: 'GET',
                url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01&rssNumber='
            };

            const response = await server.inject(req);

            expect(response.statusCode).toBe(400);


        });
    });

    describe('we will throw an internal server error when', () => {
        it('something goes wrong retrieving the sales note', async () => {
          dataMock.reset();
          dataMock.throws();

          const req = {
              method: 'GET',
              url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01&rssNumber=test'
            };

          const response = await server.inject(req);

          expect(response.statusCode).toBe(500);


        })
    });

    it('will return 200 if all goes OK', async () => {
        dataMock.reset();
        dataMock.returns([{}]);

        const req = {
            method: 'GET',
            url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01&rssNumber=test'
          };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(200);


      });

    it('will attempt to retrieve SalesNotes', async () => {

      dataMock.reset();
      dataMock.returns([{}]);

      const req = {
          method: 'GET',
          url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01&rssNumber=test'
      };

        await server.inject(req);

       expect(dataMock.getCall(0).args[2]).toBe("salesNotes");


    });

    it('will return retrieved data', async () => {
        dataMock.reset();
        dataMock.returns({salesNote: "Note"});

        const req = {
            method: 'GET',
            url: '/v1/extendedData/salesNotes?dateLanded=2019-01-01&rssNumber=test'
            };

        const response = await server.inject(req);

        expect(response.payload).toBe(JSON.stringify({salesNote: "Note"}));


    });
});


