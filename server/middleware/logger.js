/* OpenClaw IM — Structured Logger with Request ID (5.1) */

let _counter = 0;

function genReqId() {
  return Date.now().toString(36) + '-' + (++_counter).toString(36);
}

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const _logLevel = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

function _ts() {
  const d = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const pad3 = n => String(n).padStart(3, '0');
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
       + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
       + '.' + pad3(d.getMilliseconds());
}

function _fmt(level, mod, reqId, msg) {
  const parts = ['[' + _ts() + ']', '[' + level + ']'];
  if (mod) parts.push('[' + mod + ']');
  if (reqId) parts.push('[' + reqId + ']');
  parts.push(msg);
  return parts.join(' ');
}

function _log(levelName, levelNum, mod, reqId, args) {
  if (levelNum < _logLevel) return;
  const msg = args.map(a => (typeof a === 'string' ? a : (a instanceof Error ? a.message : JSON.stringify(a)))).join(' ');
  const line = _fmt(levelName, mod, reqId, msg);
  if (levelNum >= LEVELS.error) {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

function createLogger(mod, reqId) {
  return {
    debug: (...args) => _log('DEBUG', LEVELS.debug, mod, reqId, args),
    info:  (...args) => _log('INFO',  LEVELS.info,  mod, reqId, args),
    warn:  (...args) => _log('WARN',  LEVELS.warn,  mod, reqId, args),
    error: (...args) => _log('ERROR', LEVELS.error, mod, reqId, args),
    child: (childMod, childReqId) => createLogger(childMod || mod, childReqId || reqId),
  };
}

const rootLogger = createLogger(null, null);

function reqLogger(mod) {
  return (req, res, next) => {
    const id = genReqId();
    req.reqId = id;
    req.log = createLogger(mod || 'http', id);
    if (next) next();
  };
}

module.exports = { genReqId, createLogger, rootLogger, reqLogger };
