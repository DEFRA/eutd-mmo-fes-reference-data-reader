import { toDefraPsCatch } from '../../../src/landings/transformations/defraValidation';
import { ProcessingStatementReportCatch } from '../../../src/landings/types/defraValidation';

describe('Issuing Country in Processing Statement', () => {
    describe('toDefraPsCatch', () => {
        describe('Foreign certificate handling', () => {
            it('should populate issuingCountry from user input when certificate is not issued in UK', () => {
                const psCatch = {
                    species: 'SAL',
                    scientificName: 'Salmo salar',
                    catchCertificateNumber: 'IRL-PS-4324-423423-234234',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'France' },
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 180,
                    exportWeightAfterProcessing: 150,
                    cnCode: '523842358'
                };

                const result: ProcessingStatementReportCatch = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.issuingCountry).toBe('France');
                expect(result.catchCertificateNumber).toBe('IRL-PS-4324-423423-234234');
                expect(result.species).toBe('SAL');
                expect(result).not.toHaveProperty('catchCertificateType');
            });

            it('should handle Norway foreign certificate correctly', () => {
                const psCatch = {
                    species: 'COD',
                    catchCertificateNumber: 'NOR-CC-12345',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'Norway' },
                    totalWeightLanded: 100,
                    exportWeightBeforeProcessing: 90,
                    exportWeightAfterProcessing: 80
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.issuingCountry).toBe('Norway');
            });

            it('should handle Iceland foreign certificate correctly', () => {
                const psCatch = {
                    species: 'COD',
                    catchCertificateNumber: 'ISL-CC-67890',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'Iceland' },
                    totalWeightLanded: 150,
                    exportWeightBeforeProcessing: 140,
                    exportWeightAfterProcessing: 130
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.issuingCountry).toBe('Iceland');
            });

            it('should maintain issuingCountry as undefined when not provided for foreign certificates', () => {
                const psCatch = {
                    species: 'HER',
                    catchCertificateNumber: 'FOR-CC-12345',
                    catchCertificateType: 'foreign',
                    totalWeightLanded: 150,
                    exportWeightBeforeProcessing: 140,
                    exportWeightAfterProcessing: 130
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.issuingCountry).toBeUndefined();
            });
        });

        describe('UK certificate handling', () => {
            it('should set issuingCountry to "United Kingdom" when certificate is issued in UK', () => {
                const psCatch = {
                    species: 'COD',
                    catchCertificateNumber: 'GBR-CC-12345',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 100,
                    exportWeightBeforeProcessing: 90,
                    exportWeightAfterProcessing: 80
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(true);
                expect(result.issuingCountry).toBe('United Kingdom');
                expect(result).not.toHaveProperty('catchCertificateType');
            });

            it('should override any existing issuingCountry value when UK certificate', () => {
                const psCatch = {
                    species: 'SAL',
                    catchCertificateNumber: 'GBR-CC-98765',
                    catchCertificateType: 'uk',
                    issuingCountry: { officialCountryName: 'Some Other Country' },
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 180,
                    exportWeightAfterProcessing: 150
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(true);
                expect(result.issuingCountry).toBe('United Kingdom');
            });

            it('should handle first UK certificate consistently', () => {
                const psCatch = {
                    species: 'SAL',
                    catchCertificateNumber: 'GBR-CC-12345-001',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 190,
                    exportWeightAfterProcessing: 180
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(true);
                expect(result.issuingCountry).toBe('United Kingdom');
            });

            it('should handle second UK certificate consistently', () => {
                const psCatch = {
                    species: 'SAL',
                    catchCertificateNumber: 'GBR-CC-67890-002',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 190,
                    exportWeightAfterProcessing: 180
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(true);
                expect(result.issuingCountry).toBe('United Kingdom');
            });
        });

        describe('Data integrity and validation', () => {
            it('should preserve all other catch properties', () => {
                const psCatch = {
                    species: 'SAL',
                    scientificName: 'Salmo salar',
                    catchCertificateNumber: 'IRL-PS-4324-423423-234234',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'Ireland' },
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 180,
                    exportWeightAfterProcessing: 150,
                    isOverUse: true,
                    hasWeightMismatch: false,
                    importWeightExceededAmount: 25,
                    cnCode: '523842358'
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.species).toBe('SAL');
                expect(result.scientificName).toBe('Salmo salar');
                expect(result.totalWeightLanded).toBe(200);
                expect(result.exportWeightBeforeProcessing).toBe(180);
                expect(result.exportWeightAfterProcessing).toBe(150);
                expect(result.isOverUse).toBe(true);
                expect(result.hasWeightMismatch).toBe(false);
                expect(result.importWeightExceededAmount).toBe(25);
                expect(result.cnCode).toBe('523842358');
            });

            it('should remove catchCertificateType property for UK certificates', () => {
                const psCatch = {
                    species: 'HER',
                    catchCertificateNumber: 'TEST-CC-12345',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 100,
                    exportWeightBeforeProcessing: 90,
                    exportWeightAfterProcessing: 80
                };

                const result = toDefraPsCatch(psCatch);

                expect(result).not.toHaveProperty('catchCertificateType');
            });

            it('should remove catchCertificateType property for foreign certificates', () => {
                const psCatch = {
                    species: 'HER',
                    catchCertificateNumber: 'TEST-CC-12345',
                    catchCertificateType: 'foreign',
                    totalWeightLanded: 100,
                    exportWeightBeforeProcessing: 90,
                    exportWeightAfterProcessing: 80
                };

                const result = toDefraPsCatch(psCatch);

                expect(result).not.toHaveProperty('catchCertificateType');
            });

            it('should handle edge cases gracefully', () => {
                const psCatch = {
                    species: 'COD',
                    catchCertificateNumber: 'MIN-CC-12345',
                    catchCertificateType: 'foreign',
                    totalWeightLanded: 50,
                    exportWeightBeforeProcessing: 50,
                    exportWeightAfterProcessing: 45
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.issuingCountry).toBeUndefined();
                expect(result.species).toBe('COD');
                expect(result.catchCertificateNumber).toBe('MIN-CC-12345');
            });
        });

        describe('Business rule validation', () => {
            it('should match the JSON example for foreign certificate', () => {
                const psCatch = {
                    species: 'SAL',
                    catchCertificateNumber: 'IRL-PS-4324-423423-234234',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'France' },
                    cnCode: '523842358',
                    totalWeightLanded: 200,
                    exportWeightBeforeProcessing: 100,
                    exportWeightAfterProcessing: 150
                };

                const result = toDefraPsCatch(psCatch);
                expect(result.catchCertificateNumber).toBe('IRL-PS-4324-423423-234234');
                expect(result.issuingCountry).toBe('France');
                expect(result.isDocumentIssuedInUK).toBe(false);
                expect(result.species).toBe('SAL');
                expect(result.cnCode).toBe('523842358');
            });

            it('should ensure issuingCountry is always present when isDocumentIssuedInUK is true', () => {
                const psCatch = {
                    species: 'HER',
                    catchCertificateNumber: 'GBR-CC-12345',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 300,
                    exportWeightBeforeProcessing: 290,
                    exportWeightAfterProcessing: 280
                };

                const result = toDefraPsCatch(psCatch);

                expect(result.isDocumentIssuedInUK).toBe(true);
                expect(result.issuingCountry).toBeDefined();
                expect(result.issuingCountry).toBe('United Kingdom');
            });

            it('should handle issuingCountry for Strategic Reporting requirements', () => {
                const ukCatch = {
                    species: 'COD',
                    catchCertificateNumber: 'GBR-CC-SR-001',
                    catchCertificateType: 'uk',
                    totalWeightLanded: 400,
                    exportWeightBeforeProcessing: 390,
                    exportWeightAfterProcessing: 370
                };

                const foreignCatch = {
                    species: 'SAL',
                    catchCertificateNumber: 'NOR-CC-SR-002',
                    catchCertificateType: 'foreign',
                    issuingCountry: { officialCountryName: 'Norway' },
                    totalWeightLanded: 250,
                    exportWeightBeforeProcessing: 240,
                    exportWeightAfterProcessing: 220
                };

                const ukResult = toDefraPsCatch(ukCatch);
                const foreignResult = toDefraPsCatch(foreignCatch);

                expect(ukResult.issuingCountry).toBe('United Kingdom');
                expect(foreignResult.issuingCountry).toBe('Norway');

                expect(typeof ukResult.issuingCountry).toBe('string');
                expect(typeof foreignResult.issuingCountry).toBe('string');
            });
        });
    });
});