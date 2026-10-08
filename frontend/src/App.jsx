import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Clock3, Footprints, LocateFixed, Map, MapPin, Navigation, RefreshCw, Route, Sparkles, Users } from 'lucide-react'
import './App.css'

const nodes = [
  { id: 'R & E Block', x: 95, y: 110, type: 'block' }, { id: 'Statue', x: 340, y: 82, type: 'landmark' },
  { id: 'Main', x: 340, y: 205, type: 'hub' }, { id: 'L Block', x: 565, y: 135, type: 'block' },
  { id: 'A Block', x: 575, y: 320, type: 'block' }, { id: 'Open Audit', x: 340, y: 350, type: 'landmark' },
  { id: 'Library', x: 112, y: 445, type: 'landmark' }, { id: 'Canteen', x: 570, y: 500, type: 'landmark' },
  { id: 'Cricket Ground', x: 100, y: 570, type: 'ground' }, { id: 'Football Ground', x: 340, y: 570, type: 'ground' },
]
const edges = [
  ['R & E Block','Main',120], ['Statue','Main',70], ['L Block','Main',110], ['Main','A Block',140],
  ['L Block','Open Audit',80], ['Open Audit','A Block',75], ['L Block','Library',60], ['Library','Open Audit',90],
  ['Open Audit','Canteen',85], ['A Block','Canteen',55], ['Library','Cricket Ground',100],
  ['Cricket Ground','Football Ground',130], ['Football Ground','Canteen',95],
]
const crowds = [{ id: 'Low', factor: '1.0×', text: 'Quiet paths' }, { id: 'Moderate', factor: '1.3×', text: 'Some activity' }, { id: 'High', factor: '1.7×', text: 'Busy paths' }]
const API = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

