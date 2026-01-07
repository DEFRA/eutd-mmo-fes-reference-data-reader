import * as Joi from 'joi';

export const catchSubmissionPayloadSchema = Joi.object({
  CreateCatchCertificateRequest: Joi.object({
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
          schemeAgencyID: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        TypeCode: Joi.object({
          name: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        StatusCode: Joi.object({
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
                value: Joi.string().required(),
              }).required(),
              RelationshipTypeCode: Joi.object({
                value: Joi.string().required(),
              }).required(),
              ID: Joi.object({
                value: Joi.string().required(),
              }).required(),
            })
          )
          .required(),
        SignatorySPSAuthentication: Joi.object({
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
              value: Joi.string().allow('').required(),
            }).required(),
            RoleCode: Joi.object({
              value: Joi.string().required(),
            }).required(),
            SpecifiedSPSPerson: Joi.object({
              Name: Joi.object({
                value: Joi.string().allow('').required(),
              }).required(),
              AttainedSPSQualification: Joi.object({
                Name: Joi.object({
                  value: Joi.string().allow('').required(),
                }).required(),
              }).required(),
            }).required(),
          }).required(),
          IncludedSPSClause: Joi.object({
            Content: Joi.object({
              value: Joi.string().allow('').required(),
            }).required(),
          }).required(),
        }).required(),
        IncludedSPSNote: Joi.array()
          .items(
            Joi.object({
              Content: Joi.object({
                languageID: Joi.string().optional(),
                value: Joi.string().allow('').required(),
              }).required(),
              SubjectCode: Joi.object({
                value: Joi.string().required(),
              }).required(),
            })
          ).required()
      }).required(),
      SPSConsignment: Joi.object({
        ConsignorSPSParty: Joi.object({
          ID: Joi.object({
            value: Joi.string().required(),
          }).required(),
          Name: Joi.object({
            languageID: Joi.string().required(),
            value: Joi.string().required(),
          }).required(),
          RoleCode: Joi.object({
            name: Joi.string().required(),
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
          Name: Joi.object({
            value: Joi.string().allow('').required(),
          }).required(),
          RoleCode: Joi.object({
            value: Joi.string().required(),
          }).required(),
        }).required(),
        ExportSPSCountry: Joi.object({
          ID: Joi.object({
            schemeAgencyID: Joi.string().required(),
            value: Joi.string().required(),
          }).required(),
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
          }).required(),
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
        MainCarriageSPSTransportMovement: Joi.array()
          .items(Joi.object({
          ID: Joi.object({
            schemeID: Joi.string().required(),
            value: Joi.string().allow('').required(),
          }).required(),
          ModeCode: Joi.object({
            name: Joi.string().required(),
            value: Joi.string().required(),
          }).required(),
          UsedSPSTransportMeans: Joi.object({
            Name: Joi.object({
              languageID: Joi.string().required(),
              languageLocaleID: Joi.string().required(),
              value: Joi.string().allow('').required(),
            }).required(),
          }).required(),
        })).optional(),
        UtilizedSPSTransportEquipment: Joi.array()
          .items(Joi.object({
          ID: Joi.object({
            schemeID: Joi.string().required(),
            value: Joi.string().allow('').required(),
          }).required(),
        })).required(),
        IncludedSPSConsignmentItem: Joi.array()
          .items(
            Joi.object({
              NatureIdentificationSPSCargo: Joi.object({
                TypeCode: Joi.object({
                  value: Joi.string().required(),
                }).required(),
              }).required(),
              IncludedSPSTradeLineItem: Joi.object({
                SequenceNumeric: Joi.object({
                  format: Joi.string().required(),
                  value: Joi.number().required(),
                }).required(),
                Description: Joi.object({
                  languageID: Joi.string().required(),
                  value: Joi.string().allow('').required(),
                }).when('..NatureIdentificationSPSCargo.TypeCode.value', {
                  is: '12',
                  then: Joi.object({
                    languageID: Joi.string().required(),
                    languageLocaleID: Joi.string().optional(),
                    value: Joi.string().allow('').required(),
                  }),
                }),
                CommonName: Joi.object({
                  value: Joi.string().allow('').required(),
                }).optional(),
                NetWeightMeasure: Joi.object({
                  unitCode: Joi.string().required(),
                  value: Joi.string().required(),
                }).optional(),
                AdditionalInformationSPSNote: Joi.array()
                  .items(
                    Joi.object({
                      Content: Joi.object({
                        languageID: Joi.string().optional(),
                        value: Joi.string().allow('').required(),
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
                    value: Joi.string().required(),
                  }).required(),
                  ClassCode: Joi.object({
                    value: Joi.string().required(),
                  }).required(),
                  ClassName: Joi.object({
                    languageID: Joi.string().required(),
                    value: Joi.string().required(),
                  }).required(),
                }).optional(),
              }).required(),
            })
          )
          .required(),
      }).required(),
    }).required(),
  }).required(),
});
