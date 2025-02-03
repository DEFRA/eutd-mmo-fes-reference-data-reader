import * as catchCert from '../../src/landings/persistence/catchCert';
import * as sdps from '../../src/landings/persistence/storeDocProcStat'
import { DocumentStatuses } from '../../src/landings/types/document';
import { AuditEventTypes,InvestigationStatus } from '../../src/landings/types/auditEvent';
import * as Certificates from '../../src/handler/certificates';
import * as Hapi from '@hapi/hapi';
import * as Joi from 'joi';
import logger from '../../src/logger';

let getMock: jest.SpyInstance;
let updateMock: jest.SpyInstance;
let getCCDocumentMock: jest.SpyInstance;
let getSDPSDocumentMock: jest.SpyInstance;
let loggerMock: jest.SpyInstance;

let auditMock: jest.SpyInstance;

const documentNumber = "GBR-CC-AZR-TEST";
const user = "user@example.com";

let server;

beforeAll(async () => {
  server = Hapi.server({
    port: 9009,
    host: 'localhost'
  });

  Certificates.certificateRoutes(server);

  server.validator(Joi);

  await server.initialize();
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  getMock = jest.spyOn(catchCert, 'getCertificateByPdfReference');
  updateMock = jest.spyOn(catchCert, 'upsertCertificate');
  getCCDocumentMock = jest.spyOn(catchCert, 'getCatchCerts');
  getSDPSDocumentMock = jest.spyOn(sdps, 'getAllDocuments');
  loggerMock = jest.spyOn(logger, 'info');

  auditMock = jest.spyOn(Certificates, 'auditCertificateUpdate');
})

describe('When getting a certificate', () => {

  it('will return a valid certificate', async () => {

    getMock.mockReset()
    getMock.mockResolvedValueOnce({a: 'certificate'})

    const req = {
      method: 'GET',
      url: '/v1/certificates?pdfReference=GBR-AZR-TEST'
    }

    const response = await server.inject(req)

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload || {})

    expect(payload).toEqual({a: 'certificate'})


  })

  it('will return NOT FOUND for an invalid certificate', async () => {

    getMock.mockReset()
    getMock.mockResolvedValueOnce(null)

    const req = {
      method: 'GET',
      url: '/v1/certificates?pdfReference=GBR-AZR-TEST'
    }

    const response = await server.inject(req)

    expect(response.statusCode).toBe(404)


  })

  it('will return NOT FOUND when there is no documentNumber', async () => {
      const req = {
              method: 'GET',
              url: '/v1/certificates'
          };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

  })

  it('something goes wrong when voiding the certificate', async () => {
    getMock.mockReset()
    getMock.mockImplementationOnce(() => {
      throw new Error();
    })

    const req = {
        method: 'GET',
        url: '/v1/certificates?pdfReference=GBR-AZR-TEST',
      };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(500);

  })

})

