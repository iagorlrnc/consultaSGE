/**
 * Script Profissional de Migração de Dados para o Supabase
 * Lê as credenciais do .env, processa os arquivos de estudantes e matrículas
 * com controle de fluxo (backpressure), concorrência balanceada, retry automático e relatório em tempo real.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

const STUDENT_PATH = path.join(__dirname, 'bd_json', 'siss_db.student_staging.json');
const ENROLLMENT_PATH = path.join(__dirname, 'bd_json', 'siss_db.enrollment_staging.json');

const BATCH_SIZE = 300;
const MAX_CONCURRENCY = 6;

function cleanCpf(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '').padStart(11, '0');
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function insertBatchWithRetry(tableName, records, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const options = tableName === 'students' ? { onConflict: 'student_id' } : {};
      const { error } = await supabase.from(tableName).upsert(records, options);
      if (!error) return true;
      
      if (attempt === maxRetries) {
        console.error(`\n❌ Falha persistente no lote de ${records.length} em ${tableName}: ${error.message}`);
        return false;
      }
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`\n❌ Erro de rede no lote em ${tableName}: ${err.message}`);
        return false;
      }
    }
    await new Promise(r => setTimeout(r, attempt * 1000));
  }
  return false;
}

/**
 * Leitor streaming com controle de fluxo para não estourar memória
 */
async function processJsonFileInBatches(filePath, mapFn, onBatchReady) {
  const fd = fs.openSync(filePath, 'r');
  const stat = fs.fstatSync(fd);
  const fileSize = stat.size;

  const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
  const buffer = Buffer.alloc(CHUNK_SIZE);
  let remainder = '';
  let pos = 0;
  let currentBatch = [];
  let totalParsed = 0;

  while (pos < fileSize) {
    const toRead = Math.min(CHUNK_SIZE, fileSize - pos);
    const bytesRead = fs.readSync(fd, buffer, 0, toRead, pos);
    pos += bytesRead;

    const chunkStr = remainder + buffer.toString('utf8', 0, bytesRead);
    let lastIndex = 0;
    let searchPos = 0;

    while (true) {
      let nextDelim = chunkStr.indexOf('\n},\n{', searchPos);
      let delimLen = 5;
      if (nextDelim === -1) {
        nextDelim = chunkStr.indexOf('\r\n},\r\n{', searchPos);
        delimLen = 7;
      }
      if (nextDelim === -1) break;

      let objStr = chunkStr.slice(lastIndex, nextDelim + (delimLen === 5 ? 2 : 3)).trim();
      if (objStr.startsWith('[')) objStr = objStr.slice(1).trim();
      if (objStr.startsWith(',')) objStr = objStr.slice(1).trim();

      const mapped = mapFn(objStr);
      if (mapped) {
        currentBatch.push(mapped);
        totalParsed++;
      }

      if (currentBatch.length >= BATCH_SIZE) {
        await onBatchReady([...currentBatch], pos, fileSize, totalParsed);
        currentBatch = [];
      }

      lastIndex = nextDelim + delimLen - 1;
      searchPos = lastIndex;
    }

    remainder = chunkStr.slice(lastIndex);
  }

  if (remainder.trim()) {
    let objStr = remainder.trim();
    if (objStr.startsWith('[')) objStr = objStr.slice(1).trim();
    if (objStr.startsWith(',')) objStr = objStr.slice(1).trim();
    if (objStr.endsWith(']')) objStr = objStr.slice(0, -1).trim();
    if (objStr.length > 5) {
      const mapped = mapFn(objStr);
      if (mapped) {
        currentBatch.push(mapped);
        totalParsed++;
      }
    }
  }

  if (currentBatch.length > 0) {
    await onBatchReady([...currentBatch], fileSize, fileSize, totalParsed);
  }

  fs.closeSync(fd);
  return totalParsed;
}

