#!/usr/bin/env node
// Procura marcadores que não podem ir para produção.
// Uso: node scripts/check-placeholders.mjs [--strict]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const strict = process.argv.includes('--strict');
const MARCADORES = ['[LINK_DO_APP]', '@[SEU_@]', 'TODO_DECISAO'];
const EXTENSOES_TEXTO = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.txt', '.svg', '.webmanifest',
]);
const IGNORAR = new Set(['node_modules', 'dist', 'dev-dist', 'coverage']);

function alvos() {
  const lista = [];
  const apps = join(raiz, 'apps');
  if (existsSync(apps)) {
    for (const app of readdirSync(apps)) {
      lista.push(join(apps, app, 'src'));
    }
  }
  lista.push(join(raiz, 'apps', 'web', 'index.html'));
  lista.push(join(raiz, 'apps', 'web', 'public'));
  return lista.filter((p) => existsSync(p));
}

function* arquivos(caminho) {
  const info = statSync(caminho);
  if (info.isFile()) {
    yield caminho;
    return;
  }
  for (const nome of readdirSync(caminho)) {
    if (IGNORAR.has(nome)) continue;
    yield* arquivos(join(caminho, nome));
  }
}

const achados = [];
for (const alvo of alvos()) {
  for (const arquivo of arquivos(alvo)) {
    if (!EXTENSOES_TEXTO.has(extname(arquivo))) continue;
    const linhas = readFileSync(arquivo, 'utf8').split(/\r?\n/);
    linhas.forEach((linha, i) => {
      for (const m of MARCADORES) {
        if (linha.includes(m)) {
          achados.push(`${relative(raiz, arquivo)}:${i + 1}  ${m}  →  ${linha.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

if (achados.length === 0) {
  console.log('check-placeholders: nenhum marcador encontrado.');
  process.exit(0);
}

console.log(`check-placeholders: ${achados.length} marcador(es) encontrado(s):`);
for (const a of achados) console.log(`  ${a}`);
if (strict) {
  console.error('\nFALHOU (--strict): resolva os marcadores acima antes do lançamento.');
  process.exit(1);
}
console.log('\n(aviso apenas; use --strict para falhar)');
