import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPlaylist, getPublicPlaylist } from '../controllers/playlistController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempStoragePath = path.join(__dirname, 'tmp-playlists.json');
process.env.PLAYLIST_STORAGE_PATH = tempStoragePath;

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('createPlaylist stores a public playlist and exposes a shareable link', async () => {
  const req = {
    body: {
      name: 'Shared Mix',
      description: 'Public playlist',
      isPrivate: false,
      tags: ['chill'],
    },
    protocol: 'http',
    get: (header) => header === 'host' ? 'localhost:5173' : '',
  };
  const res = makeRes();

  createPlaylist(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.playlist.isPrivate, false);
  assert.match(res.body.playlist.shareUrl, /\/shared-playlist\//);

  const publicReq = { params: { id: res.body.playlist.id } };
  const publicRes = makeRes();

  getPublicPlaylist(publicReq, publicRes);

  assert.equal(publicRes.statusCode, 200);
  assert.equal(publicRes.body.playlist.name, 'Shared Mix');
});
