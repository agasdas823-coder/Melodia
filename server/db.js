import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'users.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

export function readUsers() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading users DB:', err);
    return [];
  }
}

export function writeUsers(users) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing users DB:', err);
    return false;
  }
}
