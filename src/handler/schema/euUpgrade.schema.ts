import * as Joi from 'joi';

/**
 * Joi validation schema for EU Upgrade callback from BOOMI
 * Validates the SOAP envelope structure for both success and failure responses
 */
export const euUpgradeCallbackSchema = Joi.object({
  Envelope: Joi.object({
    Header: Joi.object({
      Message: Joi.object({
        severity: Joi.string().required(),
        ID: Joi.string().required(),
        Message: Joi.string().required(),
      }).required(),
      Security: Joi.object({
        TimestampType: Joi.object({
          Created: Joi.string().required(),
          Expires: Joi.string().required(),
        }).required(),
      }).optional(),
    }).required(),
    Body: Joi.object({
      SubmitCatchResponse: Joi.object({
        SPSAcknowledgement: Joi.object({
          SPSAcknowledgementDocument: Joi.object({
            IssueDateTime: Joi.object({
              DateTime: Joi.string().required(),
            }).required(),
            StatusCode: Joi.object({
              name: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
            ReasonInformation: Joi.string().required(),
            fesDocNumber: Joi.string().required(),
            ReferenceSPSReferencedDocument: Joi.object({
              TypeCode: Joi.object({
                name: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              RelationshipTypeCode: Joi.object({
                name: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              ID: Joi.string().required(),
              AttachmentBinaryObject: Joi.object({
                format: Joi.string().required(),
                mimeCode: Joi.string().required(),
                uri: Joi.string().required(),
              }).required(),
            }).required(),
          }).required(),
        }).required(),
      }).optional(),
      Fault: Joi.object({
        faultcode: Joi.string().required(),
        faultstring: Joi.string().required(),
        fesDocNumber: Joi.string().required(),
        detail: Joi.object({
          BusinessRulesValidationException: Joi.object({
            Error: Joi.array()
              .items(
                Joi.object({
                  ID: Joi.string().required(),
                  Message: Joi.object({
                    languageID: Joi.string().required(),
                    text: Joi.string().required(),
                  }).required(),
                  Field: Joi.object({
                    languageID: Joi.string().required(),
                    text: Joi.string().allow('').required(),
                  }).required(),
                }),
              )
              .min(1)
              .required(),
          }).required(),
        }).optional(),
      }).optional(),
    })
      .required()
      .xor('SubmitCatchResponse', 'Fault'), // Ensure exactly one is present
  }).required(),
});
