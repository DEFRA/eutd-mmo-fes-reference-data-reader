import * as Hapi from '@hapi/hapi';
import logger from '../logger';
import { generateOnlineValidationReport } from '../landings/orchestration/ccOnlineReport';
import { generateForeignCatchCertOnlineValidationReport } from "../landings/orchestration/sdpsOnlineReport";
import { PayloadWithDataToValidate } from './types/onlineValidation';

export const onlineValidationRoutes = (server: Hapi.Server) =>

    server.route([
        {
            method: 'POST',
            path: '/v1/catchcertificates/validation/online',
            options: { security: true },
            handler: async (req, h) => {

                const payload = req.payload as PayloadWithDataToValidate;

                try {
                    if (payload && isValidPayload(payload)) {
                        logger.info(`[ONLINE-VALIDATION-REPORT][HANDLER][${payload.dataToValidate.documentNumber}]`);
                        const onlineValidationReport = await generateOnlineValidationReport(payload);
                        logger.info(`[ONLINE-VALIDATION-REPORT][SUCCESS][OUTPUT][${JSON.stringify(onlineValidationReport)}]`)
                        return h.response(onlineValidationReport).code(200);
                    } else {
                        logger.info(`[ONLINE-VALIDATION-REPORT][INVALID-PAYLOAD]`)
                        return h.response().code(400)
                    }
                } catch(e)  {
                    logger.error({err:e}, `[ONLINE-VALIDATION-REPORT][ERROR] ${e}`)
                    return h.response().code(500)
                }

            }
        },
        {
            method: 'POST',
            path: '/v1/sdps/validation/online',
            options: { security: true },
            handler: async (req, h) => {

                const payload = req.payload as PayloadWithDataToValidate;
                try {
                    if (payload && isValidPayload(payload)) {

                        const onlineValidationReport = await generateForeignCatchCertOnlineValidationReport(payload);

                        return h.response(onlineValidationReport).code(200)
                    } else {
                        logger.info(`[SDPS-VALIDATION][INVALID-PAYLOAD]`);
                        return h.response().code(400)
                    }
                } catch(e)  {
                    logger.error({err:e}, `[SDPS-VALIDATION][ERROR] ${e}`);
                    return h.response().code(500)
                }

            }
        }
    ]);

const isValidPayload = payload => payload.dataToValidate;
