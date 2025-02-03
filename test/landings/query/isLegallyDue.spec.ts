import { isLegallyDue, DEVOLVED_AUTHORITY } from '../../../src/landings/query/isLegallyDue';
const moment = require("moment");

describe('isLegallyDue', () => {

  // defaults used for tests where the actual values are unimportant
  const defaultDate = moment.utc('2020-01-01');
  const defaultIsQuotaSpecies = true;
  const defaultWeightOnCert = 100;

  describe('for vessels over 12m', () => {

    describe('when the live weight is MORE than the set 50KG Tolerance', () => {

      it('will return true', () => {
        const result = isLegallyDue(13, DEVOLVED_AUTHORITY.ENGLAND, defaultDate, defaultDate, defaultIsQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

    });

    describe('when the live weight is LESS than or EQUAL to the set 50KG Tolerlance', () => {
      const liveWeightOnCert = 50;

      describe('when the landing exists', () => {
        it('will return true', () => {
          const result = isLegallyDue(13, DEVOLVED_AUTHORITY.ENGLAND, defaultDate, defaultDate, defaultIsQuotaSpecies, liveWeightOnCert);

          expect(result).toBe(false);
        });

      });

      describe('when the landing does not exists', () => {
        it('will return false', () => {
          const result = isLegallyDue(13, DEVOLVED_AUTHORITY.ENGLAND, defaultDate, defaultDate, defaultIsQuotaSpecies, liveWeightOnCert);

          expect(result).toBe(false);
        });

      });

    });

  });

  describe('for vessels between 10-12m', () => {

    it('will return false', () => {
      const result = isLegallyDue(11, DEVOLVED_AUTHORITY.ENGLAND, defaultDate, defaultDate, defaultIsQuotaSpecies, defaultWeightOnCert);

      expect(result).toBe(false);
    });

  });

  describe('for vessels under 10m', () => {

    describe('when the da is England', () => {

      it('will return true for quota species', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = true;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.ENGLAND, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

      it('will return true for non-quota species if the date of application is 2 days greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-03');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = false;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.ENGLAND, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

      it('will return false for non-quota species if the date of application is the same as the landed date', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = false;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.ENGLAND, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(false);
      });

      it('will return false for non-quota species if the date of application is 1 day greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-02');
        const isQuotaSpecies = false;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.ENGLAND, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(false);
      });

    });

    describe('when the da is Wales', () => {

      it('will return true if the date of application is 2 days greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-03');
        const landedDate = moment.utc('2020-01-01');

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.WALES, applicationDate, landedDate, defaultIsQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

      it('will return false if the date of application is the same or 1 day greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-02');

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.WALES, applicationDate, landedDate, defaultIsQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(false);
      });

    });

    describe('when the da is Scotland, N.I, Jersey, or Guernsey', () => {

      it('will return false', () => {
        const countries:DEVOLVED_AUTHORITY[] = [
          DEVOLVED_AUTHORITY.SCOTLAND,
          DEVOLVED_AUTHORITY.NI,
          DEVOLVED_AUTHORITY.JERSEY,
          DEVOLVED_AUTHORITY.GUERNSEY
        ];

        countries.map((country: DEVOLVED_AUTHORITY) => {
          const result = isLegallyDue(9, country, defaultDate, defaultDate, defaultIsQuotaSpecies, defaultWeightOnCert);

          expect(result).toBe(false);
        });

      });

    });

    describe('when the da is Isle of Man', () => {

      it('will return true for quota species', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = true;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.IOM, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

      it('will return true for non-quota species if the date of application is 2 days greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-03');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = false;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.IOM, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(true);
      });

      it('will return false for non-quota species if the date of application is the same or 1 day greater than the landed date', () => {
        const applicationDate = moment.utc('2020-01-01');
        const landedDate = moment.utc('2020-01-01');
        const isQuotaSpecies = false;

        const result = isLegallyDue(9, DEVOLVED_AUTHORITY.IOM, applicationDate, landedDate, isQuotaSpecies, defaultWeightOnCert);

        expect(result).toBe(false);
      });

    });

  });

});