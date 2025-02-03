import { MongoMemoryServer } from 'mongodb-memory-server';
import { PreApprovedDocuments as preApprovedMongooseDoc } from '../../src/landings/types/preApprovedDocument';
import {
    getPreApprovedDocumentByDocumentNumber,
    isDocumentPreApproved,
    preApproveDocumentFromMongo
} from '../../src/landings/persistence/preApproved.service'
import { hashIt } from '../../src/utils/hashIt'
import { DocumentModel } from "../../src/landings/types/document";
import { DocumentStatuses } from "../../src/landings/types/document"
import { AuditEventTypes } from "../../src/landings/types/auditEvent";

const mongoose = require('mongoose');


describe('Pre approved documents', () => {

    let mongoServer;

    const opts = { connectTimeoutMS:60000, socketTimeoutMS:600000, serverSelectionTimeoutMS:60000 }

    const testData = {
        documentNumber: "CC1",
        certificateData: { test: "test payload test" },
        preApprovedBy: "Bob"
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, opts).catch(err => {console.log(err)});
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await preApprovedMongooseDoc.deleteMany({});
        await DocumentModel.deleteMany({});
    });

    describe("When pre approving a certificate", () => {

        it('will successfully pre approve the document', async () => {
            const catchCert = new DocumentModel({
                __t: "catchCert",
                status: DocumentStatuses.Draft,
                documentNumber: "CC1",
                createdAt: "2019-10-19T00:00:00.000Z",
                createdBy: "Bob",
                createdByEmail: "foo@foo.com",
                exportData: { products : [] }
            });
            await catchCert.save();

            await preApproveDocumentFromMongo(testData.documentNumber,testData.preApprovedBy);

            const insertedDoc = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);

            expect(insertedDoc.documentNumber).toEqual("CC1");
        });

        describe("We will throw a `Not Found` error", () => {

            it('if the document does not exist', async() => {
                let err;
                try {
                    await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy)
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toEqual(Error("Not Found"));
                }
            });

            it('if the document exists but it is not a draft', async() => {

                let err;
                try {
                    const catchCert = new DocumentModel({
                        __t: "catchCert",
                        status: DocumentStatuses.Complete,
                        documentNumber: "CC1",
                        createdAt: "2019-10-19T00:00:00.000Z",
                        createdBy: "Bob",
                        createdByEmail: "foo@foo.com",
                        exportData: { products : [] }
                    });
                    await catchCert.save();

                    await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy)
                } catch (e) {
                    err = e;
                } finally {
                    expect(err).toEqual(Error("Not Found"));
                }
            });

        });

        describe("When retrieving a pre-approved document by its document number", () => {

            it('returns null if there is no preApprovedDocument', async () => {
                const insertedDoc = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);

                expect(insertedDoc).toBe(null);
            });

            it('can get an existing preApprovedDocument if it exists', async () => {
                const catchCert = new DocumentModel({
                    __t: "catchCert",
                    status: DocumentStatuses.Draft,
                    documentNumber: "CC1",
                    createdAt: "2019-10-19T00:00:00.000Z",
                    createdBy: "Bob",
                    createdByEmail: "foo@foo.com",
                    exportData: { products : [] }
                });
                await catchCert.save();

                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                const insertedDoc = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);

                expect(insertedDoc.documentNumber).toEqual("CC1");
            });

            it('can save the document', async () => {
                const catchCert = new DocumentModel({
                    __t: "catchCert",
                    status: DocumentStatuses.Draft,
                    documentNumber: "CC1",
                    createdAt: "2019-10-19T00:00:00.000Z",
                    createdBy: "Bob",
                    createdByEmail: "foo@foo.com",
                    exportData: { products : [] }
                });
                await catchCert.save();

                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                const insertedDoc = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);
                expect(insertedDoc.documentNumber).toEqual("CC1");

                const hashOfInsertedDoc = hashIt(JSON.stringify(catchCert.exportData));

                expect(insertedDoc.certificateData).toEqual(hashOfInsertedDoc);
                expect(insertedDoc.documentNumber).toEqual("CC1");
            });

            it('will update existing document if it is already pre approved', async () => {
                const catchCert = new DocumentModel({
                    __t: "catchCert",
                    status: DocumentStatuses.Draft,
                    documentNumber: "CC1",
                    createdAt: "2019-10-19T00:00:00.000Z",
                    createdBy: "Bob",
                    createdByEmail: "foo@foo.com",
                    exportData: { products : [] }
                });
                await catchCert.save();

                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                const insertedDoc = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);
                expect(insertedDoc.documentNumber).toEqual("CC1");

                //checking that a second call won't add a new document in the collection
                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);
                const insertedDoc2 = await getPreApprovedDocumentByDocumentNumber(testData.documentNumber);

                expect(insertedDoc2.documentNumber).toEqual("CC1");

                const hashOfInsertedDoc2 = hashIt(JSON.stringify(catchCert.exportData));
                expect(insertedDoc2.certificateData).toEqual(hashOfInsertedDoc2)
            });

        });

        describe("When checking if a document is pre approved", () => {

            describe('will return that a document is pre approved when', () => {

                it('exists as a preapproved document and its export data has not changed', async () => {
                    const originalCc = {
                        status: DocumentStatuses.Draft,
                        documentNumber: "CC1",
                        createdAt: "2019-10-19T00:00:00.000Z",
                        createdBy: 'Bob',
                        createdByEmail: 'foo@foo.com',
                        exportData: {products: ['one']}
                    };

                    const updatedCc = {
                        ...originalCc,
                        status: DocumentStatuses.Pending
                    };

                    await new DocumentModel({__t: "catchCert", ...originalCc}).save();

                    await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                    const result = await isDocumentPreApproved(testData.documentNumber, updatedCc);

                    expect(result).toEqual(true);
                });

                it('exists as a preapproved document and its export data does not exist', async () => {
                    const cert = await new DocumentModel({
                      __t: "catchCert",
                      status: DocumentStatuses.Draft,
                      documentNumber: "CC1",
                      createdAt: "2019-10-19T00:00:00.000Z",
                      createdBy: "Bob",
                      createdByEmail: "foo@foo.com",
                    });

                    await cert.save();

                    await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                    const result = await isDocumentPreApproved(testData.documentNumber, cert);

                    expect(result).toEqual(true);
                });

            });

            describe('will add a preApproved audit event when', () => {

                it('exists as a preapproved document and its export data has not changed', async () => {
                    const catchCert = new DocumentModel({
                        __t: "catchCert",
                        status: DocumentStatuses.Draft,
                        documentNumber: "CC1",
                        createdAt: "2019-10-19T00:00:00.000Z",
                        createdBy: "Bob",
                        createdByEmail: "foo@foo.com",
                        exportData: { products : [] }
                    });
                    await catchCert.save();

                    await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                    await isDocumentPreApproved(testData.documentNumber, catchCert);

                    const result : any = await DocumentModel.findOne({documentNumber: "CC1"})

                    expect(result.audit[0].eventType).toEqual(AuditEventTypes.PreApproved);
                });

            });

        });

        describe('will return that a document is not pre approved when', () => {

            it('exists as a preapproved document but its exportData has changed', async () => {
                const originalCc = {
                    status: DocumentStatuses.Draft,
                    documentNumber: "CC1",
                    createdAt: "2019-10-19T00:00:00.000Z",
                    createdBy: "Bob",
                    createdByEmail: "foo@foo.com",
                    exportData: {products: ['one']}
                };

                const updatedCc = {
                    ...originalCc,
                    exportData: {products: ['two']}
                };

                await new DocumentModel({__t: "catchCert", ...originalCc}).save();

                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                const result = await isDocumentPreApproved(testData.documentNumber, updatedCc);

                expect(result).toEqual(false);
            });

            it('does not exist as a preapproved document', async () => {
                const catchCert = {
                    status: DocumentStatuses.Draft,
                    documentNumber: "CC1",
                    createdAt: "2019-10-19T00:00:00.000Z",
                    createdBy: "Bob",
                    createdByEmail: "foo@foo.com",
                    exportData: { products : [] }
                };

                await new DocumentModel({__t: "catchCert", ...catchCert}).save();

                await preApproveDocumentFromMongo(testData.documentNumber, testData.preApprovedBy);

                const result = await isDocumentPreApproved("GBR-34342-2342-234", catchCert);

                expect(result).toEqual(false);
            });

        });

    });

});