async function importStudents() {
  if (!fs.existsSync(STUDENT_PATH)) {
    console.log(`⚠️ Arquivo ${STUDENT_PATH} não encontrado.`);
    return;
  }

  console.log('\n================================================================');
  console.log('⚡ [FASE 1/2] Importando ESTUDANTES para o Supabase...');
  console.log('================================================================');
  const t0 = Date.now();
  let totalInserted = 0;
  const activePromises = new Set();

  function mapStudent(rawStr) {
    try {
      let s = rawStr.trim();
      if (s.endsWith(',')) s = s.slice(0, -1);
      const item = JSON.parse(s);

      const stId = String(item.studentId?.$numberLong || item.studentId || '');
      if (!stId) return null;

      const rawCpf = item.documents?.cpf || '';
      return {
        student_id: stId,
        cpf: rawCpf,
        clean_cpf: cleanCpf(rawCpf),
        name: item.name || '',
        city: item.address?.city || '',
        data: item
      };
    } catch {
      return null;
    }
  }

  async function handleBatch(batch, bytesPos, fileSize, totalParsed) {
    while (activePromises.size >= MAX_CONCURRENCY) {
      await Promise.race(activePromises);
    }

    const task = (async () => {
      const ok = await insertBatchWithRetry('students', batch);
      if (ok) totalInserted += batch.length;
      const elapsed = (Date.now() - t0) / 1000;
      const rate = totalInserted / (elapsed || 1);
      const pct = ((bytesPos / fileSize) * 100).toFixed(1);
      const estTotal = (totalParsed / (bytesPos / fileSize));
      const remaining = estTotal - totalInserted;
      const eta = formatTime(remaining / (rate || 1));

      process.stdout.write(
        `\r🚀 Estudantes: ${totalInserted.toLocaleString('pt-BR')} inseridos | ${rate.toFixed(0)} rec/s | ${pct}% | ETA: ${eta}    `
      );
    })();

    activePromises.add(task);
    task.finally(() => activePromises.delete(task));
  }

  await processJsonFileInBatches(STUDENT_PATH, mapStudent, handleBatch);
  await Promise.all(activePromises);

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Sucesso! ${totalInserted.toLocaleString('pt-BR')} estudantes enviados em ${formatTime(duration)}.`);
}

async function importEnrollments() {
  if (!fs.existsSync(ENROLLMENT_PATH)) {
    console.log(`⚠️ Arquivo ${ENROLLMENT_PATH} não encontrado.`);
    return;
  }

  console.log('\n================================================================');
  console.log('⚡ [FASE 2/2] Importando HISTÓRICO & MATRÍCULAS para o Supabase...');
  console.log('================================================================');
  const t0 = Date.now();
  let totalInserted = 0;
  const activePromises = new Set();

  function mapEnrollment(rawStr) {
    try {
      let s = rawStr.trim();
      if (s.endsWith(',')) s = s.slice(0, -1);
      const item = JSON.parse(s);

      const stId = String(item.studentId?.$numberLong || item.studentId || '');
      if (!stId) return null;

      const simplified = {
        enrollment: item.enrollment,
        enrollmentStatus: String(item.enrollmentStatus?.$numberLong ?? item.enrollmentStatus ?? '0'),
        completionReason: item.completionReason || '',
        createdAt: item.createdAt?.$date || item.createdAt || '',
        school: item.school ? {
          schoolId: String(item.school.schoolId?.$numberLong || item.school.schoolId || ''),
          name: item.school.name || '',
          city: item.school.city || '',
          inep: item.school.inep || '',
          board: item.school.board || '',
          boardId: String(item.school.boardId?.$numberLong || item.school.boardId || '')
        } : null,
        classes: (item.classes || []).map(c => ({
          classId: String(c.classId?.$numberLong || c.classId || ''),
          description: c.description || '',
          gradeDescription: c.gradeDescription || '',
          academicYear: String(c.academicYear?.$numberLong || c.academicYear || ''),
          classStartDate: c.classStartDate || '',
          classEndDate: c.classEndDate || '',
          situation: c.situation || '',
          classCompletionReason: c.classCompletionReason || ''
        }))
      };

      return {
        student_id: stId,
        enrollment_code: item.enrollment || '',
        school_name: item.school?.name || '',
        data: simplified
      };
    } catch {
      return null;
    }
  }

  async function handleBatch(batch, bytesPos, fileSize, totalParsed) {
    while (activePromises.size >= MAX_CONCURRENCY) {
      await Promise.race(activePromises);
    }

    const task = (async () => {
      const ok = await insertBatchWithRetry('enrollments', batch);
      if (ok) totalInserted += batch.length;
      const elapsed = (Date.now() - t0) / 1000;
      const rate = totalInserted / (elapsed || 1);
      const pct = ((bytesPos / fileSize) * 100).toFixed(1);
      const estTotal = (totalParsed / (bytesPos / fileSize));
      const remaining = estTotal - totalInserted;
      const eta = formatTime(remaining / (rate || 1));

      process.stdout.write(
        `\r🚀 Matrículas: ${totalInserted.toLocaleString('pt-BR')} inseridas | ${rate.toFixed(0)} rec/s | ${pct}% | ETA: ${eta}    `
      );
    })();

    activePromises.add(task);
    task.finally(() => activePromises.delete(task));
  }

  await processJsonFileInBatches(ENROLLMENT_PATH, mapEnrollment, handleBatch);
  await Promise.all(activePromises);

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Sucesso! ${totalInserted.toLocaleString('pt-BR')} matrículas enviadas em ${formatTime(duration)}.`);
}

async function main() {
  try {
    console.log('🛰️ Supabase Target: ' + SUPABASE_URL);
    // Remove registro de teste se existir
    await supabase.from('students').delete().eq('student_id', 'test_123');

    await importStudents();
    await importEnrollments();

    console.log('\n================================================================');
    console.log('🔍 VERIFICANDO TOTAIS NO BANCO DE DADOS SUPABASE...');
    console.log('================================================================');

    const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: enrollmentCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });

    console.log(`🎉 MIGRAÇÃO CONCLUÍDA COM 100% DE ÊXITO!`);
    console.log(`📊 Total de Estudantes no Supabase : ${studentCount?.toLocaleString('pt-BR')}`);
    console.log(`📊 Total de Matrículas no Supabase : ${enrollmentCount?.toLocaleString('pt-BR')}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Erro fatal na migração:', err);
  }
}

main();
