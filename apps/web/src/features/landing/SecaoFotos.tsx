import { BookOpen, Droplets, Dumbbell, UsersRound, type LucideIcon } from 'lucide-react';
import { galeria, galeriaVazia, secaoFotos } from '../../content/landing';
import { Foto, PlaceholderFoto } from './Foto';
import { SecaoLanding } from './Secao';

/** Ícones dos placeholders, na ordem de `galeriaVazia.temas`. */
const ICONES_TEMA: LucideIcon[] = [UsersRound, Dumbbell, BookOpen, Droplets];

/** A 1ª foto sai larga; as outras em pares de retrato. Se sobrar uma no fim, ela também sai larga. */
export function fotoLarga(indice: number, total: number): boolean {
  return indice === 0 || (indice === total - 1 && (total - 1) % 2 === 1);
}

function classeTamanho(indice: number, total: number): string {
  return fotoLarga(indice, total) ? 'col-span-2' : '';
}

function proporcao(indice: number, total: number): string {
  return fotoLarga(indice, total) ? 'aspect-[16/10]' : 'aspect-[3/4]';
}

/** "Fotos": galeria de content/landing.ts. Vazia = placeholders desenhados com os temas. */
export function SecaoFotos() {
  const total = galeria.length;
  return (
    <SecaoLanding id="fotos" eyebrow={secaoFotos.eyebrow} titulo={secaoFotos.titulo}>
      {total > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5">
          {galeria.map((foto, i) => (
            <li key={foto.src} className={classeTamanho(i, total)}>
              <Foto
                foto={foto}
                className={`rounded-3xl ${proporcao(i, total)}`}
                placeholder={
                  <PlaceholderFoto Icone={ICONES_TEMA[i % ICONES_TEMA.length] ?? UsersRound} rotulo="" className={proporcao(i, total)} />
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {/* Sem fotos: grade compacta 2×2 (não ocupa a altura de uma galeria de verdade). */}
          <div className="grid grid-cols-2 gap-2.5">
            {galeriaVazia.temas.map((tema, i) => (
              <PlaceholderFoto
                key={tema}
                Icone={ICONES_TEMA[i % ICONES_TEMA.length] ?? UsersRound}
                rotulo={tema}
                className="aspect-[4/3]"
              />
            ))}
          </div>
          <p className="text-[13px] text-texto-2">{galeriaVazia.aviso}</p>
        </>
      )}
    </SecaoLanding>
  );
}
