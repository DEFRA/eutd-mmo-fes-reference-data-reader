import * as Joi from 'joi';

export const processingStatementSubmissionPayloadSchema = Joi.object({
  CreateCatchProcessingStatementRequest: Joi.object({
    SPSCertificate: Joi.object({
      SPSExchangedDocument: Joi.object({
        Name: Joi.object({
          languageID: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        Description: Joi.object({
          value: Joi.string().allow('').required(),
        }).required(),
        ID: Joi.object({
          value: Joi.string().required(),
        }).required(),
        TypeCode: Joi.object({
          listID: Joi.string().required(),
          listAgencyID: Joi.string().required(),
          listVersionID: Joi.string().required(),
          name: Joi.string().required(),
          listURI: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        StatusCode: Joi.object({
          listID: Joi.string().required(),
          listAgencyID: Joi.string().required(),
          listVersionID: Joi.string().required(),
          name: Joi.string().required(),
          listURI: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        IssueDateTime: Joi.object({
          DateTime: Joi.object({
            value: Joi.string().required(),
          }).required(),
        }).required(),
        IssuerSPSParty: Joi.object({
          Name: Joi.object({
            languageID: Joi.string().required(),
            value: Joi.string().required(),
          }).required(),
          RoleCode: Joi.object({
            value: Joi.string().required(),
          }).required(),
        }).required(),
        ReferenceSPSReferencedDocument: Joi.array()
          .items(
            Joi.object({
              TypeCode: Joi.object({
                value: Joi.string().optional(),
                name: Joi.string().optional(),
              }).required(),
              RelationshipTypeCode: Joi.object({
                value: Joi.string().required(),
              }).required(),
              ID: Joi.object({
                value: Joi.string().optional(),
                schemeAgencyID: Joi.string().optional(),
              }).optional(),
              IssueDateTime: Joi.object({
                value: Joi.string().optional(),
              }).optional(),
            })
          )
          .required(),
        SignatorySPSAuthentication: Joi.array()
          .items(
            Joi.object({
              TypeCode: Joi.object({
                value: Joi.string().required(),
              }).required(),
              ActualDateTime: Joi.object({
                DateTime: Joi.object({
                  value: Joi.string().required(),
                }).required(),
              }).required(),
              ProviderSPSParty: Joi.object({
                Name: Joi.object({
                  value: Joi.string().optional(),
                  languageID: Joi.string().optional(),
                }).required(),
                RoleCode: Joi.object({
                  value: Joi.string().required(),
                }).required(),
                SpecifiedSPSPerson: Joi.object({
                  Name: Joi.object({
                    value: Joi.string().optional(),
                    languageID: Joi.string().optional(),
                  }).required(),
                  AttainedSPSQualification: Joi.object({
                    Name: Joi.object({
                      value: Joi.string().allow('').required(),
                    }).required(),
                  }).optional(),
                }).required(),
              }).required(),
              IncludedSPSClause: Joi.object({
                Content: Joi.object({
                  value: Joi.string().allow('').required(),
                }).required(),
              }).optional(),
            })
          )
          .required(),
        SPSConsignment: Joi.object({
          ConsignorSPSParty: Joi.object({
            ID: Joi.object({
              value: Joi.string().required(),
            }).optional(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
            RoleCode: Joi.object({
              value: Joi.string().required(),
            }).required(),
            SpecifiedSPSAddress: Joi.object({
              LineOne: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              CityName: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              PostcodeCode: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              CountryID: Joi.object({
                value: Joi.string().required(),
              }).required(),
              CountryName: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
            }).required(),
          }).required(),
          ConsigneeSPSParty: Joi.object({
            ID: Joi.object({
              value: Joi.string().required(),
            }).optional(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
            RoleCode: Joi.object({
              value: Joi.string().required(),
            }).required(),
            SpecifiedSPSAddress: Joi.object({
              LineOne: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              CityName: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              PostcodeCode: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              CountryID: Joi.object({
                value: Joi.string().required(),
              }).required(),
              CountryName: Joi.object({
                languageID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
            }).required(),
          }).required(),
          ExportSPSCountry: Joi.object({
            ID: Joi.object({
              schemeAgencyID: Joi.string().required(),
              value: Joi.string().required(),
            }).optional(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              languageLocaleID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
          }).required(),
          LoadingBaseportSPSLocation: Joi.object({
            ID: Joi.object({
              schemeID: Joi.string().required(),
              value: Joi.string().required(),
            }).optional(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              languageLocaleID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
          }).required(),
          ImportSPSCountry: Joi.object({
            ID: Joi.object({
              value: Joi.string().required(),
            }).required(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
          }).required(),
          UnloadingBaseportSPSLocation: Joi.object({
            ID: Joi.object({
              schemeID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
            Name: Joi.object({
              languageID: Joi.string().required(),
              languageLocaleID: Joi.string().required(),
              value: Joi.string().required(),
            }).required(),
          }).required(),
          ExaminationSPSEvent: Joi.object({
            OccurrenceSPSLocation: Joi.object({
              Name: Joi.object({
                value: Joi.string().allow('').required(),
              }).required(),
            }).required(),
          }).required(),
          IncludedSPSConsignmentItem: Joi.object({
            IncludedSPSTradeLineItem: Joi.object({
              SequenceNumeric: Joi.object({
                format: Joi.string().required(),
                value: Joi.number().required(),
              }).required(),
              Description: Joi.object({
                languageID: Joi.string().required(),
                languageLocaleID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              NetWeightMeasure: Joi.object({
                unitCode: Joi.string().required(),
                unitCodeListVersionID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              GrossWeightMeasure: Joi.object({
                unitCode: Joi.string().required(),
                unitCodeListVersionID: Joi.string().required(),
                value: Joi.string().required(),
              }).required(),
              AdditionalInformationSPSNote: Joi.array()
                .items(
                  Joi.object({
                    Content: Joi.object({
                      languageID: Joi.string().required(),
                      value: Joi.string().required(),
                    }).required(),
                    SubjectCode: Joi.object({
                      value: Joi.string().required(),
                    }).required(),
                  })
                )
                .required(),
              ApplicableSPSClassification: Joi.object({
                SystemID: Joi.object({
                  value: Joi.string().required(),
                }).required(),
                SystemName: Joi.object({
                  languageID: Joi.string().required(),
                  languageLocaleID: Joi.string().required(),
                  value: Joi.string().required(),
                }).required(),
                ClassCode: Joi.object({
                  value: Joi.string().required(),
                }).required(),
                ClassName: Joi.object({
                  languageID: Joi.string().required(),
                  languageLocaleID: Joi.string().required(),
                  value: Joi.string().required(),
                }).required(),
              }).required(),
            }).required(),
          }).required(),
        }).required(),
      }).required(),
    }).required(),
  }).required(),
});
