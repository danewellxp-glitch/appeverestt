// Cria no EMULADOR do Firebase Auth os mesmos usuários do prisma/seed.ts (só desenvolvimento).
// Uso: pnpm emu (em outro terminal) e depois pnpm --filter api seed:firebase
// No primeiro POST /auth/sessao, a API vincula cada conta ao usuário do seed pelo e-mail verificado.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { carregarEnv, sair } from './_util';

carregarEnv();

const SENHA_DEV = 'everest-dev-123';
const USUARIOS_DEV = [
  { nome: 'Anderson Dev', email: 'admin@everest.dev' },
  { nome: 'Maria Souza Lima', email: 'maria@everest.dev' },
  { nome: 'João Pereira', email: 'joao@everest.dev' },
  { nome: 'Ana Clara Ribeiro', email: 'ana@everest.dev' },
  { nome: 'Carlos Eduardo Santos', email: 'carlos@everest.dev' },
  { nome: 'Beatriz Almeida', email: 'beatriz@everest.dev' },
] as const;

function codigo(e: unknown): string {
  return typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
}

async function main(): Promise<void> {
  const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!emulador) {
    sair('Defina FIREBASE_AUTH_EMULATOR_HOST (ex.: 127.0.0.1:9099). Este script só roda contra o emulador.');
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-everest';
  const auth = getAuth(initializeApp({ projectId }));

  for (const u of USUARIOS_DEV) {
    const dados = { email: u.email, password: SENHA_DEV, emailVerified: true, displayName: u.nome };
    try {
      const existente = await auth.getUserByEmail(u.email);
      await auth.updateUser(existente.uid, dados);
      console.log(`✔ atualizado ${u.email}`);
    } catch (e) {
      if (codigo(e) !== 'auth/user-not-found') throw e;
      await auth.createUser(dados);
      console.log(`✔ criado ${u.email}`);
    }
  }
  console.log(`\nEmulador ${emulador} (projeto ${projectId}): senha de todos = ${SENHA_DEV}`);
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
