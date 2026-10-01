export interface IdentificationScheme {
  identifier?: string;
  name?: string;
  agencyName?: string;
}

export interface ApprovalNumber {
  content?: string;
  identificationScheme?: IdentificationScheme;
}

export interface CountryCode {
  identifier?: string;
}

export interface CountryAddress {
  identifier?: string;
  identificationSchemeAgency?: CountryCode;
  countryName?: string;
  countrySubDivision?: CountryCode;
  countrySubDivisionName?: string;
}

export interface EstablishmentAddress {
  identification?: string;
  postCode?: {
    code?: string | null;
  };
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  cityName?: string;
  country?: CountryAddress;
}

export interface ApprovalSection {
  code?: string;
  name?: string;
}

export interface ActivityType {
  code?: string;
  name?: string;
  euCode?: string | null;
  euName?: string | null;
}

export interface Approval {
  section?: ApprovalSection;
  activityType?: ActivityType;
  pairKey?: string;
  general?: boolean;
  processing?: boolean | null;
  storage?: boolean | null;
}

export interface Establishment {
  id?: string;
  approvalNumber?: ApprovalNumber;
  tradingName?: string;
  source?: 'FSA' | 'FSS' | 'FSANI';
  competentAuthority?: string | null;
  address?: EstablishmentAddress;
  country?: string | null;
  countryOfApproval?: string | null;
  approvals?: Approval[];
  sections?: string[];
  capabilities?: Array<'processing' | 'storage'>;
  extractDate?: string | null;
}

export interface EstablishmentSearchResponse {
  content: Establishment[];
  total: number;
  limit: number;
  offset: number;
}
