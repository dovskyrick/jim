import { LessonContent } from './types.js';

/**
 * Example lesson contents
 * 
 * These are sample lessons you can use to get started.
 * Replace with your actual lesson content.
 */

export const exampleLessons: LessonContent[] = [
  // English Lessons
  {
    languageId: 'english',
    languageName: 'English',
    levelId: 'level1',
    levelName: 'Level 1',
    lessonId: 'lesson1',
    lessonTitle: 'Lesson 1: Introduction',
    text: `Welcome to English Level 1, Lesson 1. In this introductory lesson, we will learn about basic greetings and how to introduce yourself. 
    
    Let's start with some simple phrases. Hello, my name is John. Nice to meet you. How are you today? I am fine, thank you.
    
    Now, let's practice some common greetings. Good morning. Good afternoon. Good evening. Good night.
    
    Remember, practice makes perfect. Listen to this lesson multiple times and try to repeat the phrases out loud. You're doing great!`,
    voice: 'alloy',
  },
  {
    languageId: 'english',
    languageName: 'English',
    levelId: 'level1',
    levelName: 'Level 1',
    lessonId: 'lesson2',
    lessonTitle: 'Lesson 2: Basic Vocabulary',
    text: `Welcome to English Level 1, Lesson 2. Today we will learn some basic vocabulary words that you will use every day.
    
    Let's start with numbers: one, two, three, four, five, six, seven, eight, nine, ten.
    
    Now, some colors: red, blue, green, yellow, orange, purple, black, white, brown, pink.
    
    And finally, some common objects: book, pen, table, chair, door, window, phone, computer, water, food.
    
    Great job! Keep practicing these words until you can say them without thinking.`,
    voice: 'alloy',
  },
  
  // Spanish Lessons
  {
    languageId: 'spanish',
    languageName: 'Spanish',
    levelId: 'level1',
    levelName: 'Nivel 1',
    lessonId: 'lesson1',
    lessonTitle: 'Lección 1: Introducción',
    text: `Bienvenidos al Nivel 1 de Español, Lección 1. En esta lección introductoria, aprenderemos sobre saludos básicos y cómo presentarse.
    
    Comencemos con algunas frases simples. Hola, me llamo Juan. Mucho gusto. ¿Cómo estás hoy? Estoy bien, gracias.
    
    Ahora, practiquemos algunos saludos comunes. Buenos días. Buenas tardes. Buenas noches.
    
    Recuerda, la práctica hace al maestro. Escucha esta lección varias veces e intenta repetir las frases en voz alta. ¡Lo estás haciendo muy bien!`,
    voice: 'nova', // Different voice for variety
  },
  {
    languageId: 'spanish',
    languageName: 'Spanish',
    levelId: 'level1',
    levelName: 'Nivel 1',
    lessonId: 'lesson2',
    lessonTitle: 'Lección 2: Vocabulario Básico',
    text: `Bienvenidos al Nivel 1 de Español, Lección 2. Hoy aprenderemos algunas palabras de vocabulario básico que usarás todos los días.
    
    Comencemos con los números: uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.
    
    Ahora, algunos colores: rojo, azul, verde, amarillo, naranja, morado, negro, blanco, marrón, rosa.
    
    Y finalmente, algunos objetos comunes: libro, bolígrafo, mesa, silla, puerta, ventana, teléfono, computadora, agua, comida.
    
    ¡Excelente trabajo! Sigue practicando estas palabras hasta que puedas decirlas sin pensar.`,
    voice: 'nova',
  },
];

/**
 * Example of generating a single custom lesson
 */
export const customLesson: LessonContent = {
  languageId: 'english',
  languageName: 'English',
  levelId: 'level2',
  levelName: 'Level 2',
  lessonId: 'lesson1',
  lessonTitle: 'Lesson 1: Intermediate Conversation',
  text: `Welcome to English Level 2, Lesson 1. Now that you've mastered the basics, let's move on to more complex conversations.
  
  In this lesson, we'll learn how to talk about your daily routine, discuss your hobbies, and express your opinions.
  
  Let's begin!`,
  voice: 'shimmer', // Try different voices!
};

