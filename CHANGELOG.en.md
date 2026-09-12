# Changelog

[🇩🇪 Deutsch](CHANGELOG.md) · 🇬🇧 English

Newest entries first. Versioning scheme: see [README.en.md](README.en.md).

<!-- ENTRIES -->

## [Codewerk 0.0.4] – 2026-09-12
- README fully redesigned: banner, badges, course table with language logos, screenshots, Mermaid diagrams for the learning day and architecture, callout boxes
- Own app icon (build/icon.png) instead of the default Electron icon – ships with the next release
- npm run graphics renders banners, icon and real app screenshots (German and English) automatically
- GitHub Actions runs the unit tests on every push
- Pyodide path is resolved relative to the source file – more robust with other entry scripts

## [Codewerk 0.0.3] – 2026-09-12
- release.js creates the GitHub release as a draft first and publishes it only after the upload – prevents duplicate releases
- Release notes are generated from CHANGELOG.md and CHANGELOG.en.md
- bump.js creates annotated tags so they get pushed
- md.js without raw control characters, two new Markdown tests

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
