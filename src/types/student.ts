export interface Documents {
  cpf?: string;
  rg?: string;
  issuingBody?: string;
  nis?: string;
  cnh?: string;
  birthCertificate?: string;
}

export interface Address {
  street?: string;
  number?: string;
  neighborhood?: string;
  zipCode?: string;
  city?: string;
  state?: string;
}

export interface Filiation {
  name?: string;
  kinshipLevel?: string;
  cpf?: string;
}

export interface Student {
  _id?: string | { $oid: string };
  studentId?: string | number | { $numberLong: string };
  name: string;
  socialName?: string;
  birthDate?: string | { $date: string };
  gender?: string | number | { $numberLong: string };
  raceColor?: string | number | { $numberLong: string };
  disabilityTypes?: Array<string | number | { $numberLong: string }>;
  email?: string;
  phone?: string;
  documents?: Documents;
  address?: Address;
  filiations?: Filiation[];
  mostRecentEnrollment?: string;
}

export interface ClassRecord {
  classId?: string | number | { $numberLong: string };
  description?: string;
  gradeDescription?: string;
  academicYear?: string | number | { $numberLong: string };
  classStartDate?: string;
  classEndDate?: string;
  situation?: string;
  classCompletionReason?: string;
}

export interface SchoolInfo {
  schoolId?: string | number | { $numberLong: string };
  name?: string;
  city?: string;
  inep?: string;
  board?: string;
  boardId?: string | number | { $numberLong: string };
}

export interface Enrollment {
  enrollment: string;
  enrollmentStatus?: string | number | { $numberLong: string };
  completionReason?: string;
  createdAt?: string | { $date: string };
  school?: SchoolInfo;
  classes?: ClassRecord[];
}

export interface FlattenedAcademicHistory {
  enrollment: string;
  schoolName: string;
  schoolCity: string;
  schoolInep: string;
  schoolBoard: string;
  academicYear: string;
  gradeDescription: string;
  classDescription: string;
  classStartDate: string;
  classEndDate: string;
  situation: string;
  completionReason: string;
}

export interface ParsedModality {
  level: string;
  modality: string;
  shift: string;
  regime: string;
  extra?: string;
  fullLabel: string;
}

export interface SearchResult {
  found: boolean;
  student?: Student;
  enrollments?: Enrollment[];
  message?: string;
}
