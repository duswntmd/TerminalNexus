import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Result } from './ToolPanels';
import {
  HASH_ALGOS, REGEX_FLAGS, decodeBase64, decodeJwt, decodeUrl, encodeBase64, encodeUrl, formatJson,
  hashAll, matchHash, parseTimestamp, regexSegments, timestampInfo,
} from './devToolsLogic';

const REGEX_TIMEOUT_MS = 1500;
const MAX_FILE_BYTES = 200 * 1024 * 1024;

const Output = ({ text }) => (
  <>
    <div className="tl-code-head">
      <p className="tl-sub">{useTranslation().t('tools.result')}</p>
      <Copy text={text} />
    </div>
    <pre className="tl-pre tl-wrap">{text}</pre>
  </>
);

/* ── JSON ── */
export const JsonTool = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('{"name":"TerminalNexus","tags":["linux","nginx"],"active":true}');
  const [indent, setIndent] = useState(2);
  const [sort, setSort] = useState(false);
  const result = useMemo(() => formatJson(text, { indent, sort }), [text, indent, sort]);

  return (
    <>
      <label className="tl-field">
        <span>{t('tools.json.input')}</span>
        <textarea className="tl-area" rows={9} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" />
      </label>
      <div className="tl-grid">
        <label className="tl-field">
          <span>{t('tools.json.style')}</span>
          <select value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>{t('tools.json.indent', { n: 2 })}</option>
            <option value={4}>{t('tools.json.indent', { n: 4 })}</option>
            <option value={0}>{t('tools.json.minify')}</option>
          </select>
        </label>
      </div>
      <div className="tl-checks">
        <label><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} />{t('tools.json.sort')}</label>
      </div>
      {result?.error && (
        <p className="tl-error" role="alert">
          {result.position ? t('tools.json.invalid_at', result.position) : t('tools.json.invalid')}
        </p>
      )}
      {result?.unsafeNumber && <p className="tl-warn">{t('tools.json.unsafe')}</p>}
      {result?.output !== undefined && <Output text={result.output} />}
    </>
  );
};

