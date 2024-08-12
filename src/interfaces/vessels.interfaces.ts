export interface IVessel {
  pln: string; // Port Letter and Number
  vesselName: string;
  homePort?: string;
  flag?: string; // jurisdiction under whose laws the vessel is registered or licensed
  cfr?: string, // cost and freight (CFR) is a legal term
  licenceNumber?: string;
  imoNumber?: string; // International Maritime Organisation
  licenceValidTo?: string;
  rssNumber?: string; // Registry of Shipping and Seamen
  vesselLength?: number;
  label?: string;
  domId?: string;
  vesselOverriddenByAdmin?: boolean;
  vesselNotFound?: boolean;
  licenceHolder?: string;
}