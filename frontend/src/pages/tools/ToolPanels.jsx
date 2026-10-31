import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildNginx, formatDuration, nextRuns, octalToPerms, parseCidr, parseCron, permsToOctal,
  permsToSymbolic, raidCapacity, splitSubnet, subnetInfo, symbolicToPerms, transferSeconds,
} from './toolsLogic';

const Copy = ({ text }) => {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      setDone(false);
    }
  };
  return <button type="button" className="tl-copy" onClick={copy}>{done ? t('tools.copied') : t('tools.copy')}</button>;
};

const Result = ({ rows }) => (
  <dl className="tl-result">
    {rows.map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v}</dd>
      </div>
    ))}
  </dl>
);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fixed = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/* ── 서브넷 ── */
export const SubnetTool = () => {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('192.168.0.10/24');
  const [split, setSplit] = useState(0);
  const parsed = parseCidr(text);
  const info = parsed && subnetInfo(parsed);
  const sub = parsed && split ? splitSubnet(parsed, split) : null;
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';

  return (
    <>
      <label className="tl-field">
        <span>{t('tools.subnet.input')}</span>
        <input value={text} onChange={(e) => { setText(e.target.value); setSplit(0); }} spellCheck="false" placeholder="10.0.0.1/8" />
      </label>
      {!parsed && <p className="tl-error" role="alert">{t('tools.subnet.invalid')}</p>}
      {info && (
        <>
          <Result rows={[
            [t('tools.subnet.cidr'), info.cidr],
            [t('tools.subnet.mask'), info.mask],
            [t('tools.subnet.wildcard'), info.wildcard],
            [t('tools.subnet.broadcast'), info.broadcast],
            [t('tools.subnet.range'), `${info.first} ~ ${info.last}`],
            [t('tools.subnet.hosts'), info.hosts.toLocaleString(locale)],
            [t('tools.subnet.kind'), t(`tools.subnet.kinds.${info.kind}`)],
          ]} />
          {info.prefix < 32 && (
            <label className="tl-field">
              <span>{t('tools.subnet.split')}</span>
              <select value={split} onChange={(e) => setSplit(Number(e.target.value))}>
                <option value={0}>{t('tools.subnet.no_split')}</option>
                {Array.from({ length: Math.min(32 - info.prefix, 12) }, (_, i) => info.prefix + i + 1).map((p) => (
                  <option key={p} value={p}>/{p}</option>
                ))}
              </select>
            </label>
          )}
          {sub && (
            <>
              <p className="tl-note">{t('tools.subnet.split_count', { count: sub.total, total: sub.total.toLocaleString(locale) })}</p>
              <div className="tl-table-wrap">
                <table className="tl-table">
                  <thead><tr><th>{t('tools.subnet.cidr')}</th><th>{t('tools.subnet.range')}</th><th>{t('tools.subnet.broadcast')}</th></tr></thead>
                  <tbody>
                    {sub.items.map((s) => <tr key={s.cidr}><td>{s.cidr}</td><td>{s.first} ~ {s.last}</td><td>{s.broadcast}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
};

/* ── RAID ── */
export const RaidTool = () => {
  const { t } = useTranslation();
  const [level, setLevel] = useState(5);
  const [disks, setDisks] = useState(4);
  const [size, setSize] = useState(4);
  const [groups, setGroups] = useState(2);
  const r = raidCapacity({ level, disks: Math.floor(num(disks)), size: num(size), groups: Math.floor(num(groups)) });

  return (
    <>
      <div className="tl-grid">
        <label className="tl-field">
          <span>{t('tools.raid.level')}</span>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {[0, 1, 5, 6, 10, 50, 60].map((l) => <option key={l} value={l}>RAID {l}</option>)}
          </select>
        </label>
        <label className="tl-field">
          <span>{t('tools.raid.disks')}</span>
          <input type="number" min="1" max="256" value={disks} onChange={(e) => setDisks(e.target.value)} />
        </label>
        <label className="tl-field">
          <span>{t('tools.raid.size')}</span>
          <input type="number" min="0.1" step="0.1" value={size} onChange={(e) => setSize(e.target.value)} />
        </label>
        {(level === 50 || level === 60) && (
          <label className="tl-field">
            <span>{t('tools.raid.groups')}</span>
            <input type="number" min="2" value={groups} onChange={(e) => setGroups(e.target.value)} />
          </label>
        )}
      </div>
      {r.error ? (
        <p className="tl-error" role="alert">{t(`tools.raid.err_${r.error}`, { min: r.min, per: r.perGroup })}</p>
      ) : (
        <>
          <div className="tl-bar" role="img" aria-label={`${r.efficiency.toFixed(1)}%`}>
            <span style={{ width: `${r.efficiency}%` }} />
          </div>
          <Result rows={[
            [t('tools.raid.usable'), `${fixed(r.usable)} TB (${r.usableTiB.toFixed(2)} TiB)`],
            [t('tools.raid.raw'), `${fixed(r.raw)} TB`],
            [t('tools.raid.redundancy'), `${fixed(r.parity)} TB`],
            [t('tools.raid.efficiency'), `${r.efficiency.toFixed(1)}%`],
            [t('tools.raid.tolerance'), r.tolerance.min === r.tolerance.max
              ? t('tools.raid.tol_one', { n: r.tolerance.min })
              : t('tools.raid.tol_range', { min: r.tolerance.min, max: r.tolerance.max })],
            [t('tools.raid.penalty'), t('tools.raid.penalty_val', { n: r.writePenalty })],
          ]} />
          {level === 5 && num(size) >= 8 && <p className="tl-warn">{t('tools.raid.warn_r5')}</p>}
          {level === 0 && <p className="tl-warn">{t('tools.raid.warn_r0')}</p>}
        </>
      )}
    </>
  );
};

/* ── cron ── */
const PRESETS = [['*/5 * * * *', 'every5'], ['0 * * * *', 'hourly'], ['0 3 * * *', 'daily3'], ['0 9 * * 1-5', 'weekday9'], ['0 0 1 * *', 'monthly']];

export const CronTool = () => {
  const { t, i18n } = useTranslation();
  const [expr, setExpr] = useState('0 9 * * 1-5');
  const cron = useMemo(() => parseCron(expr), [expr]);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
  const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const runs = cron.error ? [] : nextRuns(cron);

  return (
    <>
      <label className="tl-field">
        <span>{t('tools.cron.input')}</span>
        <input className="tl-mono" value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck="false" />
      </label>
      <div className="tl-cron-legend" aria-hidden="true">
        {['minute', 'hour', 'dom', 'month', 'dow'].map((f) => <span key={f}>{t(`tools.cron.f_${f}`)}</span>)}
      </div>
      <div className="tl-chips">
        {PRESETS.map(([v, k]) => <button key={k} type="button" onClick={() => setExpr(v)}>{t(`tools.cron.p_${k}`)}</button>)}
      </div>
      {cron.error ? (
        <p className="tl-error" role="alert">
          {cron.error === 'fields' ? t('tools.cron.err_fields') : t('tools.cron.err_field', { f: t(`tools.cron.f_${cron.error}`) })}
        </p>
      ) : (
        <>
          <h3 className="tl-sub">{t('tools.cron.next')}</h3>
          {runs.length
            ? <ol className="tl-runs">{runs.map((d) => <li key={d.getTime()}>{fmt.format(d)}</li>)}</ol>
            : <p className="tl-note">{t('tools.cron.never')}</p>}
          <p className="tl-note">{t('tools.cron.tz')}</p>
          <div className="tl-code-row">
            <code>{`${expr.trim()} /path/to/script.sh`}</code>
            <Copy text={`${expr.trim()} /path/to/script.sh`} />
          </div>
        </>
      )}
    </>
  );
};

/* ── chmod ── */
export const ChmodTool = () => {
  const { t } = useTranslation();
  const [perms, setPerms] = useState(() => octalToPerms('755'));
  const [text, setText] = useState('755');
  const [recursive, setRecursive] = useState(false);
  const [bad, setBad] = useState(false);

  const octal = permsToOctal(perms);
  const symbolic = permsToSymbolic(perms);
  const command = `chmod ${recursive ? '-R ' : ''}${octal} ${t('tools.chmod.target')}`;

  const apply = (p) => { setPerms(p); setText(permsToOctal(p)); setBad(false); };
  const onText = (v) => {
    setText(v);
    const p = octalToPerms(v.trim()) || symbolicToPerms(v);
    setBad(!p);
    if (p) setPerms(p);
  };
  const flip = (who, bit) => apply({ ...perms, [who]: { ...perms[who], [bit]: !perms[who][bit] } });
  const flipSpecial = (bit) => apply({ ...perms, special: perms.special ^ bit });

  return (
    <>
      <label className="tl-field">
        <span>{t('tools.chmod.input')}</span>
        <input className="tl-mono" value={text} onChange={(e) => onText(e.target.value)} spellCheck="false" />
      </label>
      {bad && <p className="tl-error" role="alert">{t('tools.chmod.invalid')}</p>}
      <div className="tl-table-wrap">
        <table className="tl-table tl-perm">
          <thead><tr><th /><th>{t('tools.chmod.read')}</th><th>{t('tools.chmod.write')}</th><th>{t('tools.chmod.exec')}</th></tr></thead>
          <tbody>
            {['owner', 'group', 'other'].map((who) => (
              <tr key={who}>
                <th scope="row">{t(`tools.chmod.${who}`)}</th>
                {['r', 'w', 'x'].map((b) => (
                  <td key={b}><input type="checkbox" checked={perms[who][b]} onChange={() => flip(who, b)} aria-label={`${t(`tools.chmod.${who}`)} ${b}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tl-checks">
        {[[4, 'setuid'], [2, 'setgid'], [1, 'sticky']].map(([bit, k]) => (
          <label key={k}><input type="checkbox" checked={!!(perms.special & bit)} onChange={() => flipSpecial(bit)} /> {t(`tools.chmod.${k}`)}</label>
        ))}
        <label><input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} /> {t('tools.chmod.recursive')}</label>
      </div>
      <Result rows={[[t('tools.chmod.octal'), octal], [t('tools.chmod.symbolic'), symbolic]]} />
      <div className="tl-code-row"><code>{command}</code><Copy text={command} /></div>
      {octal.endsWith('777') && <p className="tl-warn">{t('tools.chmod.warn_777')}</p>}
    </>
  );
};

/* ── nginx ── */
export const NginxTool = () => {
  const { t } = useTranslation();
  const [c, setC] = useState({ domain: 'example.com', upstream: 'http://127.0.0.1:8080', spaRoot: '', maxBody: 50, ssl: true, websocket: false, gzip: true, hsts: true });
  const set = (k) => (e) => setC((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const conf = buildNginx({ ...c, maxBody: num(c.maxBody) });

  return (
    <>
      <div className="tl-grid">
        <label className="tl-field"><span>{t('tools.nginx.domain')}</span><input value={c.domain} onChange={set('domain')} spellCheck="false" /></label>
        <label className="tl-field"><span>{t('tools.nginx.upstream')}</span><input value={c.upstream} onChange={set('upstream')} spellCheck="false" /></label>
        <label className="tl-field"><span>{t('tools.nginx.root')}</span><input value={c.spaRoot} onChange={set('spaRoot')} placeholder="/var/www/html" spellCheck="false" /></label>
        <label className="tl-field"><span>{t('tools.nginx.body')}</span><input type="number" min="0" value={c.maxBody} onChange={set('maxBody')} /></label>
      </div>
      <div className="tl-checks">
        {['ssl', 'websocket', 'gzip', 'hsts'].map((k) => (
          <label key={k}><input type="checkbox" checked={c[k]} disabled={k === 'hsts' && !c.ssl} onChange={set(k)} /> {t(`tools.nginx.${k}`)}</label>
        ))}
      </div>
      <div className="tl-code-head"><h3 className="tl-sub">{`${c.domain || 'example.com'}.conf`}</h3><Copy text={conf} /></div>
      <pre className="tl-pre"><code>{conf}</code></pre>
      <p className="tl-note">{t('tools.nginx.after')}</p>
    </>
  );
};

/* ── 전송 시간 ── */
export const TransferTool = () => {
  const { t } = useTranslation();
  const [size, setSize] = useState(1);
  const [sizeUnit, setSizeUnit] = useState('TB');
  const [speed, setSpeed] = useState(1);
  const [speedUnit, setSpeedUnit] = useState('Gbps');
  const [overhead, setOverhead] = useState(10);
  const sec = transferSeconds({ size: num(size), sizeUnit, speed: num(speed), speedUnit, overhead: Math.min(90, Math.max(0, num(overhead))) });

  return (
    <>
      <div className="tl-grid">
        <div className="tl-field tl-pair">
          <label htmlFor="tl-size">{t('tools.transfer.size')}</label>
          <div>
            <input id="tl-size" type="number" min="0" value={size} onChange={(e) => setSize(e.target.value)} />
            <select aria-label={t('tools.transfer.size')} value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)}>
              {['MB', 'GB', 'TB', 'GiB', 'TiB'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="tl-field tl-pair">
          <label htmlFor="tl-speed">{t('tools.transfer.speed')}</label>
          <div>
            <input id="tl-speed" type="number" min="0" value={speed} onChange={(e) => setSpeed(e.target.value)} />
            <select aria-label={t('tools.transfer.speed')} value={speedUnit} onChange={(e) => setSpeedUnit(e.target.value)}>
              {['Mbps', 'Gbps', 'MB/s', 'GB/s'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <label className="tl-field">
          <span>{t('tools.transfer.overhead')}</span>
          <input type="number" min="0" max="90" value={overhead} onChange={(e) => setOverhead(e.target.value)} />
        </label>
      </div>
      {sec == null
        ? <p className="tl-error" role="alert">{t('tools.transfer.invalid')}</p>
        : (
          <p className="tl-big">
            {formatDuration(sec).map((p) => `${p.v}${t(`tools.transfer.u_${p.u}`)}`).join(' ')}
          </p>
        )}
      <p className="tl-note">{t('tools.transfer.note')}</p>
    </>
  );
};
