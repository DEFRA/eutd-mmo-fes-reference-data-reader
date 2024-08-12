const mongoose = require('mongoose');


import { MongoMemoryServer } from 'mongodb-memory-server';
import { DocumentModel } from '../../src/landings/types/document'
import { DocumentStatuses } from '../../src/landings/types/document';
import { AddAudit } from '../../src/services/audit.service';
import { IAuditEvent, AuditEventTypes } from '../../src/landings/types/auditEvent';

describe('add audit event', () => {

  let mongoServer;
  const documentNumber = "GBR-TEST-AFJ";
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
    await DocumentModel.deleteMany({});

    await DocumentModel.create({
      __t: 'processingStatement',
      documentNumber: documentNumber,
      status: DocumentStatuses.Complete,
      createdAt: "2019-07-10T08:26:06.939Z",
      createdBy: "Bob",
      createdByEmail: "foo@foo.com"
    });
  });

  it('can add an audit event to a document', async () => {
    const auditEvent : IAuditEvent = {
      eventType: AuditEventTypes.Investigated,
      triggeredBy: "joe.bloggs@example.com",
      timestamp: new Date(),
      data: {
        test: "dummy"
      }
    };

    await AddAudit(documentNumber, auditEvent);

    const result : any = await DocumentModel.findOne({documentNumber: documentNumber});

    expect(result['audit'][0]).toStrictEqual(auditEvent);
  });

  it('can add multiple audit events to a document', async () => {
		const auditEvent1 : IAuditEvent = {
      eventType: AuditEventTypes.Investigated,
      triggeredBy: "joe.bloggs1@example.com",
      timestamp: new Date(),
      data: null
    };

    const auditEvent2 : IAuditEvent = {
      eventType: AuditEventTypes.Investigated,
      triggeredBy: "joe.bloggs2@example.com",
      timestamp: new Date(),
      data: {
        test: "test"
      }
    };

    await AddAudit(documentNumber, auditEvent1);
    await AddAudit(documentNumber, auditEvent2);

    const result : any = await DocumentModel.findOne({documentNumber: documentNumber});

    expect(result['audit'][0]).toStrictEqual(auditEvent1);
    expect(result['audit'][1]).toStrictEqual(auditEvent2);
  });

});

