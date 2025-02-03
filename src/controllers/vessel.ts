import mingo from "mingo";
import { getVesselsData } from "../data/cache";
import { IVessel } from "../interfaces/vessels.interfaces";
import { IVessel as IVesselRaw } from "../landings/types/appConfig/vessels";

export const vesselSearch = (searchTerm: string, landedDateISO: string): IVessel[] => {

  const allVessels: IVessel[] = [];

  const vessels = mingo.find(getVesselsData(), {
    "$and": [
      {
        "$or": [
          {
            registrationNumber: { $regex: searchTerm.includes('(') ? searchTerm.substring(searchTerm.indexOf('(') + 1, searchTerm.length).replace(')', '') : searchTerm, $options: 'i' }
          },
          {
            fishingVesselName: { $regex: searchTerm.includes('(') ? searchTerm.replace(/%20/g, ' ').substring(0, searchTerm.indexOf('(')) : searchTerm.replace(/%20/g, ' ') , $options: 'i' }
          }
        ]
      },
      {
        fishingLicenceValidTo: { "$gte" : landedDateISO.substring(0,landedDateISO.length-5) } //Minus Zulu and Miliseconds
      },
      {
        fishingLicenceValidFrom: { "$lte" : landedDateISO.substring(0,landedDateISO.length-5) }
      }
    ]
  });


  vessels.sort({fishingVesselName: 1});
  while(vessels.hasNext()) {
    const item = vessels.next() as IVesselRaw;
    allVessels.push({
      pln: item.registrationNumber,
      vesselName: item.fishingVesselName,
      flag: item.flag,
      cfr: item.cfr,
      homePort: item.homePort,
      licenceNumber: item.fishingLicenceNumber,
      imoNumber: item.imo,
      licenceValidTo: item.fishingLicenceValidTo,
      rssNumber: item.rssNumber,
      vesselLength: item.vesselLength,
      vesselNotFound: item.vesselNotFound,
      licenceHolder: item.licenceHolderName
    } as IVessel);
  }

  return allVessels;

}