-- Create subject_technologies junction table for multi-technology subjects
CREATE TABLE IF NOT EXISTS subject_technologies (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  technology_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(subject_id, technology_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subject_technologies_subject ON subject_technologies(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_technologies_technology ON subject_technologies(technology_id);
