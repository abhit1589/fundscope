export interface MfapiMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
  isin_growth: string | null;
  isin_div_reinvestment: string | null;
}

export interface MfapiLatestResponse {
  meta: MfapiMeta;
  data: { date: string; nav: string }[];
  status: string;
}

export interface MfapiSearchResult {
  schemeCode: number;
  schemeName: string;
}

export interface ReturnPeriod {
  value: number | null;
  label: string;
}

export interface FundSummary {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
  category: string;
  nav: number;
  navDate: string;
  returns: {
    oneMonth: ReturnPeriod;
    threeMonth: ReturnPeriod;
    sixMonth: ReturnPeriod;
    ytd: ReturnPeriod;
    oneYear: ReturnPeriod;
    threeYear: ReturnPeriod;
    fiveYear: ReturnPeriod;
  };
  expenseRatio?: number;
  aumCr?: number;
  rating?: number;
  sharpe?: number;
  beta?: number;
  isDirect: boolean;
  dataSource: "mfdata" | "mfapi" | "cache" | "catalog";
}

export interface MfdataScheme {
  scheme_code: number;
  scheme_name: string;
  amc?: string;
  category?: string;
  plan_type?: string;
  nav?: number;
  nav_date?: string;
  aum_cr?: number;
  expense_ratio?: number;
  rating?: number;
  morningstar?: number;
  returns?: Record<
    string,
    { value: number; rank?: number; total_in_category?: number }
  >;
  ratios?: {
    sharpe?: number;
    beta?: number;
    pe?: number;
    alpha?: number;
  };
}

export interface PortfolioHolding {
  schemeCode: number;
  schemeName: string;
  units: number;
  investedAmount?: number;
  addedAt: string;
}
