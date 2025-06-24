module.exports = {
    mockLandingData: [
        {
            "C20515,2019-08-15":
            {
                "cfr": "NLD200202641",
                "rssNumber": "C20514",
                "vesselRegistrationNumber": "H1100",
                "vesselName": "Wiron 5",
                "fishingAuthority": "GBE",
                "landings": [
                    {
                        "logbookNumber": "A1165920190477",
                        "landingDateTime": "2018-02-03T13:30:00",
                        "landingPort": "NLSCE",
                        "landingAreas": [
                            {
                                "faoArea": 27,
                                "faoSubArea": "4",
                                "landingAreaCatches": [
                                    {
                                        "species": "HER",
                                        "presentation": "BMS",
                                        "state": "FRO",
                                        "weight": 142
                                    },
                                    {
                                        "species": "HER",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 124406
                                    }
                                ]
                            },
                            {
                                "faoArea": 27,
                                "faoSubArea": "7",
                                "landingAreaCatches": [
                                    {
                                        "species": "BRB",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 10007
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 40070
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "BMS",
                                        "state": "FRO",
                                        "weight": 173
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 149119
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 43270
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "BMS",
                                        "state": "FRO",
                                        "weight": 193
                                    },
                                    {
                                        "species": "HOM",
                                        "presentation": "WHL",
                                        "state": "FRO",
                                        "weight": 213833
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "dateTimeStamp": "2019-08-14T12:14:24.793"
            }
        }
    ],
    mockCatchActivitiesData: { "_embedded": { "fishingTrips": [{ "fishingTripId": { "euTripId": "GBR-TRP-SDS-29597" }, "fishingActivityReports": [{ "purpose": "ORIGINAL", "type": "DECLARATION", "creation": "2020-06-08T17:41:57.227Z", "fishingActivities": [{ "type": "DEPARTURE", "occurrence": "2020-06-08T00:00:00.000Z", "relatedFLUXLocations": [{ "type": "LOCATION", "countryId": "GBR", "scheme": "LOCATION", "id": "GBWEY", "_mmoId": "7dbc0050-a095-4d5e-b5b8-69ec4a7a021b" }], "vesselActivityCode": "FIS" }], "specifiedFishingTrip": { "_mmoId": "5ede77c4df06ae99848f46c2", "euTripId": "GBR-TRP-SDS-29597" }, "specifiedVesselTransportMeans": { "ids": { "cfr": "GBR000C20403" }, "name": "MARAUDER", "registrationVesselCountry": "GBR", "specifiedContactParties": [{ "contactPerson": { "givenName": "-", "familyName": "MR G NOBLE" }, "address": { "blockName": "WYKE REGIS", "streetName": "162 PORTLAND ROAD", "cityName": "WEYMOUTH", "countryId": "GBR", "countrySubDivisionName": "DORSET", "postalArea": "DT4 9AD" }, "role": "MASTER", "_mmoId": "8994f1b0-7aca-4dcc-86ef-3f7ee824cd5b" }], "_mmoId": "d9f872b0-3407-43f4-9625-5ea4eb995108" }, "valid": true, "acceptance": "2020-06-08T17:41:57.62", "owner": { "id": "GBR", "name": "United Kingdom" }, "source": "FAS", "_id": "f96a15ac-2469-4e1e-8e32-87e51354e25c" }, { "purpose": "ORIGINAL", "type": "DECLARATION", "creation": "2020-06-08T17:41:57.227Z", "fishingActivities": [{ "type": "FISHING_OPERATION", "occurrence": "2020-06-08T00:00:00.000Z", "relatedFLUXLocations": [{ "type": "AREA", "scheme": "STAT_RECTANGLE", "id": "29E7", "subRectangle": "7" }], "specifiedFishingGears": [{ "type": "FPO", "roleCodes": ["DEPLOYED"], "applicableGearCharacteristics": [{ "type": "GN", "dataType": "QUANTITY", "unit": "C62", "value": "40", "_mmoId": "total-number-of-pots-hauled-during-trip" }], "_mmoId": "017b6806-1e00-48bb-993e-6a955baae81b|43561ffc-c211-49e8-9d92-6f229952f36d" }], "vesselActivityCode": "FIS", "relatedFishingActivities": [{ "type": "GEAR_SHOT", "relatedFLUXLocations": [{ "type": "AREA", "scheme": "STAT_RECTANGLE", "id": "29E7", "subRectangle": "7" }], "specifiedFishingGears": [{ "type": "FPO", "roleCodes": ["DEPLOYED"], "applicableGearCharacteristics": [{ "type": "GN", "dataType": "QUANTITY", "unit": "C62", "value": "500", "_mmoId": "total-number-of-pots-set-end-of-trip" }] }] }], "specifiedCatches": [{ "species": { "code": "CRE", "_mmoId": "8b10bb25-8e45-46e4-85c6-e4c9ab8e4b54" }, "weightInKg": 20, "catchType": "ONBOARD", "specifiedSizeDistribution": "LSC" }, { "species": { "code": "LBE", "_mmoId": "1236af56-7a82-43c7-8540-fd005dcfff07" }, "weightInKg": 9, "catchType": "ONBOARD", "specifiedSizeDistribution": "LSC" }] }, { "type": "FISHING_OPERATION", "occurrence": "2020-06-08T00:00:00.000Z", "relatedFLUXLocations": [{ "type": "AREA", "scheme": "STAT_RECTANGLE", "id": "29E7", "subRectangle": "7" }], "specifiedFishingGears": [{ "type": "LX", "roleCodes": ["DEPLOYED"], "applicableGearCharacteristics": [{ "type": "GN", "dataType": "QUANTITY", "unit": "C62", "value": "6", "_mmoId": "total-number-of-hooks-hauled-during-trip" }], "_mmoId": "807322a6-011c-4ffb-a663-d983938c4d91|892af86b-fce4-442d-bbf8-7f4e65a7e4cb" }], "vesselActivityCode": "FIS", "relatedFishingActivities": [{ "type": "GEAR_SHOT", "relatedFLUXLocations": [{ "type": "AREA", "scheme": "STAT_RECTANGLE", "id": "29E7", "subRectangle": "7" }], "specifiedFishingGears": [{ "type": "LX", "roleCodes": ["DEPLOYED"], "applicableGearCharacteristics": [{ "type": "GN", "dataType": "QUANTITY", "unit": "C62", "value": "0", "_mmoId": "total-number-of-hooks-set-end-of-trip" }] }] }], "specifiedCatches": [{ "species": { "code": "BSS", "_mmoId": "884ef59c-8cc1-48d1-b451-74009ad094b3" }, "weightInKg": 78, "catchType": "ONBOARD", "specifiedSizeDistribution": "LSC" }] }], "specifiedFishingTrip": { "euTripId": "GBR-TRP-SDS-29597" }, "specifiedVesselTransportMeans": { "ids": { "cfr": "GBR000C20403" }, "name": "MARAUDER", "registrationVesselCountry": "GBR", "specifiedContactParties": [{ "contactPerson": { "givenName": "-", "familyName": "MR G NOBLE" }, "address": { "blockName": "WYKE REGIS", "streetName": "162 PORTLAND ROAD", "cityName": "WEYMOUTH", "countryId": "GBR", "countrySubDivisionName": "DORSET", "postalArea": "DT4 9AD" }, "role": "MASTER", "_mmoId": "8994f1b0-7aca-4dcc-86ef-3f7ee824cd5b" }], "_mmoId": "d9f872b0-3407-43f4-9625-5ea4eb995108" }, "valid": true, "acceptance": "2020-06-08T17:41:57.688", "owner": { "id": "GBR", "name": "United Kingdom" }, "source": "FAS", "_id": "b1b3f786-afb6-46f9-8dba-ebd922a6dbf0" }, { "purpose": "ORIGINAL", "type": "DECLARATION", "creation": "2020-06-08T17:41:57.227Z", "fishingActivities": [{ "type": "ARRIVAL", "occurrence": "2020-06-08T00:00:00.000Z", "relatedFLUXLocations": [{ "type": "LOCATION", "countryId": "GBR", "scheme": "LOCATION", "id": "GBWEY", "_mmoId": "7dbc0050-a095-4d5e-b5b8-69ec4a7a021b" }], "vesselActivityCode": "FIS", "specifiedCatches": [{ "species": { "code": "CRE", "_mmoId": "8b10bb25-8e45-46e4-85c6-e4c9ab8e4b54" }, "weightInKg": 20, "catchType": "KEPT_IN_NET", "specifiedSizeDistribution": "LSC" }] }], "specifiedFishingTrip": { "euTripId": "GBR-TRP-SDS-29597" }, "specifiedVesselTransportMeans": { "ids": { "cfr": "GBR000C20403" }, "name": "MARAUDER", "registrationVesselCountry": "GBR", "specifiedContactParties": [{ "contactPerson": { "givenName": "-", "familyName": "MR G NOBLE" }, "address": { "blockName": "WYKE REGIS", "streetName": "162 PORTLAND ROAD", "cityName": "WEYMOUTH", "countryId": "GBR", "countrySubDivisionName": "DORSET", "postalArea": "DT4 9AD" }, "role": "MASTER", "_mmoId": "8994f1b0-7aca-4dcc-86ef-3f7ee824cd5b" }], "_mmoId": "d9f872b0-3407-43f4-9625-5ea4eb995108" }, "valid": true, "acceptance": "2020-06-08T17:41:57.688", "owner": { "id": "GBR", "name": "United Kingdom" }, "source": "FAS", "_id": "f2bb26e6-204b-4d84-9d58-c115eb4e0b2f" }], "_links": { "self": { "href": "http://sds-fa-service.sds.svc.cluster.local/v1/fishingTrips/GBR-TRP-SDS-29597" }, "fishingTrips": { "href": "http://sds-fa-service.sds.svc.cluster.local/v1/fishingTrips/GBR-TRP-SDS-29597" } } }] }, "_links": { "self": { "href": "http://sds-fa-service.sds.svc.cluster.local/v1/fishingTrips{?cfr,euTripId,mmoTripId,userId,vesselId,fishingActivityType,occurrenceDateTimeFrom,occurrenceDateTimeTo,type,mmoId,purpose,includeInvalid,source,ownerId}", "templated": true } }, "page": { "size": 20, "totalElements": 1, "totalPages": 1, "number": 0 } },
    mockSalesNotes: {
        "execution": {
            "executionID": "ceeec118-6ce9-447e-aed5-def99d6386ee",
            "dateTime": "2019-09-10T12:45:16.166Z",
            "method": "GET",
            "service": "EEC Sales Notes",
            "user": "ECCtest",
            "url": "/DEFRA/v1/ECC/SalesNotes"
        },
        "vesselRegistrationNumber": "PZ476",
        "fishingAuthority": "GBE",
        "rssNumber": "A21802",
        "cfr": "GBR000A21802",
        "vesselName": "LISA JACQUELINE STEVENSON",
        "salesNoteLines": [
            {
                "saleDate": "2018-02-01T00:00:00Z",
                "salePort": "GBNYL",
                "landingDate": "2018-02-01T00:00:00Z",
                "landingPort": "GBNYL",
                "catches": [
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 91
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 24
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 94
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 50
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 7
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 101
                    },
                    {
                        "species": "ANF",
                        "presentation": "TAL",
                        "state": "FRE",
                        "weight": 185
                    },
                    {
                        "species": "BIB",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 26
                    },
                    {
                        "species": "BLL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 2
                    },
                    {
                        "species": "BLL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 14
                    },
                    {
                        "species": "BLL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "COD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 28
                    },
                    {
                        "species": "COD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 20
                    },
                    {
                        "species": "COE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 32
                    },
                    {
                        "species": "COE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 18
                    },
                    {
                        "species": "CTL",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 150
                    },
                    {
                        "species": "GUX",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 12
                    },
                    {
                        "species": "GUX",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 63
                    },
                    {
                        "species": "GUX",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 7
                    },
                    {
                        "species": "HAD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 15
                    },
                    {
                        "species": "HAD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 16
                    },
                    {
                        "species": "HAD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 7
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 3
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 9
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 3
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 6
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 6
                    },
                    {
                        "species": "HKE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 16
                    },
                    {
                        "species": "JOD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 6
                    },
                    {
                        "species": "JOD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 23
                    },
                    {
                        "species": "JOD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 6
                    },
                    {
                        "species": "JOD",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 22
                    },
                    {
                        "species": "LEM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 10
                    },
                    {
                        "species": "LEM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 51
                    },
                    {
                        "species": "LEM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 36
                    },
                    {
                        "species": "LEM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 32
                    },
                    {
                        "species": "LEM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 14
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 102
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 19
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 62
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 100
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 230
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 187
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 100
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 61
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 38
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 100
                    },
                    {
                        "species": "LEZ",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 208
                    },
                    {
                        "species": "LIN",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 20
                    },
                    {
                        "species": "MUR",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 5
                    },
                    {
                        "species": "MUR",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 2
                    },
                    {
                        "species": "OCT",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 115
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 4
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 10
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 17
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 2
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 3
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 9
                    },
                    {
                        "species": "PLE",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "POL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 8
                    },
                    {
                        "species": "RJF",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 10
                    },
                    {
                        "species": "RJF",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 36
                    },
                    {
                        "species": "RJM",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 26
                    },
                    {
                        "species": "RJN",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 129
                    },
                    {
                        "species": "RJN",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 66
                    },
                    {
                        "species": "SCE",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 10
                    },
                    {
                        "species": "SCE",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 20
                    },
                    {
                        "species": "SMD",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 32
                    },
                    {
                        "species": "SMD",
                        "presentation": "WHL",
                        "state": "FRE",
                        "weight": 13
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 3
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 12
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 30
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 25
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 11
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 61
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 50
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 70
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 50
                    },
                    {
                        "species": "SOL",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 25
                    },
                    {
                        "species": "TUR",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 5
                    },
                    {
                        "species": "TUR",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 24
                    },
                    {
                        "species": "TUR",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 4
                    },
                    {
                        "species": "TUR",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 9
                    },
                    {
                        "species": "TUR",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 20
                    },
                    {
                        "species": "WHG",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 1
                    },
                    {
                        "species": "WIT",
                        "presentation": "GUT",
                        "state": "FRE",
                        "weight": 2
                    }
                ]
            }
        ],
        "dateTimeStamp": "2019-09-10T12:45:24.01Z"
    },
    mockELogsData: [
        {
            "$schema": "./FishingActivityEndpointSchema.json",
            "cfr": "NLD200202641",
            "rssNumber": "C20514",
            "vesselRegistrationNumber": "H1100",
            "vesselName": "Wiron 5",
            "fishingAuthority": "GBE",
            "activity": [
                {
                    "returnDate": "2018-02-03T13:30:00",
                    "returnPort": "NLSCE",
                    "logbookNumber": "C2051420180053",
                    "activityAreas": [
                        {
                            "faoArea": 27,
                            "faoSubArea": "4",
                            "activityAreaCatches": [
                                {
                                    "species": "HER",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 124406
                                }
                            ]
                        },
                        {
                            "faoArea": 27,
                            "faoSubArea": "7",
                            "activityAreaCatches": [
                                {
                                    "species": "BRB",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 10007
                                },
                                {
                                    "species": "COD",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 173
                                }
                            ]
                        }
                    ]
                },
                {
                    "returnDate": "2018-02-03T19:30:00",
                    "returnPort": "NLSCE",
                    "logbookNumber": "C2051420180072",
                    "activityAreas": [
                        {
                            "faoArea": 27,
                            "faoSubArea": "4",
                            "activityAreaCatches": [
                                {
                                    "species": "HER",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 124
                                }
                            ]
                        },
                        {
                            "faoArea": 27,
                            "faoSubArea": "7",
                            "activityAreaCatches": [
                                {
                                    "species": "BRB",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 10027
                                },
                                {
                                    "species": "HOM",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 40070
                                },
                                {
                                    "species": "COD",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 1743
                                },
                                {
                                    "species": "HER",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 149119
                                },
                                {
                                    "species": "ANF",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 43270
                                },
                                {
                                    "species": "CRE",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 193
                                },
                                {
                                    "species": "CLT",
                                    "presentation": "WHL",
                                    "state": "FRE",
                                    "weight": 213833
                                }
                            ]
                        }
                    ]
                }
            ],
            "dateTimeStamp": "2019-08-14T12:14:24.793"
        }
    ],
    mockFishingActivitiesData: [
      {
        "B15011,2019-12-30": {
          "cfr": "GBR000B15011",
          "rssNumber": "B15011",
          "vesselRegistrationNumber": "PE1044",
          "vesselName": "JESSICA LYNN",
          "fishingAuthority": "GBE",
          "activities": [
              {
                  "tripId": "GBR-TRP-SDS-3088",
                  "returnDate": "2019-12-30T00:00:00Z",
                  "returnPort": "GBPOO",
                  "activityAreas": [
                      {
                          "faoArea": 0,
                          "faoSubArea": "NA",
                          "activityAreaCatches": [
                              {
                                  "species": "CRE",
                                  "presentation": "WHL",
                                  "state": "FRE",
                                  "weight": 130
                              },
                              {
                                  "species": "LBE",
                                  "presentation": "WHL",
                                  "state": "FRE",
                                  "weight": 7
                              }
                          ]
                      }
                  ]
              }
          ]
        }
      }
    ],
    mockGearTypesData: [
        {
        'Gear category': 'Surrounding nets',
        'Gear name (code)': 'Purse seines (PS)',
        'Gear name': 'Purse seines',
        'Gear code': 'PS',
        },
        {
        'Gear category': 'Surrounding nets',
        'Gear name (code)': 'Surrounding nets without purse lines (LA)',
        'Gear name': 'Surrounding nets without purse lines',
        'Gear code': 'LA',
        },
        {
        'Gear category': 'Surrounding nets',
        'Gear name (code)': 'Surrounding nets (nei) (SUX)',
        'Gear name': 'Surrounding nets (nei)',
        'Gear code': 'SUX',
        },
        {
        'Gear category': 'Seine nets',
        'Gear name (code)': 'Beach seines (SB)',
        'Gear name': 'Beach seines',
        'Gear code': 'SB',
        },
        {
        'Gear category': 'Seine nets',
        'Gear name (code)': 'Boat seines (SV)',
        'Gear name': 'Boat seines',
        'Gear code': 'SV',
        },
        {
        'Gear category': 'Seine nets',
        'Gear name (code)': 'Seine nets (nei) (SX)',
        'Gear name': 'Seine nets (nei)',
        'Gear code': 'SX',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Beam trawls (TBB)',
        'Gear name': 'Beam trawls',
        'Gear code': 'TBB',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Single boat bottom otter trawls (OTB)',
        'Gear name': 'Single boat bottom otter trawls',
        'Gear code': 'OTB',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Twin bottom otter trawls (OTT)',
        'Gear name': 'Twin bottom otter trawls',
        'Gear code': 'OTT',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Multiple bottom otter trawls (OTP)',
        'Gear name': 'Multiple bottom otter trawls',
        'Gear code': 'OTP',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Bottom pair trawls (PTB)',
        'Gear name': 'Bottom pair trawls',
        'Gear code': 'PTB',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Bottom trawls (nei) (TB)',
        'Gear name': 'Bottom trawls (nei)',
        'Gear code': 'TB',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Single boat midwater otter trawls (OTM)',
        'Gear name': 'Single boat midwater otter trawls',
        'Gear code': 'OTM',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Midwater pair trawls (PTM)',
        'Gear name': 'Midwater pair trawls',
        'Gear code': 'PTM',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Midwater trawls (nei) (TM)',
        'Gear name': 'Midwater trawls (nei)',
        'Gear code': 'TM',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Semipelagic trawls (TSP)',
        'Gear name': 'Semipelagic trawls',
        'Gear code': 'TSP',
        },
        {
        'Gear category': 'Trawls',
        'Gear name (code)': 'Trawls (nei) (TX)',
        'Gear name': 'Trawls (nei)',
        'Gear code': 'TX',
        },
        {
        'Gear category': 'Dredges',
        'Gear name (code)': 'Towed dredges (DRB)',
        'Gear name': 'Towed dredges',
        'Gear code': 'DRB',
        },
        {
        'Gear category': 'Dredges',
        'Gear name (code)': 'Mechanized dredges (DRM)',
        'Gear name': 'Mechanized dredges',
        'Gear code': 'DRM',
        },
        {
        'Gear category': 'Dredges',
        'Gear name (code)': 'Dredges (nei) (DRX)',
        'Gear name': 'Dredges (nei)',
        'Gear code': 'DRX',
        },
        {
        'Gear category': 'Lift nets',
        'Gear name (code)': 'Portable lift nets (LNP)',
        'Gear name': 'Portable lift nets',
        'Gear code': 'LNP',
        },
        {
        'Gear category': 'Lift nets',
        'Gear name (code)': 'Boat-operated lift nets (LNB)',
        'Gear name': 'Boat-operated lift nets',
        'Gear code': 'LNB',
        },
        {
        'Gear category': 'Lift nets',
        'Gear name (code)': 'Lift nets (nei) (LN)',
        'Gear name': 'Lift nets (nei)',
        'Gear code': 'LN',
        },
        {
        'Gear category': 'Falling gear',
        'Gear name (code)': 'Cast nets (FCN)',
        'Gear name': 'Cast nets',
        'Gear code': 'FCN',
        },
        {
        'Gear category': 'Falling gear',
        'Gear name (code)': 'Cover pots/lantern nets (FCO)',
        'Gear name': 'Cover pots/lantern nets',
        'Gear code': 'FCO',
        },
        {
        'Gear category': 'Falling gear',
        'Gear name (code)': 'Falling gear (nei) (FG)',
        'Gear name': 'Falling gear (nei)',
        'Gear code': 'FG',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Set gillnets (anchored) (GNS)',
        'Gear name': 'Set gillnets (anchored)',
        'Gear code': 'GNS',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Drift gillnets (GND)',
        'Gear name': 'Drift gillnets',
        'Gear code': 'GND',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Encircling nets (GNC)',
        'Gear name': 'Encircling nets',
        'Gear code': 'GNC',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Trammel nets (GTR)',
        'Gear name': 'Trammel nets',
        'Gear code': 'GTR',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Combined gillnets-trammel nets (GTN)',
        'Gear name': 'Combined gillnets-trammel nets',
        'Gear code': 'GTN',
        },
        {
        'Gear category': 'Gillnets and entangling nets',
        'Gear name (code)': 'Gillents and entangling nets (nei) (GEN)',
        'Gear name': 'Gillents and entangling nets (nei)',
        'Gear code': 'GEN',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Stationary uncovered pound nets (FPN)',
        'Gear name': 'Stationary uncovered pound nets',
        'Gear code': 'FPN',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Pots (FPO)',
        'Gear name': 'Pots',
        'Gear code': 'FPO',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Fyke nets (FYK)',
        'Gear name': 'Fyke nets',
        'Gear code': 'FYK',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Stow nets (FSN)',
        'Gear name': 'Stow nets',
        'Gear code': 'FSN',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Aerial traps (FAR)',
        'Gear name': 'Aerial traps',
        'Gear code': 'FAR',
        },
        {
        'Gear category': 'Traps',
        'Gear name (code)': 'Traps (nei) (FIX)',
        'Gear name': 'Traps (nei)',
        'Gear code': 'FIX',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Handlines and hand operated pole and lines (LHP)',
        'Gear name': 'Handlines and hand operated pole and lines',
        'Gear code': 'LHP',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Mechanized lines and pole-and-lines (LHM)',
        'Gear name': 'Mechanized lines and pole-and-lines',
        'Gear code': 'LHM',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Set longlines (LLS)',
        'Gear name': 'Set longlines',
        'Gear code': 'LLS',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Drifting longlines (LLD)',
        'Gear name': 'Drifting longlines',
        'Gear code': 'LLD',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Longlines (nei) (LL)',
        'Gear name': 'Longlines (nei)',
        'Gear code': 'LL',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Vertical lines (LVT)',
        'Gear name': 'Vertical lines',
        'Gear code': 'LVT',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Trolling lines (LTL)',
        'Gear name': 'Trolling lines',
        'Gear code': 'LTL',
        },
        {
        'Gear category': 'Hooks and lines',
        'Gear name (code)': 'Hooks and lines (nei) (LX)',
        'Gear name': 'Hooks and lines (nei)',
        'Gear code': 'LX',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Harpoons (HAR)',
        'Gear name': 'Harpoons',
        'Gear code': 'HAR',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)':
            'Hand implements (Wrenching gear, Clamps, Tongs, Rakes, Spears) (MHI)',
        'Gear name':
            'Hand implements (Wrenching gear, Clamps, Tongs, Rakes, Spears)',
        'Gear code': 'MHI',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Pumps (MPM)',
        'Gear name': 'Pumps',
        'Gear code': 'MPM',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Electric fishing (MEL)',
        'Gear name': 'Electric fishing',
        'Gear code': 'MEL',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Pushnets (MPN)',
        'Gear name': 'Pushnets',
        'Gear code': 'MPN',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Scoopnets (MSO)',
        'Gear name': 'Scoopnets',
        'Gear code': 'MSO',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Drive-in-nets (MDR)',
        'Gear name': 'Drive-in-nets',
        'Gear code': 'MDR',
        },
        {
        'Gear category': 'Miscellaneous gear',
        'Gear name (code)': 'Diving (MDV)',
        'Gear name': 'Diving',
        'Gear code': 'MDV',
        },
    ],
};