/* ── Base64, URL ── */
export const EncodeTool = () => {
  const { t } = useTranslation();
  const [kind, setKind] = useState('base64');
  const [mode, setMode] = useState('encode');
  const [text, setText] = useState('안녕하세요, TerminalNexus!');
  const [urlSafe, setUrlSafe] = useState(false);

  let output = null;
  let error = '';
  if (text) {
    if (kind === 'url') {
      output = mode === 'encode' ? encodeUrl(text) : decodeUrl(text);
      if (output === null) error = t('tools.encode.bad_url');
    } else if (mode === 'encode') {
      output = encodeBase64(text, urlSafe);
    } else {
      const decoded = decodeBase64(text);
      if (!decoded) error = t('tools.encode.bad_base64');
      else if (decoded.binary) error = t('tools.encode.binary', { n: decoded.size });
      else output = decoded.text;
    }
  }
  const swap = () => {
    if (output !== null) setText(output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  return (
    <>
      <div className="tl-grid">
        <label className="tl-field">
          <span>{t('tools.encode.kind')}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="base64">Base64</option>
            <option value="url">URL</option>
          </select>
        </label>
        <label className="tl-field">
          <span>{t('tools.encode.mode')}</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="encode">{t('tools.encode.encode')}</option>
            <option value="decode">{t('tools.encode.decode')}</option>
          </select>
        </label>
      </div>
      <label className="tl-field">
        <span>{t('tools.encode.input')}</span>
        <textarea className="tl-area" rows={5} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" />
      </label>
      {kind === 'base64' && mode === 'encode' && (
        <div className="tl-checks">
          <label><input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />{t('tools.encode.url_safe')}</label>
        </div>
      )}
      {error && <p className="tl-error" role="alert">{error}</p>}
      {output !== null && (
        <>
          <Output text={output} />
          <button type="button" className="tl-copy" onClick={swap}>{t('tools.encode.swap')}</button>
        </>
      )}
    </>
  );
};

/* ── JWT ── */
export const JwtTool = () => {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState('');
  const [now] = useState(() => Date.now());
  const jwt = useMemo(() => (token.trim() ? decodeJwt(token, now) : null), [token, now]);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
  const when = (sec) => (sec === null ? '-' : new Date(sec * 1000).toLocaleString(locale));

  return (
    <>
      <p className="tl-warn">{t('tools.jwt.safety')}</p>
      <label className="tl-field">
        <span>{t('tools.jwt.input')}</span>
        <textarea className="tl-area" rows={5} value={token} onChange={(e) => setToken(e.target.value)} spellCheck="false" autoComplete="off" placeholder="eyJhbGciOi..." />
      </label>
      {token.trim() && !jwt && <p className="tl-error" role="alert">{t('tools.jwt.invalid')}</p>}
      {jwt && (
        <>
          <Result rows={[
            [t('tools.jwt.status'), t(`tools.jwt.statuses.${jwt.status}`)],
            [t('tools.jwt.iat'), when(jwt.iat)],
            [t('tools.jwt.exp'), when(jwt.exp)],
            [t('tools.jwt.nbf'), when(jwt.nbf)],
          ]} />
          {jwt.unsigned && <p className="tl-error">{t('tools.jwt.unsigned')}</p>}
          <p className="tl-sub">{t('tools.jwt.header')}</p>
          <pre className="tl-pre">{JSON.stringify(jwt.header, null, 2)}</pre>
          <p className="tl-sub">{t('tools.jwt.payload')}</p>
          <pre className="tl-pre">{JSON.stringify(jwt.payload, null, 2)}</pre>
          <p className="tl-note">{t('tools.jwt.no_verify')}</p>
        </>
      )}
    </>
  );
};

/* ── 타임스탬프 ── */
export const TimestampTool = () => {
  const { t } = useTranslation();
  const [text, setText] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const parsed = parseTimestamp(text);
  const info = parsed && timestampInfo(parsed.ms);

  return (
    <>
      <div className="tl-code-row">
        <code>{t('tools.timestamp.now')}: {now}</code>
        <button type="button" className="tl-copy" onClick={() => setText(String(now))}>{t('tools.timestamp.use_now')}</button>
      </div>
      <label className="tl-field tl-gap">
        <span>{t('tools.timestamp.input')}</span>
        <input className="tl-mono" value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" placeholder="1700000000 / 2026-01-31 09:00:00" />
      </label>
      {text.trim() && !parsed && <p className="tl-error" role="alert">{t('tools.timestamp.invalid')}</p>}
      {info && (
        <>
          <p className="tl-note">{t(`tools.timestamp.read_${parsed.unit}`)}</p>
          <Result rows={[
            [t('tools.timestamp.seconds'), String(info.seconds)],
            [t('tools.timestamp.millis'), String(info.millis)],
            ['KST (UTC+9)', info.kst],
            ['UTC', info.utc],
            [t('tools.timestamp.local'), info.local],
            ['ISO 8601', info.iso],
          ]} />
        </>
      )}
    </>
  );
};

/* ── 정규식 ── */
const useRegex = (pattern, flags, text) => {
  const [state, setState] = useState({ result: null, timedOut: false });
  const seq = useRef(0);

  useEffect(() => {
    if (!pattern) {
      setState({ result: null, timedOut: false });
      return undefined;
    }
    const id = ++seq.current;
    const worker = new Worker(new URL('./regexWorker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      if (id === seq.current) setState({ result: null, timedOut: true });
    }, REGEX_TIMEOUT_MS);
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      worker.terminate();
      if (data.id === seq.current) setState({ result: data.result, timedOut: false });
    };
    worker.postMessage({ id, pattern, flags, text });
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [pattern, flags, text]);

  return state;
};

export const RegexTool = () => {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('(\\d{1,3}\\.){3}\\d{1,3}');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('192.168.0.6 - - "GET /api/lotto HTTP/1.1" 200\n10.0.0.1 - - "POST /login HTTP/1.1" 401');
  const { result, timedOut } = useRegex(pattern, flags, text);
  const toggle = (flag) => setFlags(flags.includes(flag) ? flags.replace(flag, '') : flags + flag);
  const matches = result?.matches;

  return (
    <>
      <label className="tl-field">
        <span>{t('tools.regex.pattern')}</span>
        <input className="tl-mono" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck="false" />
      </label>
      <div className="tl-checks">
        {REGEX_FLAGS.map((f) => (
          <label key={f}>
            <input type="checkbox" checked={flags.includes(f)} onChange={() => toggle(f)} />
            <span className="tl-mono">{f}</span> {t(`tools.regex.flag_${f}`)}
          </label>
        ))}
      </div>
      <label className="tl-field">
        <span>{t('tools.regex.text')}</span>
        <textarea className="tl-area" rows={6} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" />
      </label>
      {timedOut && <p className="tl-error" role="alert">{t('tools.regex.timeout')}</p>}
      {result?.error && <p className="tl-error" role="alert">{t('tools.regex.invalid', { message: result.error })}</p>}
      {matches && (
        <>
          <p className="tl-sub">{t('tools.regex.count', { n: matches.length })}</p>
          {result.truncated && <p className="tl-warn">{t('tools.regex.truncated', { n: matches.length })}</p>}
          <pre className="tl-pre tl-wrap">
            {regexSegments(text, matches).map((s, i) => (s.match ? <mark key={i} className="tl-mark">{s.text}</mark> : s.text))}
          </pre>
          {matches.length > 0 && (
            <div className="tl-table-wrap">
              <table className="tl-table">
                <thead><tr><th>#</th><th>{t('tools.regex.position')}</th><th>{t('tools.regex.match')}</th><th>{t('tools.regex.groups')}</th></tr></thead>
                <tbody>
                  {matches.slice(0, 100).map((m, i) => (
                    <tr key={m.index}>
                      <td>{i + 1}</td>
                      <td>{m.index}</td>
                      <td>{m.text}</td>
                      <td>{m.groups.map((g) => g ?? '-').join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
};

/* ── 해시 ── */
export const HashTool = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('TerminalNexus');
  const [file, setFile] = useState(null);
  const [hashes, setHashes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expected, setExpected] = useState('');
  const job = useRef(0);

  useEffect(() => {
    const id = ++job.current;
    const run = async () => {
      setError('');
      setHashes(null);
      setBusy(true);
      try {
        const bytes = file ? new Uint8Array(await file.arrayBuffer()) : new TextEncoder().encode(text);
        const result = await hashAll(bytes);
        if (id === job.current) setHashes(result);
      } catch {
        if (id === job.current) setError(t('tools.hash.failed'));
      } finally {
        if (id === job.current) setBusy(false);
      }
    };
    run();
  }, [text, file, t]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(t('tools.hash.too_big'));
      return;
    }
    setFile(f);
  };
  const match = hashes ? matchHash(hashes, expected) : null;

  return (
    <>
      {file ? (
        <div className="tl-code-row">
          <code>{file.name}</code>
          <button type="button" className="tl-copy" onClick={() => setFile(null)}>{t('tools.hash.clear')}</button>
        </div>
      ) : (
        <label className="tl-field">
          <span>{t('tools.hash.input')}</span>
          <textarea className="tl-area" rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck="false" />
        </label>
      )}
      <label className="tl-field tl-gap">
        <span>{t('tools.hash.file')}</span>
        <input type="file" onChange={pick} />
      </label>
      {busy && <p className="tl-note">{t('tools.hash.working')}</p>}
      {error && <p className="tl-error" role="alert">{error}</p>}
      {hashes && HASH_ALGOS.map((algo) => (
        <div className="tl-code-row" key={algo}>
          <code>{algo}: {hashes[algo]}</code>
          <Copy text={hashes[algo]} />
        </div>
      ))}
      <label className="tl-field tl-gap">
        <span>{t('tools.hash.compare')}</span>
        <input className="tl-mono" value={expected} onChange={(e) => setExpected(e.target.value)} spellCheck="false" />
      </label>
      {match && <p className="tl-ok">{t('tools.hash.matched', { algo: match })}</p>}
      {match === false && <p className="tl-error" role="alert">{t('tools.hash.mismatch')}</p>}
      <p className="tl-note">{t('tools.hash.md5_note')}</p>
    </>
  );
};
