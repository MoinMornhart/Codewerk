# Codewerk

[🇩🇪 Deutsch](README.md) · 🇬🇧 English

**Codewerk version:** 0.0.2

Codewerk is a learning app for Windows. An AI mentor (Claude) teaches you programming – from level 0 to level 10, in five self-contained courses: **Python, JavaScript, Java, C# and C++**. Every course is its own small app with its own level, learning profile, chat and archive. Recommended: one after another, one session every day.

## How a learning day works

1. Open a course and click **"Start a new day"**. The mentor receives your saved learning profile and picks up where you left off.
2. The mentor explains one concept in small steps and loads an **exercise straight into the editor**.
3. You write the code, press **▶ Run** (Ctrl+Enter) and send it with **"Send to mentor"** for review – together with the real output.
4. If something is wrong, the mentor explains the cause and you improve the code together until you understand it.
5. At the end of the day the mentor saves your learning profile. Goal: roughly one level per day – and in the end a small game of your own.

## Features

- Mentor with fixed rules ([prompts/mentor.en.md](prompts/mentor.en.md)): help escalation instead of ready-made solutions, code review format, mistake list with reviews, level exams
- Code execution in the app: Python (Pyodide) and JavaScript without installation; Java, C# and C++ with locally installed compilers; time limit against endless loops
- Input box for `input()`, `prompt()`, `Console.ReadLine()` and friends
- Learning profile sidebar: level, progress, concepts, mistake list, projects, glossary
- Course commands as buttons: `/next`, `/status`, `/again`, `/example`, `/why`, `/solution`, `/glossary`, `/pause`
- UI and mentor in German and English
- Automatic updates through GitHub Releases

## Requirements

- Windows 10 or 11
- A **Claude account (Pro or Max)** signed in to Claude Code – for example through the Claude extension in VS Code or with `claude` in a terminal. The mentor runs on that account: no API key, no extra cost; usage counts against your plan's limits. For people without a Claude account there is an optional field for an Anthropic API key in the settings.
- Only for courses 3–5 (PowerShell):

  | Course | Install |
  |--------|---------|
  | Java   | `winget install Microsoft.OpenJDK.21` |
  | C#     | `winget install Microsoft.DotNet.SDK.10` |
  | C++    | `winget install BrechtSanders.WinLibs.POSIX.UCRT` |

## Installation

Download the installer `Codewerk-Setup-x.y.z.exe` from the [releases page](https://github.com/MoinMornhart/Codewerk/releases). The app is not signed, so Windows SmartScreen asks first ("More info" → "Run anyway"). After that the app updates itself.

## Development

```powershell
npm install        # install dependencies
npm start          # start the app
npm test           # unit tests
npm run selftest   # start the app hidden and check code execution
```

## Versions and updates

Versions follow the counter system: every update raises the last digit by 1. When a digit would go above 9, it rolls over to 0 and the digit to its left increases by 1.

    0.0.1 → 0.0.2 → … → 0.0.9 → 0.1.0 → … → 0.9.9 → 1.0.0

Publishing a new version:

```powershell
npm run bump -- --title "Short title" --de "Änderung 1" --de "Änderung 2" --en "Change 1" --en "Change 2"
npm run release
```

`bump` raises the version, adds the changes to `CHANGELOG.md` and `CHANGELOG.en.md`, commits everything and sets the tag `vX.Y.Z`. `release` pushes, builds the installer and publishes it as a GitHub release – installed apps pick up the update automatically.

## Git rules

Every update is its own commit. The title always names the new version; the body lists the changes in German and English:

    [Codewerk 0.0.3] Short title

    DE:
    - Änderung
    EN:
    - Change

Run `git log` to see the full history.

## Project structure

```
src/main/       main process: window, mentor (Claude Agent SDK), code execution, updates, storage
src/renderer/   UI: HTML, CSS, app logic, Markdown, translations, web workers
src/shared/     course list and version logic
prompts/        mentor instructions (German and English)
scripts/        bump.js and release.js
test/           unit tests (node --test)
```

## Data and privacy

Chats, learning profiles and settings live in `%APPDATA%\Codewerk\codewerk-data.json`. An optional API key is stored encrypted by Windows. The mentor has no access to files or the command line; chat content goes to Anthropic through Claude Code.
