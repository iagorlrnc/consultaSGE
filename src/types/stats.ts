export interface SampleStudentMeta {
  cpf: string;
  cleanCpf: string;
  name: string;
  city: string;
}

export interface StatsData {
  totalRecords: number;
  withCpf: number;
  withoutCpf: number;
  totalEnrollments: number;
  uniqueSchools: number;
  genderCounts?: Record<string, number>;
  raceCounts?: Record<string, number>;
  disabilityCounts?: Record<string, number>;
  topCities?: Array<{ name: string; count: number }> | Array<[string, number]>;
}
