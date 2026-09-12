# Changelog

[🇩🇪 Deutsch](CHANGELOG.md) · 🇬🇧 English

Newest entries first. Versioning scheme: see [README.en.md](README.en.md).

<!-- ENTRIES -->

## [Codewerk 0.0.2] – 2026-09-11
- Electron app for Windows: home screen with five courses (Python, JavaScript, Java, C#, C++) as self-contained mini apps.
- AI mentor through the learner's own Claude account (Claude Agent SDK, no API key needed); mentor instructions in German and English.
- Daily sessions: every learning day starts with the saved learning profile, the previous chat is archived.
- Tools for the mentor: load an exercise into the editor and save the learning profile; Claude Code's built-in tools are disabled.
- Code editor with execution: Python (Pyodide) and JavaScript inside the app, Java/C#/C++ through local compilers, time limit against endless loops.
- Learning profile sidebar, course commands as buttons, UI in German and English.
- Automatic updates through GitHub Releases; `npm run bump` and `npm run release` scripts for versioned commits and releases.
- Unit tests and an app selftest (`npm run selftest`).

## [Codewerk 0.0.1] – 2026-09-11
- Git repository created, commit rules defined, documentation in German and English.