describe("When requesting to update a certificate", () => {

  beforeEach(() => {
    getMock = jest.spyOn(catchCert, 'getCertificateByPdfReference');
    updateMock = jest.spyOn(catchCert, 'upsertCertificate');
    getCCDocumentMock = jest.spyOn(catchCert, 'getCatchCerts');
    getSDPSDocumentMock = jest.spyOn(sdps, 'getAllDocuments');
    loggerMock = jest.spyOn(logger, 'info');

    auditMock = jest.spyOn(Certificates, 'auditCertificateUpdate');

    getMock.mockResolvedValue({a: 'certificate'})
    getCCDocumentMock.mockResolvedValue([]);
    getSDPSDocumentMock.mockResolvedValue([]);
    updateMock.mockResolvedValue([{}]);
  });

  afterEach(() => {
    getCCDocumentMock.mockReset();
    getSDPSDocumentMock.mockReset();
    updateMock.mockReset();

    loggerMock.mockReset();
  })

  it('will return 200 if all goes OK voiding a certificate', async () => {
    auditMock.mockResolvedValue({});

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

  });

  it('will audit a void event if all goes OK voiding a certificate', async () => {
    auditMock.mockReset();
    auditMock.mockResolvedValue({});

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        'X-ADMIN-USER' : user
      }
    };

    await server.inject(req);

    expect(auditMock).toHaveBeenCalledWith(documentNumber, user, AuditEventTypes.Voided);
  });

  it('will audit the investigation and return a 200 if all goes OK investigating a certificate', async () => {
    auditMock.mockReset();
    auditMock.mockResolvedValue({});

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        investigationStatus : InvestigationStatus.UnderInvestigation
      },
      headers : {
        'X-ADMIN-USER' : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);

    expect(auditMock).toHaveBeenCalledWith(documentNumber, user, AuditEventTypes.Investigated, expect.anything());

  });

  it('will investigation and return 404 if the certificate is DRAFT', async () => {
    getCCDocumentMock.mockResolvedValueOnce([{ status: 'DRAFT' }]);

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        investigationStatus : InvestigationStatus.UnderInvestigation
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);
    expect(loggerMock).toHaveBeenNthCalledWith(1, `[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][IS-DRAFT-DOCUMENT]`);
  });

  it('will investigation and return 404 if the certificate is PENDING', async () => {
    getCCDocumentMock.mockResolvedValueOnce([]);
    getCCDocumentMock.mockResolvedValueOnce([{ status: 'PENDING' }]);

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        investigationStatus : InvestigationStatus.UnderInvestigation
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);
    expect(loggerMock).toHaveBeenNthCalledWith(1, `[UPDATING-CERTIFICATE][INVESTIGATED-BY][${documentNumber}][IS-PENDING-DOCUMENT]`);
  });

  it('will return 200 if the certificate to be investigated is PS', async () => {
    getSDPSDocumentMock.mockResolvedValueOnce([]);
    getSDPSDocumentMock.mockResolvedValueOnce([{ status: 'INVALID' }]);

    const req = {
      method: 'PATCH',
      url: '/v1/certificates/GBR-PS-AZR-TEST',
      payload : {
        investigationStatus : InvestigationStatus.UnderInvestigation
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
  });

  it('will return 404 if the certificate to be voided is VOID', async () => {
    getCCDocumentMock.mockResolvedValueOnce([{ status: 'VOID' }]);

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);
    expect(loggerMock).toHaveBeenNthCalledWith(1, `[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][ALREADY-VOIDED]`);
  });

  it('will return 404 if the certificate to be voided is DRAFT', async () => {
    getCCDocumentMock.mockResolvedValueOnce([]);
    getCCDocumentMock.mockResolvedValueOnce([{ status: 'DRAFT' }]);

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);
    expect(loggerMock).toHaveBeenNthCalledWith(1, `[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][IS-DRAFT-DOCUMENT]`);
  });

  it('will return 404 if the certificate to be voided is PENDING', async () => {
    getCCDocumentMock.mockResolvedValueOnce([]);
    getCCDocumentMock.mockResolvedValueOnce([]);
    getCCDocumentMock.mockResolvedValueOnce([{ status: 'PENDING' }]);

    const req = {
      method: 'PATCH',
      url: `/v1/certificates/${documentNumber}`,
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(404);
    expect(loggerMock).toHaveBeenNthCalledWith(1, `[UPDATING-CERTIFICATE][VOIDING][${documentNumber}][IS-PENDING-DOCUMENT]`);
  });

  it('will return 200 if the certificate to be voided is PS', async () => {
    getSDPSDocumentMock.mockResolvedValueOnce([]);
    getSDPSDocumentMock.mockResolvedValueOnce([]);
    getSDPSDocumentMock.mockResolvedValueOnce([{ status: 'INVALID' }]);

    const req = {
      method: 'PATCH',
      url: '/v1/certificates/GBR-PS-AZR-TEST',
      payload : {
        status : DocumentStatuses.Void
      },
      headers : {
        "X-ADMIN-USER" : user
      }
    };

    const response = await server.inject(req);

    expect(response.statusCode).toBe(200);
  });

  describe('we will throw an internal server error when', () => {
    it('something goes wrong when voiding the certificate', async () => {
      updateMock.mockReset();
      updateMock.mockImplementationOnce(() => {
        throw Error()
      });

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          status : DocumentStatuses.Void
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(500);

    })

    it('something goes wrong when auditing a certificate event', async () => {
        auditMock.mockReset();
        auditMock.mockImplementationOnce(() => {
          throw Error()
        });

        const req = {
          method: 'PATCH',
          url: `/v1/certificates/${documentNumber}`,
          payload : {
            investigationStatus : InvestigationStatus.MinorVerbal
          },
          headers : {
            'X-ADMIN-USER' : user
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);

      })

    it('something goes wrong when marking a certificated as being investigated', async () => {
        updateMock.mockReset();
        updateMock.mockImplementationOnce(() => {
          throw Error()
        });
        const req = {
          method: 'PATCH',
          url: `/v1/certificates/${documentNumber}`,
          payload : {
            investigationStatus : InvestigationStatus.MinorVerbal
          },
          headers : {
            'X-ADMIN-USER' : user
          }
        };

        const response = await server.inject(req);

        expect(response.statusCode).toBe(500);

    })

  describe('we will return a Bad Request', () => {
    it('when we attempt to patch anything other than status or investigatedBy', async ()=> {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
            documentNumber : 'test'
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

    it('when we attempt to patch multiple properties', async ()=> {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
            documentNumber : 'test',
            status: DocumentStatuses.Void
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

    it('when we attempt to patch a status to something else other than VOID', async ()=> {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          status: DocumentStatuses.Complete
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

    it('when we have no payload', async () => {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        headers : {
          "X-ADMIN-USER": user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

    it('when we have no x-admin-user header', async () => {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          investigationStatus : InvestigationStatus.Open
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

    it('when we have an empty x-admin-user header', async () => {
      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          investigationStatus : InvestigationStatus.DataError
        },
        headers : {
          "X-ADMIN-USER": ""
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(400);

    });

  });

  describe('we will return Not Found', () => {
    it('when voiding a Catch Certificate that is already voided', async () => {
      getCCDocumentMock.mockReset();
      getCCDocumentMock.mockResolvedValue([{}]);

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/GBR-2020-cc-693BFCDD9`,
        payload : {
            status: DocumentStatuses.Void
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });

    it('when voiding a Processing Statement that is already voided', async () => {
      getSDPSDocumentMock.mockReset();
      getSDPSDocumentMock.mockResolvedValue([{}]);

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/GBR-2020-PS-D56B020E8`,
        payload : {
            status: DocumentStatuses.Void
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });

    it('when voiding a Storage Document that is already voided', async () => {
      getSDPSDocumentMock.mockReset();
      getSDPSDocumentMock.mockResolvedValue([{}]);

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/GBR-2020-SD-EB3ACD188`,
        payload : {
            status: DocumentStatuses.Void
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });
    it('when voiding a Catch Certificate and documentNumber does not exist', async () => {
      updateMock.mockReset();
      updateMock.mockResolvedValue(null);

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          status : DocumentStatuses.Void
        },
        headers : {
          "X-ADMIN-USER": user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });

    it('when marking a Catch Certificate as investigated and documentNumber does not exist', async () => {
      updateMock.mockReset();
      updateMock.mockResolvedValue(null);

      const req = {
        method: 'PATCH',
        url: `/v1/certificates/${documentNumber}`,
        payload : {
          investigationStatus : InvestigationStatus.DataError
        },
        headers : {
          'X-ADMIN-USER' : user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });
    it('when there is no documentNumber', async () => {
      const req = {
        method: 'PATCH',
        url: '/v1/certificates/',
        headers : {
          "X-ADMIN-USER": user
        }
      };

      const response = await server.inject(req);

      expect(response.statusCode).toBe(404);

    });
    });
  });

});