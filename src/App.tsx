import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { SearchSection } from './components/search/SearchSection';
import { StatsOverview } from './components/search/StatsOverview';
import { StudentHeader } from './components/student/StudentHeader';
import { CurrentSchoolCard } from './components/student/CurrentSchoolCard';
import { DocumentsCard } from './components/student/DocumentsCard';
import { PersonalDataCard } from './components/student/PersonalDataCard';
import { AddressCard } from './components/student/AddressCard';
import { AcademicHistoryCard } from './components/student/AcademicHistoryCard';
import { FiliationsCard } from './components/student/FiliationsCard';
import { Toast } from './components/ui/Toast';
import { Student, Enrollment, FlattenedAcademicHistory } from './types/student';
import { StatsData, SampleStudentMeta } from './types/stats';
import { searchStudentApi, getSamplesApi, getStatsApi } from './lib/api';
import { validateCpf } from './lib/cpf';
import { filterStudentDataByRole } from './lib/rbac';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [currentCpfValue, setCurrentCpfValue] = useState<string>('');

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleStudentMeta[]>([]);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getStatsApi();
      setStats(data);
    } catch (err: any) {
      setStats(null);
      setStatsError(err?.message || 'Falha de comunicação: o dado não foi encontrado no banco de dados.');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      getSamplesApi().then(setSamples).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleNotify = (msg: string) => {
    setToastMsg(msg);
  };

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setErrorAlert('Por favor, informe um CPF, Nome ou ID válido para realizar a pesquisa.');
      return;
    }

    // CPF validation check (if query resembles a CPF)
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0 && digits.length === 11) {
      const valResult = validateCpf(digits);
      if (!valResult.valid) {
        setErrorAlert(`Aviso de Validação: ${valResult.reason}. Pesquisando na base mesmo assim...`);
      } else {
        setErrorAlert(null);
      }
    } else {
      setErrorAlert(null);
    }

    setLoading(true);
    setStudent(null);
    setEnrollments([]);

    try {
      const res = await searchStudentApi(trimmed);
      setLoading(false);
      if (res.found && res.student) {
        const minimizedStudent = filterStudentDataByRole(res.student, user?.role);
        setStudent(minimizedStudent);
        setEnrollments(res.enrollments || []);
        setErrorAlert(null);
      } else {
        setErrorAlert(res.message || `Nenhum estudante localizado com o CPF/Identificador "${trimmed}".`);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorAlert('Ocorreu um erro ao comunicar com o servidor. Tente novamente.');
    }
  };

  const handleSelectSample = (cpf: string) => {
    setCurrentCpfValue(cpf);
    handleSearch(cpf);
  };

  if (isLoading) {
    return (
      <div className="auth-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#1e293b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '36px', height: '36px' }}></div>
          <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Verificando sessão segura Supabase...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onNotify={handleNotify} />
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      </>
    );
  }

  // Process history and primary enrollment
  const allHistory: FlattenedAcademicHistory[] = [];
  let primaryEnrollment: Enrollment | null = null;
  let activeClass: FlattenedAcademicHistory | null = null;

  if (student && enrollments.length > 0) {
    const targetEnrollmentNum = student.mostRecentEnrollment || '';
    primaryEnrollment = enrollments.find(e => e.enrollment === targetEnrollmentNum) || enrollments[0];

    enrollments.forEach(enr => {
      const schName = enr.school?.name || 'Escola não informada';
      const schCity = enr.school?.city || '';
      const schInep = enr.school?.inep || '--';
      const schBoard = enr.school?.board || '';

      (enr.classes || []).forEach(cls => {
        allHistory.push({
          enrollment: enr.enrollment,
          schoolName: schName,
          schoolCity: schCity,
          schoolInep: schInep,
          schoolBoard: schBoard,
          academicYear: String(typeof cls.academicYear === 'object' && cls.academicYear && '$numberLong' in cls.academicYear ? cls.academicYear.$numberLong : cls.academicYear || '--'),
          gradeDescription: cls.gradeDescription || 'Série não informada',
          classDescription: cls.description || '--',
          classStartDate: cls.classStartDate || '',
          classEndDate: cls.classEndDate || '',
          situation: cls.situation || 'Não informada',
          completionReason: cls.classCompletionReason || enr.completionReason || ''
        });
      });
    });

    allHistory.sort((a, b) => {
      const yDiff = Number(b.academicYear || 0) - Number(a.academicYear || 0);
      if (yDiff !== 0) return yDiff;
      return String(b.classStartDate).localeCompare(String(a.classStartDate));
    });

    activeClass = allHistory.find(h => h.situation.toLowerCase().includes('cursando')) || allHistory[0] || null;
  }

  return (
    <div className="dashboard-view">
      <Header onNotify={handleNotify} />

      <main className="main-container">
        <SearchSection
          onSearch={handleSearch}
          loading={loading}
          onSelectSample={handleSelectSample}
          sampleCpfs={samples}
          currentCpfValue={currentCpfValue}
        />

        {errorAlert && (
          <div className="alert-box alert-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorAlert}</span>
          </div>
        )}

        {loading && (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Cruzando dados de estudantes e matrículas...</p>
          </div>
        )}

        {!loading && student && (
          <section className="result-section">
            <StudentHeader student={student} onNotify={handleNotify} />

            <div className="details-grid">
              <CurrentSchoolCard
                primaryEnrollment={primaryEnrollment}
                activeClass={activeClass}
                studentCity={student.address?.city}
                onNotify={handleNotify}
              />
              <DocumentsCard documents={student.documents} onNotify={handleNotify} />
              <PersonalDataCard student={student} />
              <AddressCard address={student.address} />
              <AcademicHistoryCard history={allHistory} />
              <FiliationsCard filiations={student.filiations} />
            </div>
          </section>
        )}

        {!loading && !student && (
          <StatsOverview
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={fetchStats}
          />
        )}
      </main>

      <Footer />
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
    </div>
  );
};
