import * as Hapi from '@hapi/hapi';
import axios from 'axios';
import logger from '../logger';
import { getCertificateByPdfReference, upsertCertificate, getCatchCerts } from '../landings/persistence/catchCert';
import { AddAudit } from "../services/audit.service";
import { DocumentStatuses, Investigation } from '../landings/types/document';
import { IAuditEvent, AuditEventTypes } from '../landings/types/auditEvent';
import * as Joi from "joi";
import { getAllDocuments } from '../landings/persistence/storeDocProcStat';
import { SSL_OP_LEGACY_SERVER_CONNECT } from "constants";
import { StatusPayload } from './types/certificates';

const https = require('https');

const updateBusinessContinuity = (documentNumber) => {

  const BUSINESS_CONTINUITY_KEY = process.env.BUSINESS_CONTINUITY_KEY || '17f9c1b9-6968-478a-a7c3-dad1dc99bd57';
  const BUSINESS_CONTINUITY_URL = process.env.BUSINESS_CONTINUITY_URL || 'https://dev-check-export-certificate.marineservices.org.uk';

  const data = {
    "certNumber": documentNumber,
    "timestamp": new Date().toISOString().toString(),
    "status": "VOID"
  }

  const agent = new https.Agent({
    secureOptions: SSL_OP_LEGACY_SERVER_CONNECT
  });

  const config = {
    headers: {
      'X-API-KEY': BUSINESS_CONTINUITY_KEY,
      'accept': 'application/json'
    },
    httpsAgent: agent
  }

  axios.put(`${BUSINESS_CONTINUITY_URL}/api/certificates/${documentNumber}`, data, config)
    .then(() => logger.info('Data sent to BC server'))
    .catch(err => logger.error(`Error - Data not sent to BC server: ${err}`));

}

export const certificateRoutes = (server: Hapi.Server) => server.route([
  {
    method: 'GET',
    path: '/v1/certificates',
    options: { security: true },
    handler: async (req, h) => {
      const query = req.query;
      const pdfReference = query.pdfReference

      if (pdfReference) {
        try {
          const certificate = await getCertificateByPdfReference(pdfReference)
          if (certificate) {
            logger.info(`[GET-CERTIFICATE][${pdfReference}][SUCCESS]`)
            return h.response(certificate).type('application/json')
          }
          else {
            logger.info(`[GET-CERTIFICATE][${pdfReference}][NOT-FOUND]`)
            return h.response().code(404)
          }
        } catch (e) {
          logger.error({ err: e }, `[GET-CERTIFICATE][${pdfReference}][ERROR] ${e}`)
          return h.response().code(500)
        }
      }
      logger.info(`[GET-CERTIFICATE][NOT-FOUND]`)
      return h.response().code(404)
    }
  },
  {
    method: 'PATCH',
    path: '/v1/certificates/{documentNumber}',
    options: {
      security: true,
      validate: {
        headers: Joi.object({
          "x-admin-user": Joi.string().min(1).required()
        }),
        options: {
          allowUnknown: true
        }
      }
    },
    handler: async (req, h) => {
      const parameters = req.params;
      if (parameters.documentNumber) {
        try {
          const user = req.headers["x-admin-user"];

          const payload = req.payload as StatusPayload
          switch (true) {
            case (payloadValidForVoid(payload)): return await markCertificateAsVoided(parameters.documentNumber, payload, user, h);
            case (payloadValidForInvestigate(payload)): return await markCertificateAsInvestigated(parameters.documentNumber, user, payload.investigationStatus, h);
          }
        } catch (e) {
            logger.info(`[UPDATING-CERTIFICATE][${parameters.documentNumber}][ERROR][${e.stack || e}]`)
            return h.response(e.message).code(500);
        }
      }
      return h.response().code(400)
    }
  }
]);

export const payloadValidForVoid = (payload: any) => {
  return payload &&
    Object.keys(payload).length == 1 &&
    Object.hasOwn(payload, "status") &&
    payload.status === DocumentStatuses.Void;
}

export const payloadValidForInvestigate = (payload: any) => {
  return payload &&
    Object.keys(payload).length == 1 &&
    Object.hasOwn(payload, "investigationStatus") &&
    payload.investigationStatus.length > 0
}

export const auditCertificateUpdate = async (documentNumber: string, user: string, eventType: string, data: any = undefined) => {
  const auditEvent: IAuditEvent = {
    eventType: eventType,
    triggeredBy: user,
    timestamp: new Date(Date.now()),
    data: data
  }

  return await AddAudit(documentNumber, auditEvent);
}

const isVoidedCert = async (documentNumber) => {
  const query = { documentStatus: DocumentStatuses.Void, documentNumber: documentNumber };
  const result = (documentNumber.toUpperCase().includes('-CC-')) ? await getCatchCerts(query) : await getAllDocuments(query)

  return result.length > 0
}

const isDraftCert = async (documentNumber: string) => {
  const query = { documentStatus: DocumentStatuses.Draft, documentNumber: documentNumber };
  const result = (documentNumber.toUpperCase().includes('-CC-')) ? await getCatchCerts(query) : await getAllDocuments(query)

  return result.length > 0
}

const isPendingCert = async (documentNumber: string) => {
  if (documentNumber.toUpperCase().includes('-CC-')) {
    const query = { documentStatus: DocumentStatuses.Pending, documentNumber: documentNumber };
    const result = await getCatchCerts(query);

    return result.length > 0
  }

  return false
}

const markCertificateAsVoided = async (documentNumber, payload, user, h) => {
  const isAlreadyVoided = await isVoidedCert(documentNumber);

  if (isAlreadyVoided) {
    logger.info(`[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][ALREADY-VOIDED]`)
    return h.response().code(404);
  }

  const isDraft = await isDraftCert(documentNumber);

  if (isDraft) {
    logger.info(`[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][IS-DRAFT-DOCUMENT]`)
    return h.response().code(404);
  }

  const isPending = await isPendingCert(documentNumber);

  if (isPending) {
    logger.info(`[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][IS-PENDING-DOCUMENT]`)
    return h.response().code(404);
  }

  const result = await upsertCertificate(documentNumber, payload);

  if (result) {
    logger.info(`[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][SUCCESS]`)
    await auditCertificateUpdate(documentNumber, user, AuditEventTypes.Voided);
    updateBusinessContinuity(documentNumber)
    return h.response().code(200)
  } else {
    logger.info(`[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][NOT-FOUND]`)
    return h.response().code(404)
  }
}

const markCertificateAsInvestigated = async (documentNumber, user, investigationStatus, h) => {
  const investigation: Investigation = {
    investigator: user,
    status: investigationStatus
  }

  const isDraft = await isDraftCert(documentNumber);

  if (isDraft) {
    logger.info(`[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][IS-DRAFT-DOCUMENT]`)
    return h.response().code(404);
  }

  const isPending = await isPendingCert(documentNumber);

  if (isPending) {
    logger.info(`[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][IS-PENDING-DOCUMENT]`)
    return h.response().code(404);
  }


  const result = await upsertCertificate(documentNumber, { investigation: investigation });
  if (result) {
    logger.info(`[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][SUCCESS]`)
    await auditCertificateUpdate(documentNumber, user, AuditEventTypes.Investigated, { investigationStatus: investigationStatus });
    return h.response().code(200);
  } else {
    logger.info(`[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][NOT-FOUND]`)
    return h.response().code(404);
  }
}