import moment = require("moment");

const mongoose = require('mongoose');

import { MongoMemoryServer } from 'mongodb-memory-server';

import { getBlockedCatchCerts, getBlockedSdPs } from '../../../src/landings/persistence/blockedDocuments';
import { ICcQueryResult } from 'mmo-shared-reference-data';
import { FailedOnlineCertificates } from '../../../src/landings/types/query';

const createFailedCertificate = ({ documentNumber, documentType, createdAt, da, extended }: { documentNumber: string, documentType: string, createdAt: string, da: string, extended: any }): ICcQueryResult => ({
  documentNumber,
  documentType,
  createdAt,
  da,
  extended,
  status: '',
  rssNumber: '',
  dateLanded: '',
  species: '',
  weightFactor: 0,
  weightOnCert: 0,
  rawWeightOnCert: 0,
  weightOnAllCerts: 0,
  weightOnAllCertsBefore: 0,
  weightOnAllCertsAfter: 0,
  isLandingExists: false,
  isSpeciesExists: false,
  numberOfLandingsOnDay: 0,
  weightOnLanding: 0,
  weightOnLandingAllSpecies: 0,
  isOverusedThisCert: false,
  isOverusedAllCerts: false,
  overUsedInfo: [],
  durationSinceCertCreation: '',
  durationBetweenCertCreationAndFirstLandingRetrieved: '',
  durationBetweenCertCreationAndLastLandingRetrieved: '',
  isExceeding14DayLimit: false
});

describe('MongoMemoryServer - Wrapper to run inMemory Database', () => {

  let mongoServer;
  const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });


describe('when getting blocked catch certificates', () => {

  beforeEach(async () => {
    await FailedOnlineCertificates.deleteMany({});
  });

  it('can get a catch certificates', async () => {

    const document = new FailedOnlineCertificates({
      documentNumber: '001',
      documentType: 'catchCertificate'
    });

    await document.save()

    const res = await getBlockedCatchCerts({})

    expect(res.length).toBe(1)

  });

  it('can get multiple certificates', async () => {

    let document

    document = new FailedOnlineCertificates({
      documentNumber: '001',
      documentType: 'catchCertificate'
    })
    await document.save()

    document = new FailedOnlineCertificates({
      documentNumber: '002',
      documentType: 'catchCertificate'
    })
    await document.save()

    document = new FailedOnlineCertificates({
      documentNumber: '003',
      documentType: 'processingStatement'
    })
    await document.save()

    const res = await getBlockedCatchCerts({})

    expect(res.length).toBe(2)

    expect(res[0].documentNumber).toBe('001')
    expect(res[1].documentNumber).toBe('002')

  });

  describe('when filtering on functions used in the investigation action', () => {
    describe('on Document Number', () => {
      it('will successfully retrieve any matching documents', async () => {

        let document

        document = new FailedOnlineCertificates({
          documentNumber: '001',
          documentType: 'catchCertificate'
        })
        await document.save()

        document = new FailedOnlineCertificates({
          documentNumber: '002',
          documentType: 'catchCertificate'
        })
        await document.save()

        const res = await getBlockedCatchCerts({ documentNumber: '001' })

        expect(res.length).toBe(1)

        expect(res[0].documentNumber).toBe('001')

      });
    });

    describe('on PLN', () => {
      it('will successfully retrieve any matching documents', async () => {

        let document;

        document = new FailedOnlineCertificates({
          documentNumber: '001',
          documentType: 'catchCertificate',
          extended: {pln: 'FRED'}
        });

        await document.save();

        document = new FailedOnlineCertificates({
          documentNumber: '002',
          documentType: 'catchCertificate',
          extended: {pln: 'BOB'}
        });

        await document.save();

        const res = await getBlockedCatchCerts({ pln: 'BOB' });

        expect(res.length).toBe(1);

        expect(res[0].documentNumber).toBe('002');

      });
    });

    describe('on Exporter', () => {
      it('will successfully retrieve any matching documents', async () => {

        let document;

        document = new FailedOnlineCertificates({
          documentNumber: '001',
          documentType: 'catchCertificate',
          extended: {exporterCompanyName: 'FRED'}
        });

        await document.save();

        document = new FailedOnlineCertificates({
          documentNumber: '002',
          documentType: 'catchCertificate',
          extended: {exporterCompanyName: 'BOB'}
        });

        await document.save();

        const res = await getBlockedCatchCerts({ exporter: 'BOB' });

        expect(res.length).toBe(1);

        expect(res[0].documentNumber).toBe('002');

      });

      it('will be case insensitive', async() => {
        let document;

        document = new FailedOnlineCertificates({
          documentNumber: '001',
          documentType: 'catchCertificate',
          extended: {exporterCompanyName: 'FRED'}
        });

        await document.save();

        document = new FailedOnlineCertificates({
          documentNumber: '002',
          documentType: 'catchCertificate',
          extended: {exporterCompanyName: 'The Quick Brown FOX'}
        });

        await document.save();

        const res = await getBlockedCatchCerts({ exporter: 'the quick brown fox' });

        expect(res.length).toBe(1);

        expect(res[0].documentNumber).toBe('002');
      });
    });
  });
});

