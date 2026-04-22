export type Category = 'Dublagem' | 'Locução' | 'Canção' | 'Narração';
export type Level = 'Iniciante' | 'Intermediário' | 'Avançado';

export interface CourseContent {
  moduleTitle: string;
  body: string;
}

export interface Course {
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
