# NetForge — Portfolio Summary

## Overview

Full-stack, interactive course platform for learning computer networking (IP addressing, subnetting, protocols, routing, OSI model, and more). Users progress through structured modules and lessons, complete quizzes, and earn badges and streaks — with an automatically generated certificate on completion.

## Features

- 9 modules, 50+ lessons — on-board media, interactive labs, and graded quizzes
- JWT cookie authentication with bcrypt password hashing (register / login / logout)
- Per-user progress tracking: % completion per module and overall, "continue where you left off"
- Gamification: day-streak tracking and earned badges
- Certificate page, printable via CSS print styles
- Light/dark theme, fully responsive (mobile-first) design
- SVG icon system, FAQ, glossary, roadmap, community guidelines, cookie policy, and issue-report pages
- Admin panel for content management and analytics

## Tech Stack

- **Backend:** Node.js, Express 4, better-sqlite3 (SQLite), JSON Web Tokens (jsonwebtoken), cookie-parser, bcryptjs
- **Frontend:** Vanilla HTML, CSS, JavaScript — no frameworks
- **Security:** parameterized SQL, httpOnly auth cookie, sanitized user input, server-side authorization checks
- **Tooling:** seed script for reproducible demo data, smoke-test script, npm scripts (`npm start`, `npm run dev`, `npm run seed`)