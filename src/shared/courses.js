'use strict';

// The five courses ("mini apps"). Single source of truth for main process and renderer.
// `notes` tell the mentor how code runs inside the app for this language.
const COURSES = [
  {
    id: 'python',
    name: 'Python',
    runtime: 'python',
    fence: 'python',
    color: '#3776ab',
    ink: '#ffffff',
    notes: {
      de: 'Code läuft direkt in der App mit Pyodide (Python im Browser). Die Standardbibliothek ist verfügbar, input() liest Zeile für Zeile aus dem Eingabefeld. Keine Grafik (kein pygame, kein turtle) und kein Zugriff auf echte Dateien des PCs.',
      en: 'Code runs directly in the app with Pyodide (Python in the browser). The standard library is available, input() reads line by line from the input box. No graphics (no pygame, no turtle) and no access to real files on the PC.',
    },
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    runtime: 'javascript',
    fence: 'javascript',
    color: '#f0c419',
    ink: '#111111',
    notes: {
      de: 'Code läuft direkt in der App in einem Web Worker. console.log gibt aus, prompt() liest Zeile für Zeile aus dem Eingabefeld, top-level await ist erlaubt. Kein DOM, kein document, keine Grafik.',
      en: 'Code runs directly in the app inside a Web Worker. console.log prints, prompt() reads line by line from the input box, top-level await is allowed. No DOM, no document, no graphics.',
    },
  },
  {
    id: 'java',
    name: 'Java',
    runtime: 'java',
    fence: 'java',
    color: '#e76f00',
    ink: '#ffffff',
    notes: {
      de: 'Code wird mit dem lokal installierten JDK als einzelne Datei Main.java ausgeführt (java Main.java). Die erste Klasse braucht eine main-Methode. Eingaben kommen über System.in aus dem Eingabefeld.',
      en: 'Code runs with the locally installed JDK as a single file Main.java (java Main.java). The first class needs a main method. Input comes through System.in from the input box.',
    },
  },
  {
    id: 'csharp',
    name: 'C#',
    runtime: 'csharp',
    fence: 'csharp',
    color: '#8a3ffc',
    ink: '#ffffff',
    notes: {
      de: 'Code wird mit dem lokal installierten .NET SDK (ab Version 10) als dateibasierte App ausgeführt (dotnet run Program.cs). Top-level statements sind erlaubt. Console.ReadLine() liest aus dem Eingabefeld. Der erste Lauf dauert einige Sekunden.',
      en: 'Code runs with the locally installed .NET SDK (version 10 or later) as a file-based app (dotnet run Program.cs). Top-level statements are allowed. Console.ReadLine() reads from the input box. The first run takes a few seconds.',
    },
  },
  {
    id: 'cpp',
    name: 'C++',
    runtime: 'cpp',
    fence: 'cpp',
    color: '#00599c',
    ink: '#ffffff',
    notes: {
      de: 'Code wird mit dem lokal installierten g++ (C++17) kompiliert und ausgeführt. std::cin liest aus dem Eingabefeld.',
      en: 'Code is compiled and run with the locally installed g++ (C++17). std::cin reads from the input box.',
    },
  },
];

function courseById(id) {
  return COURSES.find((course) => course.id === id) || null;
}

module.exports = { COURSES, courseById };
