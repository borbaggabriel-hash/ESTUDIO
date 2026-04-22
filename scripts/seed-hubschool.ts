import fs from 'fs';
import path from 'path';

// --- JSON Schema / Interfaces ---

type Category = 'Dublagem' | 'Locução' | 'Canção' | 'Narração';
type Level = 'Iniciante' | 'Intermediário' | 'Avançado';

interface CourseContent {
  moduleTitle: string;
  body: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  category: Category;
  description: string;
  level: Level;
  duration: string; // Ex: "45 min"
  views: number;
  content: CourseContent[];
  thumbnail: string; // URL da imagem
}

// --- Data Generators ---

const categories: Category[] = ['Dublagem', 'Locução', 'Canção', 'Narração'];
const levels: Level[] = ['Iniciante', 'Intermediário', 'Avançado'];

const keywords: Record<Category, string[]> = {
  'Dublagem': ['Sincronia Labial', 'Voz de Personagem', 'Animes', 'Filmes de Ação', 'Dicção', 'Expressividade', 'Dublagem Clássica'],
  'Locução': ['Voz Comercial', 'Radiofonia', 'Postura Vocal', 'Equipamento de Home Studio', 'Locução Corporativa', 'Varejo'],
  'Canção': ['Apoio Diafragmático', 'Vibrato', 'Alcance Vocal', 'Saúde da Voz', 'Afinação', 'Canto Popular', 'Belting'],
  'Narração': ['Audiobooks', 'Contação de Histórias', 'Inflection', 'Ritmo de Leitura', 'Documentários', 'Pausas Dramáticas']
};

const courses: Course[] = [];

categories.forEach(cat => {
  for (let i = 1; i <= 60; i++) {
    const kw = keywords[cat][Math.floor(Math.random() * keywords[cat].length)];
    const title = `${kw}: Módulo ${i} - ${cat === 'Canção' ? 'Técnica Prática' : 'Fundamentos Essenciais'}`;
    
    // Ensure slug is unique by appending i
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + `-${i}`;
    
    courses.push({
      id: `hub-${cat.toLowerCase()}-${i}`,
      title: title,
      slug: slug,
      category: cat,
      description: `Aprenda tudo sobre ${kw} neste minicurso intensivo focado em ${cat}.`,
      level: levels[Math.floor(Math.random() * levels.length)],
      duration: `${Math.floor(Math.random() * (120 - 20) + 20)} min`,
      views: Math.floor(Math.random() * 5000),
      content: [
        {
          moduleTitle: "Introdução Teórica",
          body: `Bem-vindo ao estudo de ${kw}. Neste curso de ${cat}, exploraremos os pilares da voz...`
        },
        {
          moduleTitle: "Exercícios Práticos",
          body: "Repita o exercício de respiração 3x e grave sua voz para análise posterior."
        }
      ],
      thumbnail: `https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(cat)}` // Placeholder
    });
  }
});

const OUTPUT_DIR = path.resolve(process.cwd(), 'client/src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'hubschool-courses.json');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(courses, null, 2));
console.log(`✅ Sucesso: ${courses.length} minicursos gerados em ${OUTPUT_FILE}`);