describe("when getting blocked storage documents and processing statements", () => {

  beforeAll(async () => {
    await FailedOnlineCertificates.insertMany([
      createFailedCertificate({ documentNumber: '001', documentType: 'storageDocument', createdAt: '2019-12-10T00:00:00.000Z', da: 'England', extended: { exporterCompanyName: 'Exporter 1' }}),
      createFailedCertificate({ documentNumber: '002', documentType: 'processingStatement', createdAt: '2019-12-01T00:00:00.000Z', da: 'Jersey', extended: { exporterCompanyName: 'Exporter 2' }}),
      createFailedCertificate({ documentNumber: '003', documentType: 'processingStatement', createdAt: '2020-01-01T00:00:00.000Z', da: 'N. Ireland', extended: { exporterCompanyName: 'Exporter 2' }})
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('can get storage documents and processing statements', async () => {
    const res = await getBlockedSdPs({});

    expect(res.length).toBe(3);
    expect(res[0].documentType).toBe('storageDocument');
    expect(res[1].documentType).toBe('processingStatement');
    expect(res[2].documentType).toBe('processingStatement');
  });

  describe('when filtering on functions used in the investigation action', () => {
    describe('By date', () => {
      it('will return any successful matches', async () => {
        const res = await getBlockedSdPs({
          fromDate: moment.utc('2019-12-05T00:00:00.000Z'),
          toDate: moment.utc('2019-12-15T00:00:00.000Z')
        });

        expect(res.length).toBe(1);
        expect(res[0].documentNumber).toBe('001');
      });
    });

    describe('By Areas', () => {
      it('will return any successful matches', async () => {
        const res = await getBlockedSdPs({
          areas: ["England", "N. Ireland"]
        });

        expect(res.length).toBe(2);
        expect(res[0].documentNumber).toBe('001');
        expect(res[1].documentNumber).toBe('003');
      });
    });

    describe('By Document Number', () => {
      it('will return any successful matches', async () => {
        const res = await getBlockedSdPs({
          documentNumber: '002'
        });

        expect(res.length).toBe(1);
        expect(res[0].documentNumber).toBe('002');
      });
    });

    describe('By exporter', () => {
      it('will return any successful matches', async () => {
        const res = await getBlockedSdPs({
          exporter: 'Exporter 2'
        });

        expect(res.length).toBe(2);
        expect(res[0].documentNumber).toBe('002');
        expect(res[1].documentNumber).toBe('003');
      });

      it('will be case insensitive', async() => {
        await FailedOnlineCertificates.insertMany([
          createFailedCertificate({ documentNumber: '003', documentType: 'processingStatement', createdAt: '2020-01-01T00:00:00.000Z', da: 'N. Ireland', extended: { exporterCompanyName: 'The QUICK BROWN FOX' }})
        ]);

        const res = await getBlockedSdPs({
          exporter: 'THE quick brown fox'
        });

        expect(res.length).toBe(1);
      });
    });
  });
});

});