function CampusMap({ route }) {
  const positions = Object.fromEntries(nodes.map(n => [n.id, n]))
  const pathEdges = new Set((route?.route || []).slice(1).map((n, i) => [route.route[i], n].sort().join('|')))
  const activeNodes = new Set(route?.route || [])
  return <div className="map-wrap"><svg className="campus-map" viewBox="0 0 680 630" role="img" aria-label="Illustrative campus path map">
    <defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#dce4da" /></pattern></defs>
    <rect x="0" y="0" width="680" height="630" rx="22" fill="url(#dots)" />
    <path className="green-space" d="M375 250 Q470 210 535 260 Q522 305 442 319 Q390 302 375 250 M145 500 Q235 472 284 517 L286 590 Q205 610 137 573Z" />
    <text className="map-label park-label" x="446" y="277">CAMPUS GREEN</text><text className="map-label park-label" x="203" y="550">OPEN LAWN</text>
    {edges.map(([a,b,d]) => { const p=positions[a], q=positions[b], key=[a,b].sort().join('|'), active=pathEdges.has(key); return <g key={key}>
      <line className={`edge ${active?'edge-active':''}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
      {active && <line className="edge-glow" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />}
      <g className="distance-tag" transform={`translate(${(p.x+q.x)/2}, ${(p.y+q.y)/2})`}><rect x="-23" y="-11" width="46" height="22" rx="7"/><text textAnchor="middle" dy="4">{d}m</text></g>
    </g> })}
    {nodes.map(n => { const start=route?.route?.[0]===n.id, end=route?.route?.at(-1)===n.id, active=activeNodes.has(n.id); return <g className={`node ${active?'node-active':''}`} key={n.id} transform={`translate(${n.x},${n.y})`}>
      {active && <circle className="node-halo" r="26"/>}<circle className={`node-dot ${n.type}`} r="17"/>
      {start && <text className="marker" y="-29" textAnchor="middle">START</text>}{end && <text className="marker" y="-29" textAnchor="middle">DESTINATION</text>}
      <text className={`node-label ${n.type==='ground'?'ground-label':''}`} x={n.x<200?24:-24} y="5" textAnchor={n.x<200?'start':'end'}>{n.id}</text>
    </g> })}
    <g className="north" transform="translate(630 45)"><text x="0" y="-10" textAnchor="middle">N</text><path d="M0 0 L-6 16 L0 12 L6 16Z"/></g>
  </svg><div className="map-caption"><span><i className="legend-line"/> Recommended route</span><span><i className="legend-dot"/> Campus locations</span><span className="sim-note">Illustrative layout · simulated distances</span></div></div>
}

export default function App() {
  const [source, setSource] = useState('Main'), [destination, setDestination] = useState('Library'), [crowd, setCrowd] = useState('Moderate')
  const [result, setResult] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const ready = useMemo(() => source !== destination, [source,destination])
  async function findRoute() {
    if (!ready) { setError('Choose two different locations to plan a route.'); return }
    setLoading(true); setError('')
    try {
      const response = await fetch(`${API}/route`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source,destination,crowd}) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The route request failed.')
      setResult(data)
    } catch (e) { setError(`Could not reach the C++ route service. Make sure it is running at ${API}. ${e.message}`) }
    finally { setLoading(false) }
  }
  function swap() { setSource(destination); setDestination(source); setResult(null); setError('') }
  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Route size={20}/></span><span>campus<span className="brand-light">flow</span><small>CBIT ROUTE PLANNER</small></span></a>
      <div className="top-status"><span className="status-dot"/> DEMO MODE <span className="top-divider"/> <span className="sim-pill">SIMULATED DATA</span></div>
      <button className="help-button" onClick={()=>document.getElementById('about').scrollIntoView({behavior:'smooth'})}>About this demo <ArrowUpRight size={15}/></button>
    </header>
    <section className="hero" id="top"><div className="eyebrow"><Sparkles size={14}/> SMARTER CAMPUS MOVEMENT</div><h1>Find your way.<br/><span>Skip the crowd.</span></h1><p>Choose where you’re headed and we’ll map the best route across campus, with crowd levels factored in.</p></section>
    <section className="planner-grid">
      <aside className="control-card"><div className="card-heading"><div><span className="step-label">YOUR JOURNEY</span><h2>Plan a route</h2></div><span className="heading-icon"><Navigation size={19}/></span></div>
        <label className="field-label" htmlFor="start">STARTING POINT</label><div className="select-wrap"><span className="select-indicator start-indicator"/><select id="start" value={source} onChange={e=>{setSource(e.target.value);setResult(null)}}>{nodes.map(n=><option key={n.id}>{n.id}</option>)}</select><ArrowDown size={16}/></div>
        <button className="swap-button" aria-label="Swap start and destination" onClick={swap}><ArrowUpRight size={15}/></button>
        <label className="field-label destination-label" htmlFor="destination">DESTINATION</label><div className="select-wrap"><span className="select-indicator end-indicator"/><select id="destination" value={destination} onChange={e=>{setDestination(e.target.value);setResult(null)}}>{nodes.map(n=><option key={n.id}>{n.id}</option>)}</select><ArrowDown size={16}/></div>
        <div className="crowd-heading"><span className="field-label">CROWD LEVEL</span><span className="live-label"><span className="tiny-dot"/> SIMULATED</span></div>
        <div className="crowd-options">{crowds.map(c=><button key={c.id} className={`crowd-option ${crowd===c.id?'selected':''} crowd-${c.id.toLowerCase()}`} onClick={()=>{setCrowd(c.id);setResult(null)}}><span className="crowd-top"><span>{c.id}</span><b>{c.factor}</b></span><small>{c.text}</small></button>)}</div>
        <button className="find-button" disabled={loading} onClick={findRoute}>{loading?<><RefreshCw size={17} className="spin"/> Finding route…</>:<>Find best route <ArrowRight size={17}/></>}</button>
        {error && <div className="error-message" role="alert">{error}</div>}
        <p className="algorithm-note"><span className="algorithm-icon">D</span><span><b>Powered by Dijkstra’s algorithm</b><br/>Finds the lowest crowd-adjusted path.</span></p>
      </aside>
      <section className="map-card"><div className="map-header"><div><span className="step-label">CAMPUS OVERVIEW</span><h2>CBIT campus map <span className="map-tag"><Map size={12}/> ILLUSTRATIVE</span></h2></div><span className="map-location"><MapPin size={15}/> Gandipet, Hyderabad</span></div>
        <CampusMap route={result}/>
        <div className="map-footer"><span><span className="footer-icon"><Users size={15}/></span>Crowd-adjusted pathfinding</span><span><span className="footer-icon"><LocateFixed size={15}/></span>10 locations · 13 paths</span></div>
      </section>
    </section>
    {result && <section className="results-card"><div className="result-title"><div><span className="step-label">YOUR RECOMMENDED ROUTE</span><h2>{result.route[0]} <ArrowRight size={18}/> {result.route.at(-1)}</h2></div><span className={`result-crowd ${crowd.toLowerCase()}`}><Users size={14}/>{crowd} crowd · {result.multiplier}×</span></div>
      <div className="metrics"><div className="metric"><span className="metric-icon"><Footprints size={17}/></span><span><b>{result.distance} m</b><small>Walking distance</small></span></div><div className="metric"><span className="metric-icon"><Sparkles size={17}/></span><span><b>{Number(result.effectiveCost).toFixed(0)} pts</b><small>Effective route cost</small></span></div><div className="metric"><span className="metric-icon"><Clock3 size={17}/></span><span><b>~{result.estimatedMinutes} min</b><small>Estimated walking time</small></span></div></div>
      <div className="route-steps">{result.route.map((place,i)=><span className={`route-place ${i===0?'route-start':''} ${i===result.route.length-1?'route-end':''}`} key={place}>{i>0&&<i/>}{place}</span>)}</div><p className="estimate-note">Time estimate assumes a steady 80 m/min walking pace. All values are illustrative.</p>
    </section>}
    <footer id="about"><span>Campus Flow <b>·</b> Student project demo</span><span>Route choices are simulated and do not represent live crowd conditions.</span></footer>
  </main>
}
