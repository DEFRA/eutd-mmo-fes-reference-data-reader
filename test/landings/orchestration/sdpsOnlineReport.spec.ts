import {generateForeignCatchCertOnlineValidationReport} from "../../../src/landings/orchestration/sdpsOnlineReport";
import * as DataTransformations from "../../../src/landings/transformations/transformations";
import * as ForeignCatches from "../../../src/landings/query/sdpsQuery";
import * as Persistence from "../../../src/landings/persistence/storeDocProcStat";
const mongoose = require('mongoose');

import {FailedOnlineCertificates} from "../../../src/landings/types/query";
import {BlockingStatusModel} from "../../../src/landings/types/systemBlock";
import {MongoMemoryServer} from "mongodb-memory-server";
import {DocumentModel} from "../../../src/landings/types/document"
import {
    preApproveDocumentFromMongo
} from "../../../src/landings/persistence/preApproved.service";
import {PreApprovedDocuments as preApprovedMongooseDoc} from "../../../src/landings/types/preApprovedDocument";

describe('When validating an online ps or sd', () => {
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

    beforeEach(async () => {
        await FailedOnlineCertificates.deleteMany({});
        await BlockingStatusModel.deleteMany({});
        await DocumentModel.deleteMany({});
        await preApprovedMongooseDoc.deleteMany({});
    });

    describe('When a certificate is not valid', () => {
        it('we will map to a ps if redis payload is a ps', async () => {
            const mockedRedisPS = {
                "catches":[
                    {
                        "species":"Atlantic herring (HER)",
                        "catchCertificateNumber":"323223323242315",
                        "totalWeightLanded":"2",
                        "exportWeightBeforeProcessing":"5",
                        "exportWeightAfterProcessing":"2"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "consignmentDescription":"asfd",
                "error":"",
                "addAnotherCatch":"No",
                "personResponsibleForConsignment":"asdfs",
                "plantApprovalNumber":"asdfasdfasdf",
                "plantName":"23523",
                "plantAddressOne":"30 Bob Drive",
                "plantAddressTwo":"Standish",
                "plantTownCity":"Wigan",
                "plantPostcode":"WN4 2JT",
                "dateOfAcceptance":"05/12/2019",
                "healthCertificateNumber":"44234234",
                "healthCertificateDate":"01/10/2019",
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "townCity":"HARBOROUGH",
                    "postcode":"LE17 5QZ",
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"processingStatement",
                    "currentUri":"/create-processing-statement/add-exporter-details",
                    "nextUri":"/create-processing-statement/add-consignment-details",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "preLoadedAddress":true,
                    "preLoadedCompanyName":true
                },
                "documentNumber":"GBR-2019-PS-B3905EB18",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const mapToPS = jest.spyOn(DataTransformations,'mapProcessingStatementToPS');

            const payload = {
                dataToValidate: mockedRedisPS
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            expect(mapToPS).toHaveBeenCalled();


        });

        it('we will map to an sd if redis payload is a sd', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"300",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const mapToSD = jest.spyOn(DataTransformations,'mapStorageDocumentToSD');

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            expect(mapToSD).toHaveBeenCalled();


        });

        it('will get all document numbers', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"300",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const getDocumentNumbers = jest.spyOn(ForeignCatches,'getForeignCatchCertificatesFromDocuments');

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            expect(getDocumentNumbers).toHaveBeenCalled();


        });

        it('will retrieve all related documents', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"300",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const getAllDocuments = jest.spyOn(Persistence,'getAllDocuments');

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            expect(getAllDocuments).toHaveBeenCalled();


        });

        it('will execute validation query', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"300",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const getDocumentNumbers = jest.spyOn(ForeignCatches,'sdpsQuery');

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            expect(getDocumentNumbers).toHaveBeenCalled();


        });

        it('will produce a sdps online report', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"200",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"FCC051",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };
            const document = new DocumentModel(  {
                "__t":"storageDocument",
                "documentUri":"http://www.bob.com",
                "exportData":
                    {
                        "catches":[{
                            "certificateNumber":"FCC051",
                            "product":"Atlantic herring (HER)",
                            "commodityCode":"423523432",
                            "weightOnCC":1000,
                            "productWeight":1000
                        }]},
                "createdByEmail":"bob@bob.com",
                "createdBy":"bob",
                "createdAt":"2019-01-01T12:00:00.000Z",
                "documentNumber":"32345",
                "status":"COMPLETE"});

            await document.save();

            const payload = {
                dataToValidate: mockedRedisSD
            };

            const result = await generateForeignCatchCertOnlineValidationReport(payload);

            const expectedOutput = {
                isValid: false,
                details:[ { certificateNumber: 'FCC051', product: 'Atlantic herring (HER)' } ],
                rawData: [{
                    catchCertificateNumber: "FCC051",
                    commodityCode: "423523432",
                    createdAt: expect.any(String),
                    da: "England",
                    documentNumber: "GBR-2019-SD-DED9F3FE6",
                    documentType: "storageDocument",
                    dateOfUnloading: "01/10/2019",
                    extended: {
                      exporterCompanyName: "BONZO",
                      investigation: undefined,
                      preApprovedBy: undefined,
                      url: undefined,
                      voidedBy: undefined,
                    },
                    isMismatch: false,
                    isOverAllocated: true,
                    overAllocatedByWeight: 200,
                    overUsedInfo: ["32345"],
                    placeOfUnloading: "351",
                    species: "Atlantic herring (HER)",
                    status: "COMPLETE",
                    transportUnloadedFrom: "234",
                    weightOnAllDocs: 1200,
                    weightOnDoc: 200,
                    weightOnFCC: 1000,
                },
                {
                    catchCertificateNumber: "2",
                    commodityCode: "23408230498234",
                    createdAt: expect.any(String),
                    da: "England",
                    documentNumber: "GBR-2019-SD-DED9F3FE6",
                    documentType: "storageDocument",
                    dateOfUnloading: "09/07/2019",
                    extended: {
                      exporterCompanyName: "BONZO",
                      investigation: undefined,
                      preApprovedBy: undefined,
                      url: undefined,
                      voidedBy: undefined,
                    },
                    isMismatch: false,
                    isOverAllocated: false,
                    overAllocatedByWeight: 0,
                    overUsedInfo:[],
                    placeOfUnloading: "DOVER",
                    species: "Argentine anchovy (ANA)",
                    status: "COMPLETE",
                    transportUnloadedFrom: "234",
                    weightOnAllDocs: 200,
                    weightOnDoc: 200,
                    weightOnFCC: 20000,
                }]
            };

            expect(result).toEqual(expectedOutput);

        });

        it('will set the status to BLOCKED', async ()=>{
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"2000",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await BlockingStatusModel.create({
                name: "PS_SD_4b",
                status: true
            });

            await generateForeignCatchCertOnlineValidationReport(payload);

            const result = await FailedOnlineCertificates.findOne({ documentNumber: "GBR-2019-SD-DED9F3FE6" }).lean();

            expect(result.status).toEqual("BLOCKED");


        });

        it('will only save the failed certificate for the current document we are validating', async ()=>{
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"500",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"FCC051",
                        "weightOnCC":"1000"
                    },
                    {
                        "product":"Argentine anchovy (ANA)",
                        "commodityCode":"23408230498234",
                        "productWeight":"200",
                        "dateOfUnloading":"09/07/2019",
                        "placeOfUnloading":"DOVER",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"2",
                        "weightOnCC":"20000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };

            const document = new DocumentModel(  {
                "__t":"storageDocument",
                "documentUri":"http://www.bob.com",
                "exportData":
                    {
                        "catches":[{
                            "certificateNumber":"FCC051",
                            "product":"Atlantic herring (HER)",
                            "commodityCode":"423523432",
                            "weightOnCC":1000,
                            "productWeight":1000
                        }]},
                "createdByEmail":"bob@bob.com",
                "createdBy":"bob",
                "createdAt":"2019-01-01T12:00:00.000Z",
                "documentNumber":"32345",
                "status":"COMPLETE"});

            await document.save();

            await BlockingStatusModel.create({
                name: "PS_SD_4b",
                status: true
            });

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            const redisCert = await FailedOnlineCertificates.findOne({ documentNumber: "GBR-2019-SD-DED9F3FE6" }).lean();
            const relatedCert = await FailedOnlineCertificates.findOne({ documentNumber: "32345" }).lean();

            expect(redisCert.documentNumber).toEqual("GBR-2019-SD-DED9F3FE6");
            expect(relatedCert).toEqual(null);


        });

        describe('When 4B validation is turned on', () => {
            it('will save the failed certificate', async () => {
                const mockedRedisSD = {
                    "catches":[
                        {
                            "product":"Atlantic herring (HER)",
                            "commodityCode":"423523432",
                            "productWeight":"2000",
                            "dateOfUnloading":"01/10/2019",
                            "placeOfUnloading":"351",
                            "transportUnloadedFrom":"234",
                            "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                            "weightOnCC":"1000"
                        },
                        {
                            "product":"Argentine anchovy (ANA)",
                            "commodityCode":"23408230498234",
                            "productWeight":"200",
                            "dateOfUnloading":"09/07/2019",
                            "placeOfUnloading":"DOVER",
                            "transportUnloadedFrom":"234",
                            "certificateNumber":"2",
                            "weightOnCC":"20000"
                        }
                    ],
                    "storageFacilities":[
                        {
                            "facilityName":"11",
                            "facilityAddressOne":"11 Dessert Way",
                            "facilityAddressTwo":"Enyt-No-Nodyalb",
                            "facilityTownCity":"Gateshead",
                            "facilityPostcode":"N32 5PJ"
                        },
                        {
                            "facilityName":"11 THE SECOND",
                            "facilityAddressOne":"11 Dessert Way without water",
                            "facilityAddressTwo":"Enyt-No-Nodyalb",
                            "facilityTownCity":"Gateshead",
                            "facilityPostcode":"N32 5PJ"
                        }
                    ],
                    "validationErrors":[
                        {

                        }
                    ],
                    "addAnotherProduct":"No",
                    "addAnotherStorageFacility":"No",
                    "transport":{
                        "vehicle":"truck",
                        "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                        "journey":"storageNotes",
                        "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                        "cmr":"true"
                    },
                    "exporter":{
                        "exporterCompanyName":"BONZO",
                        "preLoadedCompanyName":true,
                        "exporterFullName":"John Test",
                        "preLoadedName":true,
                        "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                        "postcode":"LE17 5QZ",
                        "townCity":"HARBOROUGH",
                        "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                        "preLoadedAddress":true,
                        "isExporterDetailsSavedAsDraft":false,
                        "journey":"storageNotes",
                        "currentUri":"/create-storage-document/add-exporter-details",
                        "nextUri":"/create-storage-document/add-product-to-this-consignment",
                        "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                    },
                    "documentNumber":"GBR-2019-SD-DED9F3FE6",
                    "user":{
                        "email":"foo@foo.com",
                        "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                    }
                };

                await BlockingStatusModel.create({
                    name: "PS_SD_4b",
                    status: true
                });

                const payload = {
                    dataToValidate: mockedRedisSD
                };

                await generateForeignCatchCertOnlineValidationReport(payload);

                const result = await FailedOnlineCertificates.findOne({ documentNumber: "GBR-2019-SD-DED9F3FE6" }).lean();

                expect(result.documentNumber).toEqual("GBR-2019-SD-DED9F3FE6");


            });

            describe('When the document has been pre approved', () => {
                it('will return an empty validation report', async () => {
                    const data = {
                        "catches": [
                            {
                                "product": "Atlantic herring (HER)",
                                "commodityCode": "423523432",
                                "productWeight": "2000",
                                "dateOfUnloading": "01/10/2019",
                                "placeOfUnloading": "351",
                                "transportUnloadedFrom": "234",
                                "certificateNumber": "FCC051",
                                "weightOnCC": "1000"
                            },
                            {
                                "product": "Argentine anchovy (ANA)",
                                "commodityCode": "23408230498234",
                                "productWeight": "200",
                                "dateOfUnloading": "09/07/2019",
                                "placeOfUnloading": "DOVER",
                                "transportUnloadedFrom": "234",
                                "certificateNumber": "2",
                                "weightOnCC": "20000"
                            }
                        ],
                        "storageFacilities": [
                            {
                                "facilityName": "11",
                                "facilityAddressOne": "11 Dessert Way",
                                "facilityAddressTwo": "Enyt-No-Nodyalb",
                                "facilityTownCity": "Gateshead",
                                "facilityPostcode": "N32 5PJ"
                            },
                            {
                                "facilityName": "11 THE SECOND",
                                "facilityAddressOne": "11 Dessert Way without water",
                                "facilityAddressTwo": "Enyt-No-Nodyalb",
                                "facilityTownCity": "Gateshead",
                                "facilityPostcode": "N32 5PJ"
                            }
                        ],
                        "validationErrors": [
                            {}
                        ],
                        "addAnotherProduct": "No",
                        "addAnotherStorageFacility": "No",
                        "transport": {
                            "vehicle": "truck",
                            "currentUri": "/create-storage-document/do-you-have-a-road-transport-document",
                            "journey": "storageNotes",
                            "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                            "cmr": "true"
                        },
                        "exporter": {
                            "exporterCompanyName": "BONZO",
                            "preLoadedCompanyName": true,
                            "exporterFullName": "John Test",
                            "preLoadedName": true,
                            "addressOne": "UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                            "postcode": "LE17 5QZ",
                            "townCity": "HARBOROUGH",
                            "addressTwo": "UPPER BRUNTINGTHORPE, LUTTERWORTH",
                            "preLoadedAddress": true,
                            "isExporterDetailsSavedAsDraft": false,
                            "journey": "storageNotes",
                            "currentUri": "/create-storage-document/add-exporter-details",
                            "nextUri": "/create-storage-document/add-product-to-this-consignment",
                            "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        },
                        "documentNumber": "GBR-2019-SD-DED9F3FE6",
                        "user": {
                            "email": "foo@foo.com",
                            "principal": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        }
                    };
                    const document = new DocumentModel({
                        "__t": "storageDocument",
                        "documentUri": "http://www.bob.com",
                        "exportData":
                            {
                                "catches": [{
                                    "certificateNumber": "FCC051",
                                    "product": "Atlantic herring (HER)",
                                    "commodityCode": "423523432",
                                    "weightOnCC": 1000,
                                    "productWeight": 1000
                                }]
                            },
                        "createdByEmail": "bob@bob.com",
                        "createdBy": "bob",
                        "createdAt": "2019-01-01T12:00:00.000Z",
                        "documentNumber": "GBR-2019-SD-DED9F3FE6",
                        "status": "DRAFT"
                    });

                    await document.save();

                    await preApproveDocumentFromMongo(data.documentNumber,"Bob");

                    await BlockingStatusModel.create({
                        name: "PS_SD_4b",
                        status: true
                    });

                    const payload = {
                        dataToValidate: data
                    };
                    const result = await generateForeignCatchCertOnlineValidationReport(payload);

                    expect(result.isValid).toEqual(true);
                    expect(result.details).toEqual([]);
                    expect(result.rawData.every(queryRes => queryRes.status === "COMPLETE")).toBeTruthy();

                });

                it('will not persist the failed cert', async () => {
                    const data = {
                        "catches": [
                            {
                                "product": "Atlantic herring (HER)",
                                "commodityCode": "423523432",
                                "productWeight": "200",
                                "dateOfUnloading": "01/10/2019",
                                "placeOfUnloading": "351",
                                "transportUnloadedFrom": "234",
                                "certificateNumber": "FCC051",
                                "weightOnCC": "1000"
                            },
                            {
                                "product": "Argentine anchovy (ANA)",
                                "commodityCode": "23408230498234",
                                "productWeight": "200",
                                "dateOfUnloading": "09/07/2019",
                                "placeOfUnloading": "DOVER",
                                "transportUnloadedFrom": "234",
                                "certificateNumber": "2",
                                "weightOnCC": "20000"
                            }
                        ],
                        "storageFacilities": [
                            {
                                "facilityName": "11",
                                "facilityAddressOne": "11 Dessert Way",
                                "facilityAddressTwo": "Enyt-No-Nodyalb",
                                "facilityTownCity": "Gateshead",
                                "facilityPostcode": "N32 5PJ"
                            },
                            {
                                "facilityName": "11 THE SECOND",
                                "facilityAddressOne": "11 Dessert Way without water",
                                "facilityAddressTwo": "Enyt-No-Nodyalb",
                                "facilityTownCity": "Gateshead",
                                "facilityPostcode": "N32 5PJ"
                            }
                        ],
                        "validationErrors": [
                            {}
                        ],
                        "addAnotherProduct": "No",
                        "addAnotherStorageFacility": "No",
                        "transport": {
                            "vehicle": "truck",
                            "currentUri": "/create-storage-document/do-you-have-a-road-transport-document",
                            "journey": "storageNotes",
                            "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                            "cmr": "true"
                        },
                        "exporter": {
                            "exporterCompanyName": "BONZO",
                            "preLoadedCompanyName": true,
                            "exporterFullName": "John Test",
                            "preLoadedName": true,
                            "addressOne": "UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                            "postcode": "LE17 5QZ",
                            "townCity": "HARBOROUGH",
                            "addressTwo": "UPPER BRUNTINGTHORPE, LUTTERWORTH",
                            "preLoadedAddress": true,
                            "isExporterDetailsSavedAsDraft": false,
                            "journey": "storageNotes",
                            "currentUri": "/create-storage-document/add-exporter-details",
                            "nextUri": "/create-storage-document/add-product-to-this-consignment",
                            "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        },
                        "documentNumber": "GBR-2019-SD-DED9F3FE6",
                        "user": {
                            "email": "foo@foo.com",
                            "principal": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        }
                    };
                    const document = new DocumentModel({
                        "__t": "storageDocument",
                        "documentUri": "http://www.bob.com",
                        "exportData":
                            {
                                "catches": [{
                                    "certificateNumber": "FCC051",
                                    "product": "Atlantic herring (HER)",
                                    "commodityCode": "423523432",
                                    "weightOnCC": 1000,
                                    "productWeight": 1000
                                }]
                            },
                        "createdByEmail": "bob@bob.com",
                        "createdBy": "bob",
                        "createdAt": "2019-01-01T12:00:00.000Z",
                        "documentNumber": "GBR-2019-SD-DED9F3FE6",
                        "status": "DRAFT"
                    });

                    const payload = {
                        dataToValidate: data
                    };

                    await document.save();

                    await preApproveDocumentFromMongo(data.documentNumber,"Bob");

                    await BlockingStatusModel.create({
                        name: "PS_SD_4b",
                        status: true
                    });

                    await generateForeignCatchCertOnlineValidationReport(payload);

                    const redisCert = await FailedOnlineCertificates.findOne({documentNumber: "GBR-2019-SD-DED9F3FE6"}).lean();

                    expect(redisCert).toEqual(null);

                });
            });

            describe('When the document has been pre approved but it is out of date', () => {
                it('will return the failed validation report', async () => {
                    const mockedRedisSD = {
                        "catches":[
                            {
                                "product":"Atlantic herring (HER)",
                                "commodityCode":"423523432",
                                "productWeight":"200",
                                "dateOfUnloading":"01/10/2019",
                                "placeOfUnloading":"351",
                                "transportUnloadedFrom":"234",
                                "certificateNumber":"FCC051",
                                "weightOnCC":"1000"
                            },
                            {
                                "product":"Argentine anchovy (ANA)",
                                "commodityCode":"23408230498234",
                                "productWeight":"200",
                                "dateOfUnloading":"09/07/2019",
                                "placeOfUnloading":"DOVER",
                                "transportUnloadedFrom":"234",
                                "certificateNumber":"2",
                                "weightOnCC":"20000"
                            }
                        ],
                        "storageFacilities":[
                            {
                                "facilityName":"11",
                                "facilityAddressOne":"11 Dessert Way",
                                "facilityAddressTwo":"Enyt-No-Nodyalb",
                                "facilityTownCity":"Gateshead",
                                "facilityPostcode":"N32 5PJ"
                            },
                            {
                                "facilityName":"11 THE SECOND",
                                "facilityAddressOne":"11 Dessert Way without water",
                                "facilityAddressTwo":"Enyt-No-Nodyalb",
                                "facilityTownCity":"Gateshead",
                                "facilityPostcode":"N32 5PJ"
                            }
                        ],
                        "validationErrors":[
                            {

                            }
                        ],
                        "addAnotherProduct":"No",
                        "addAnotherStorageFacility":"No",
                        "transport":{
                            "vehicle":"truck",
                            "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                            "journey":"storageNotes",
                            "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                            "cmr":"true"
                        },
                        "exporter":{
                            "exporterCompanyName":"BONZO",
                            "preLoadedCompanyName":true,
                            "exporterFullName":"John Test",
                            "preLoadedName":true,
                            "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                            "postcode":"LE17 5QZ",
                            "townCity":"HARBOROUGH",
                            "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                            "preLoadedAddress":true,
                            "isExporterDetailsSavedAsDraft":false,
                            "journey":"storageNotes",
                            "currentUri":"/create-storage-document/add-exporter-details",
                            "nextUri":"/create-storage-document/add-product-to-this-consignment",
                            "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        },
                        "documentNumber":"GBR-2019-SD-DED9F3FE6",
                        "user":{
                            "email":"foo@foo.com",
                            "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        }
                    };
                    const document = new DocumentModel(  {
                        "__t":"storageDocument",
                        "documentUri":"http://www.bob.com",
                        "exportData":
                            {
                                "catches":[{
                                    "certificateNumber":"FCC051",
                                    "product":"Atlantic herring (HER)",
                                    "commodityCode":"423523432",
                                    "weightOnCC":1000,
                                    "productWeight":1000
                                }]},
                        "createdByEmail":"bob@bob.com",
                        "createdBy":"bob",
                        "createdAt":"2019-01-01T12:00:00.000Z",
                        "documentNumber":"32345",
                        "status":"COMPLETE"});

                    await document.save();


                    const payload = {
                        dataToValidate: mockedRedisSD
                    };

                    const draftDocument = new DocumentModel(  {
                        "__t":"storageDocument",
                        "documentUri":"http://www.bob.com",
                        "exportData":
                            {
                                "catches":[{
                                    "certificateNumber":"FCC051",
                                    "product":"Atlantic herring (HER)",
                                    "commodityCode":"423523432",
                                    "weightOnCC":1000,
                                    "productWeight":1000
                                }]},
                        "createdByEmail":"bob@bob.com",
                        "createdBy":"bob",
                        "createdAt":"2019-01-01T12:00:00.000Z",
                        "documentNumber":"GBR-2019-SD-DED9F3FE6",
                        "status":"DRAFT"});

                    await draftDocument.save();


                    await preApproveDocumentFromMongo(mockedRedisSD.documentNumber,"Bob");
                    await modifyCertificate(mockedRedisSD.documentNumber)

                    await BlockingStatusModel.create({
                        name: "PS_SD_4b",
                        status: true
                    });

                    const expectedOutput = {
                        isValid: false,
                        details:[ { certificateNumber: 'FCC051', product: 'Atlantic herring (HER)' } ],
                        rawData: [{
                            catchCertificateNumber: "FCC051",
                            commodityCode: "423523432",
                            createdAt: expect.any(String),
                            da: "England",
                            documentNumber: "GBR-2019-SD-DED9F3FE6",
                            documentType: "storageDocument",
                            dateOfUnloading: "01/10/2019",
                            extended: {
                                exporterCompanyName: "BONZO",
                                investigation: undefined,
                                preApprovedBy: undefined,
                                url: undefined,
                                voidedBy: undefined,
                            },
                            isMismatch: false,
                            isOverAllocated: true,
                            overAllocatedByWeight: 200,
                            overUsedInfo:["32345"],
                            placeOfUnloading: "351",
                            species: "Atlantic herring (HER)",
                            status: "BLOCKED",
                            transportUnloadedFrom: "234",
                            weightOnAllDocs: 1200,
                            weightOnDoc: 200,
                            weightOnFCC: 1000,
                        },
                        {
                            catchCertificateNumber: "2",
                            commodityCode: "23408230498234",
                            createdAt: expect.any(String),
                            da: "England",
                            documentNumber: "GBR-2019-SD-DED9F3FE6",
                            documentType: "storageDocument",
                            dateOfUnloading: "09/07/2019",
                            extended: {
                                exporterCompanyName: "BONZO",
                                investigation: undefined,
                                preApprovedBy: undefined,
                                url: undefined,
                                voidedBy: undefined,
                        },
                            isMismatch: false,
                            isOverAllocated: false,
                            overAllocatedByWeight: 0,
                            overUsedInfo: [],
                            placeOfUnloading: "DOVER",
                            species: "Argentine anchovy (ANA)",
                            status: "BLOCKED",
                            transportUnloadedFrom: "234",
                            weightOnAllDocs: 200,
                            weightOnDoc: 200,
                            weightOnFCC: 20000,
                        }]
                    };

                    const result = await generateForeignCatchCertOnlineValidationReport(payload);


                    expect(result).toEqual(expectedOutput);


                });

                it('will persist the failed validation report', async () => {
                    const mockedRedisSD = {
                        "catches":[
                            {
                                "product":"Atlantic herring (HER)",
                                "commodityCode":"423523432",
                                "productWeight":"200",
                                "dateOfUnloading":"01/10/2019",
                                "placeOfUnloading":"351",
                                "transportUnloadedFrom":"234",
                                "certificateNumber":"FCC051",
                                "weightOnCC":"1000"
                            },
                            {
                                "product":"Argentine anchovy (ANA)",
                                "commodityCode":"23408230498234",
                                "productWeight":"200",
                                "dateOfUnloading":"09/07/2019",
                                "placeOfUnloading":"DOVER",
                                "transportUnloadedFrom":"234",
                                "certificateNumber":"2",
                                "weightOnCC":"20000"
                            }
                        ],
                        "storageFacilities":[
                            {
                                "facilityName":"11",
                                "facilityAddressOne":"11 Dessert Way",
                                "facilityAddressTwo":"Enyt-No-Nodyalb",
                                "facilityTownCity":"Gateshead",
                                "facilityPostcode":"N32 5PJ"
                            },
                            {
                                "facilityName":"11 THE SECOND",
                                "facilityAddressOne":"11 Dessert Way without water",
                                "facilityAddressTwo":"Enyt-No-Nodyalb",
                                "facilityTownCity":"Gateshead",
                                "facilityPostcode":"N32 5PJ"
                            }
                        ],
                        "validationErrors":[
                            {

                            }
                        ],
                        "addAnotherProduct":"No",
                        "addAnotherStorageFacility":"No",
                        "transport":{
                            "vehicle":"truck",
                            "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                            "journey":"storageNotes",
                            "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                            "cmr":"true"
                        },
                        "exporter":{
                            "exporterCompanyName":"BONZO",
                            "preLoadedCompanyName":true,
                            "exporterFullName":"John Test",
                            "preLoadedName":true,
                            "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                            "postcode":"LE17 5QZ",
                            "townCity":"HARBOROUGH",
                            "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                            "preLoadedAddress":true,
                            "isExporterDetailsSavedAsDraft":false,
                            "journey":"storageNotes",
                            "currentUri":"/create-storage-document/add-exporter-details",
                            "nextUri":"/create-storage-document/add-product-to-this-consignment",
                            "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        },
                        "documentNumber":"GBR-2019-SD-DED9F3FE6",
                        "user":{
                            "email":"foo@foo.com",
                            "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                        }
                    };
                    const document = new DocumentModel(  {
                        "__t":"storageDocument",
                        "documentUri":"http://www.bob.com",
                        "exportData":
                            {
                                "catches":[{
                                    "certificateNumber":"FCC051",
                                    "product":"Atlantic herring (HER)",
                                    "commodityCode":"423523432",
                                    "weightOnCC":1000,
                                    "productWeight":1000
                                }]},
                        "createdByEmail":"bob@bob.com",
                        "createdBy":"bob",
                        "createdAt":"2019-01-01T12:00:00.000Z",
                        "documentNumber":"32345",
                        "status":"COMPLETE"});

                    const payload = {
                        dataToValidate: mockedRedisSD
                    };

                    await document.save();




                    const draftDocument = new DocumentModel(  {
                        "__t":"storageDocument",
                        "documentUri":"http://www.bob.com",
                        "exportData":
                            {
                                "catches":[{
                                    "certificateNumber":"FCC051",
                                    "product":"Atlantic herring (HER)",
                                    "commodityCode":"423523432",
                                    "weightOnCC":1000,
                                    "productWeight":1000
                                }]},
                        "createdByEmail":"bob@bob.com",
                        "createdBy":"bob",
                        "createdAt":"2019-01-01T12:00:00.000Z",
                        "documentNumber":"GBR-2019-SD-DED9F3FE6",
                        "status":"DRAFT"});

                    await draftDocument.save();


                    await preApproveDocumentFromMongo(mockedRedisSD.documentNumber,"Bob");
                    await modifyCertificate(mockedRedisSD.documentNumber)

                    await BlockingStatusModel.create({
                        name: "PS_SD_4b",
                        status: true
                    });

                    await generateForeignCatchCertOnlineValidationReport(payload);
                    const redisCert = await FailedOnlineCertificates.findOne({ documentNumber: "GBR-2019-SD-DED9F3FE6" }).lean();

                    expect(redisCert.documentNumber).toEqual("GBR-2019-SD-DED9F3FE6");


                });
            });
        });

        describe('When 4B validation is turned off', () => {
            it('will mark the status of the document as COMPLETE', async () => {
                const data = {
                    "catches": [
                        {
                            "product": "Atlantic herring (HER)",
                            "commodityCode": "423523432",
                            "productWeight": "2000",
                            "dateOfUnloading": "01/10/2019",
                            "placeOfUnloading": "351",
                            "transportUnloadedFrom": "234",
                            "certificateNumber": "FCC051",
                            "weightOnCC": "1000"
                        },
                        {
                            "product": "Argentine anchovy (ANA)",
                            "commodityCode": "23408230498234",
                            "productWeight": "200",
                            "dateOfUnloading": "09/07/2019",
                            "placeOfUnloading": "DOVER",
                            "transportUnloadedFrom": "234",
                            "certificateNumber": "2",
                            "weightOnCC": "20000"
                        }
                    ],
                    "storageFacilities": [
                        {
                            "facilityName": "11",
                            "facilityAddressOne": "11 Dessert Way",
                            "facilityAddressTwo": "Enyt-No-Nodyalb",
                            "facilityTownCity": "Gateshead",
                            "facilityPostcode": "N32 5PJ"
                        },
                        {
                            "facilityName": "11 THE SECOND",
                            "facilityAddressOne": "11 Dessert Way without water",
                            "facilityAddressTwo": "Enyt-No-Nodyalb",
                            "facilityTownCity": "Gateshead",
                            "facilityPostcode": "N32 5PJ"
                        }
                    ],
                    "validationErrors": [
                        {}
                    ],
                    "addAnotherProduct": "No",
                    "addAnotherStorageFacility": "No",
                    "transport": {
                        "vehicle": "truck",
                        "currentUri": "/create-storage-document/do-you-have-a-road-transport-document",
                        "journey": "storageNotes",
                        "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                        "cmr": "true"
                    },
                    "exporter": {
                        "exporterCompanyName": "BONZO",
                        "preLoadedCompanyName": true,
                        "exporterFullName": "John Test",
                        "preLoadedName": true,
                        "addressOne": "UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                        "postcode": "LE17 5QZ",
                        "townCity": "HARBOROUGH",
                        "addressTwo": "UPPER BRUNTINGTHORPE, LUTTERWORTH",
                        "preLoadedAddress": true,
                        "isExporterDetailsSavedAsDraft": false,
                        "journey": "storageNotes",
                        "currentUri": "/create-storage-document/add-exporter-details",
                        "nextUri": "/create-storage-document/add-product-to-this-consignment",
                        "user_id": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                    },
                    "documentNumber": "GBR-2019-SD-DED9F3FE6",
                    "user": {
                        "email": "foo@foo.com",
                        "principal": "ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                    }
                };

                const document = new DocumentModel({
                    "__t": "storageDocument",
                    "documentUri": "http://www.bob.com",
                    "exportData":
                        {
                            "catches": [{
                                "certificateNumber": "FCC051",
                                "product": "Atlantic herring (HER)",
                                "commodityCode": "423523432",
                                "weightOnCC": 1000,
                                "productWeight": 1000
                            }]
                        },
                    "createdByEmail": "bob@bob.com",
                    "createdBy": "bob",
                    "createdAt": "2019-01-01T12:00:00.000Z",
                    "documentNumber": "GBR-2019-SD-DED9F3FE6",
                    "status": "DRAFT"
                });

                await document.save();

                await BlockingStatusModel.create({
                    name: "PS_SD_4b",
                    status: false
                });

                const payload = {
                    dataToValidate: data
                };

                const result = await generateForeignCatchCertOnlineValidationReport(payload);

                expect(result.rawData.every(queryRes => queryRes.status === "COMPLETE")).toBeTruthy();
            });
        });
    });

    describe('When a certificate is valid', () => {
    it('will not save the certificate', async () => {
            const mockedRedisSD = {
                "catches":[
                    {
                        "product":"Atlantic herring (HER)",
                        "commodityCode":"423523432",
                        "productWeight":"100",
                        "dateOfUnloading":"01/10/2019",
                        "placeOfUnloading":"351",
                        "transportUnloadedFrom":"234",
                        "certificateNumber":"fasdfnasdfjasdfjaisdf8asdf8as",
                        "weightOnCC":"1000"
                    }
                ],
                "storageFacilities":[
                    {
                        "facilityName":"11",
                        "facilityAddressOne":"11 Dessert Way",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    },
                    {
                        "facilityName":"11 THE SECOND",
                        "facilityAddressOne":"11 Dessert Way without water",
                        "facilityAddressTwo":"Enyt-No-Nodyalb",
                        "facilityTownCity":"Gateshead",
                        "facilityPostcode":"N32 5PJ"
                    }
                ],
                "validationErrors":[
                    {

                    }
                ],
                "addAnotherProduct":"No",
                "addAnotherStorageFacility":"No",
                "transport":{
                    "vehicle":"truck",
                    "currentUri":"/create-storage-document/do-you-have-a-road-transport-document",
                    "journey":"storageNotes",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12",
                    "cmr":"true"
                },
                "exporter":{
                    "exporterCompanyName":"BONZO",
                    "preLoadedCompanyName":true,
                    "exporterFullName":"John Test",
                    "preLoadedName":true,
                    "addressOne":"UNIT 156, JASMIN ROADWAYS, BRUNTINGTHORPE INDUSTRIAL ESTATE",
                    "postcode":"LE17 5QZ",
                    "townCity":"HARBOROUGH",
                    "addressTwo":"UPPER BRUNTINGTHORPE, LUTTERWORTH",
                    "preLoadedAddress":true,
                    "isExporterDetailsSavedAsDraft":false,
                    "journey":"storageNotes",
                    "currentUri":"/create-storage-document/add-exporter-details",
                    "nextUri":"/create-storage-document/add-product-to-this-consignment",
                    "user_id":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                },
                "documentNumber":"GBR-2019-SD-DED9F3FE6",
                "user":{
                    "email":"foo@foo.com",
                    "principal":"ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12"
                }
            };

            const payload = {
                dataToValidate: mockedRedisSD
            };

            await generateForeignCatchCertOnlineValidationReport(payload);

            const result = await FailedOnlineCertificates.findOne({ documentNumber: "GBR-2019-SD-DED9F3FE6" }).lean();

            expect(result).toEqual(null);

        });

    });
});

const modifyCertificate = async (documentNumber : string) => {


    await DocumentModel.findOneAndUpdate(
      {
        documentNumber: documentNumber
      },
      { audit: [],
          __t: 'storageDocument',
          status: 'DRAFT',
          documentNumber: documentNumber,
          exportData:{
            "catches":[{
                "certificateNumber":"FCC051",
                "product":"Atlantic herring (HER)",
                "commodityCode":"423523432",
                "weightOnCC":33,
                "productWeight":333
            }]}}
    )
}