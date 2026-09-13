'use strict';

const express = require('express');
const db = require('../db.js');

const router = express.Router();

// GET /api/glossary - full list; clients filter/search locally.
router.get('/glossary', (req, res) => {
  const rows = db.prepare('SELECT id, term, definition, related_term_ids FROM glossary_terms ORDER BY term').all();
  const terms = rows.map((r) => ({
    id: r.id,
    term: r.term,
    definition: r.definition,
    related_term_ids: (() => {
      try {
        return JSON.parse(r.related_term_ids || '[]');
      } catch (err) {
        return [];
      }
    })(),
  }));
  res.json({ terms });
});

module.exports = router;