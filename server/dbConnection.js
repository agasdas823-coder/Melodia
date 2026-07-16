import dns from 'dns';
import mongoose from 'mongoose';

let dbConnected = false;

function isMongoSrvUri(uri) {
  return typeof uri === 'string' && uri.trim().toLowerCase().startsWith('mongodb+srv://');
}

function parseMongoUri(uri) {
  try {
    return new URL(uri);
  } catch (err) {
    return null;
  }
}

function resolveSrvRecords(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses);
    });
  });
}

function buildNonSrvMongoUri(originalUri, srvRecords) {
  const url = parseMongoUri(originalUri);
  if (!url) {
    throw new Error('Invalid MongoDB URI');
  }

  const auth = url.username ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}@` : '';
  const pathname = url.pathname || '/';
  const dbPath = pathname === '/' ? '' : pathname;
  const search = url.search || '';
  const hosts = srvRecords.map((record) => `${record.name}:${record.port || 27017}`).join(',');
  return `mongodb://${auth}${hosts}${dbPath}${search}`;
}

function createSpotifyError(status, data) {
  const error = new Error(data?.message || 'Spotify service error');
  error.response = { status, data };
  return error;
}

async function tryConnect(uri) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  dbConnected = true;
}

export async function connectDatabase(uri) {
  if (!uri) {
    console.warn('⚠️ No MONGODB_URI configured. Skipping MongoDB connection.');
    dbConnected = false;
    return false;
  }

  try {
    await tryConnect(uri);
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);

    if (isMongoSrvUri(uri) && err.code === 'ECONNREFUSED' && err.syscall === 'querySrv') {
      console.error('⚠️ MongoDB SRV DNS lookup failed. Trying a non-SRV fallback connection URI...');
      const hostname = uri.match(/@([^/]+)\//)?.[1];
      if (hostname) {
        try {
          const records = await resolveSrvRecords(hostname);
          if (records.length > 0) {
            const fallbackUri = buildNonSrvMongoUri(uri, records);
            console.log('🔁 Retrying MongoDB connection with non-SRV URI');
            await tryConnect(fallbackUri);
            console.log('✅ MongoDB connected using non-SRV fallback URI');
            return true;
          }
        } catch (dnsErr) {
          console.error('❌ Direct SRV resolve failed:', dnsErr.message || dnsErr);
        }
      }
    }

    console.warn('⚠️ Continuing server startup without MongoDB. Some features may be unavailable.');
    dbConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return dbConnected;
}

export function requireDbConnection(req, res, next) {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'MongoDB is unavailable. Please try again later.',
      },
    });
  }
  next();
}
