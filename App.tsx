import React, { useMemo, useState, useEffect } from 'react'

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1)
const clamp = (n:number, min:number, max:number) => Math.max(min, Math.min(max, n))

function parseNums(str:string){ if(!str) return []; return str.split(/[;,\s]+/).map(s=>s.trim()).filter(Boolean).map(Number).map(n=>Number.isFinite(n)?n:0).slice(0,18) }
function fill18(arr:number[], defVal:number){ const out = Array(18).fill(defVal) as number[]; arr.forEach((v,i)=>{ if(i<18) out[i]=v }); return out }
function buildHcpOrderFromIndices(hcpIndexArr:number[]){ return HOLES.map(h=>({hole:h,idx:hcpIndexArr[h-1]||18})).sort((a,b)=>a.idx-b.idx).map(p=>p.hole) }
function cycleAllocations(total:number, order:number[]){ const strokes:Record<number,number> = Object.fromEntries(HOLES.map(h=>[h,0])); let r=total; while(r>0){ for(let i=0;i<18 && r>0;i++){ const hole=order[i]; strokes[hole]+=1; r--; } } return strokes }
function net(gross?:number, s?:number){ if(!Number.isFinite(gross)) return null; return (gross as number) - (s||0) }
function winnerSingles(a: number|null, b: number|null){ if(a==null||b==null) return null; if(a<b) return 'A'; if(b<a) return 'B'; return 'H' }
function winnerFourball(a1:number|null,a2:number|null,b1:number|null,b2:number|null){ const A=[a1,a2].filter((v)=>v!=null) as number[]; const B=[b1,b2].filter((v)=>v!=null) as number[]; if(!A.length||!B.length) return null; const bestA=Math.min(...A), bestB=Math.min(...B); if(bestA<bestB) return 'A'; if(bestB<bestA) return 'B'; return 'H' }
function statusFrom(results:(string|null)[]){ let a=0,b=0; for(const r of results){ if(r==='A') a++; else if(r==='B') b++; } const played=results.filter(r=>r!=null).length; const left=18-played; if(a> b+left) return {text:`A gana ${a-b} y ${left}`, winner:'A', complete:true}; if(b> a+left) return {text:`B gana ${b-a} y ${left}`, winner:'B', complete:true}; if(played===18){ if(a>b) return {text:`A gana ${a-b} arriba`, winner:'A', complete:true}; if(b>a) return {text:`B gana ${b-a} arriba`, winner:'B', complete:true}; return {text:'Empate (AS)', winner:'H', complete:true}; } const up=a-b; if(up>0) return {text:`A ${up} arriba`, winner:null, complete:false}; if(up<0) return {text:`B ${-up} arriba`, winner:null, complete:false}; return {text:'All square', winner:null, complete:false}; }

const defaultCourse = {
  name: 'Villarrica',
  yards: Array(18).fill(0),
  pars: [4,4,3,5,4,4,3,5,4, 4,4,3,5,4,4,3,5,4],
  hcpIndex: [9,3,15,1,11,5,17,7,13, 10,4,16,2,12,6,18,8,14]
}

const save = (k:string,v:any)=>{ try{localStorage.setItem(k, JSON.stringify(v))}catch{} }
const load = <T,>(k:string, fb:T):T=>{ try{ const v=localStorage.getItem(k); return v? JSON.parse(v): fb }catch{ return fb } }

type Player = { name:string; hcp:number; active:boolean }
type Match = {
  id: number;
  type: 'singles'|'fourball';
  teamNames: {A:string;B:string};
  A: [Player, Player];
  B: [Player, Player];
  gross: Record<number, Record<string, number>>;
  results: Record<number, 'A'|'B'|'H'|null>;
}

function Tiny({children}:{children:React.ReactNode}){ return <span className="badge">{children}</span> }

function CourseEditor({course,setCourse}:{course:any,setCourse:Function}){
  const [pars,setPars]=useState(course.pars.join(', '))
  const [hcp,setHcp]=useState(course.hcpIndex.join(', '))
  const [yrd,setYrd]=useState(course.yards.join(', '))
  useEffect(()=>{ setPars(course.pars.join(', ')); setHcp(course.hcpIndex.join(', ')); setYrd(course.yards.join(', ')) },[course])
  return <div className="card"><div className="content grid">
    <div className="row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
      <div><div className="small">Nombre de la cancha</div><input className="input" value={course.name} onChange={e=>setCourse({...course,name:e.target.value})}/></div>
      <div><div className="small">Pars (18)</div><input className="input" value={pars} onChange={e=>setPars(e.target.value)} onBlur={()=>setCourse({...course, pars:fill18(parseNums(pars),4)})}/></div>
      <div><div className="small">Índices HCP (1-18)</div><input className="input" value={hcp} onChange={e=>setHcp(e.target.value)} onBlur={()=>setCourse({...course, hcpIndex:fill18(parseNums(hcp),18)})}/></div>
    </div>
    <div>
      <div className="small">Yardas/Metros (opcional)</div>
      <input className="input" value={yrd} onChange={e=>setYrd(e.target.value)} onBlur={()=>setCourse({...course, yards:fill18(parseNums(yrd),0)})}/>
    </div>
    <div className="small">Tip: puedes pegar valores separados por coma, punto y coma o espacios.</div>
  </div></div>
}

function PlayerRowEditor({idx,player,onChange,side}:{idx:number,player:Player,onChange:(p:Player)=>void,side:'A'|'B'}){
  return <div className="row" style={{gridTemplateColumns:'1fr 90px 80px'}}>
    <div><div className="small">{side} Jugador {idx+1}</div><input className="input" value={player.name} onChange={e=>onChange({...player,name:e.target.value})} placeholder="Nombre"/></div>
    <div><div className="small">HCP</div><input className="input" type="number" value={player.hcp} onChange={e=>onChange({...player,hcp:clamp(Number(e.target.value),-10,54)})}/></div>
    <div><div className="small">Activo</div><input type="checkbox" checked={player.active} onChange={e=>onChange({...player,active:e.target.checked})}/></div>
  </div>
}

function MatchSetup({match,onChange}:{match:Match,onChange:(m:Match)=>void}){
  const lowHcp = useMemo(()=>{
    const hs = [match.A[0],match.A[1],match.B[0],match.B[1]].filter(p=>p && p.active).map(p=>p.hcp||0)
    return hs.length? Math.min(...hs): 0
  },[match])
  const teamNames = match.teamNames || {A:'Equipo A', B:'Equipo B'}
  return <div className="card"><div className="content grid">
    <div className="row" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr', alignItems:'end'}}>
      <div><div className="small">Tipo de match</div>
        <select className="input" value={match.type} onChange={e=>onChange({...match, type: e.target.value as any})}>
          <option value="singles">Singles (1 vs 1)</option>
          <option value="fourball">Fourball (2 vs 2)</option>
        </select>
      </div>
      <div><div className="small">Nombre Equipo A</div><input className="input" value={teamNames.A} onChange={e=>onChange({...match, teamNames:{...teamNames, A:e.target.value}})}/></div>
      <div><div className="small">Nombre Equipo B</div><input className="input" value={teamNames.B} onChange={e=>onChange({...match, teamNames:{...teamNames, B:e.target.value}})}/></div>
      <div style={{alignSelf:'center'}}><div className="small">HCP base (mejor): <Tiny>{lowHcp}</Tiny></div></div>
    </div>
    <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
      <div className="grid">
        <div className="subtitle">Equipo A</div>
        <PlayerRowEditor idx={0} side="A" player={match.A[0]} onChange={p=>onChange({...match, A:[p, match.A[1]]})}/>
        {match.type==='fourball' && <PlayerRowEditor idx={1} side="A" player={match.A[1]} onChange={p=>onChange({...match, A:[match.A[0], p]})}/>}
      </div>
      <div className="grid">
        <div className="subtitle">Equipo B</div>
        <PlayerRowEditor idx={0} side="B" player={match.B[0]} onChange={p=>onChange({...match, B:[p, match.B[1]]})}/>
        {match.type==='fourball' && <PlayerRowEditor idx={1} side="B" player={match.B[1]} onChange={p=>onChange({...match, B:[match.B[0], p]})}/>}
      </div>
    </div>
  </div></div>
}

function ScoreCard({course, match, onMatchUpdate}:{course:any, match:Match, onMatchUpdate:(m:Match)=>void}){
  const hcpOrder = useMemo(()=>buildHcpOrderFromIndices(course.hcpIndex), [course.hcpIndex])
  const lowHcp = useMemo(()=>{
    const hs = [match.A[0],match.A[1],match.B[0],match.B[1]].filter(p=>p && p.active).map(p=>p.hcp||0)
    return hs.length? Math.min(...hs): 0
  },[match])

  const strokesByPlayer = useMemo(()=>{
    const map:any = {}
    const players:any = {A0:match.A[0], A1:match.A[1], B0:match.B[0], B1:match.B[1]}
    for(const key of Object.keys(players)){
      const p = players[key]
      if(!p || !p.active){ map[key] = Object.fromEntries(HOLES.map(h=>[h,0])); continue }
      const diff = Math.max(0, (p.hcp||0) - lowHcp)
      map[key] = cycleAllocations(diff, hcpOrder)
    }
    return map
  },[match, lowHcp, hcpOrder])

  const [gross, setGross] = useState<Record<number, Record<string, number>>>(match.gross || {})
  useEffect(()=>{ if(match.gross) setGross(match.gross) },[match.gross])
  useEffect(()=>{ onMatchUpdate({...match, gross}) },[gross])

  const resultsPerHole = useMemo(()=>
    HOLES.map(h=>{
      const g = gross[h] || {}
      if(match.type==='singles'){
        const nA = net(g.A0, strokesByPlayer.A0[h])
        const nB = net(g.B0, strokesByPlayer.B0[h])
        return winnerSingles(nA, nB)
      }else{
        const nA1 = net(g.A0, strokesByPlayer.A0[h])
        const nA2 = net(g.A1, strokesByPlayer.A1[h])
        const nB1 = net(g.B0, strokesByPlayer.B0[h])
        const nB2 = net(g.B1, strokesByPlayer.B1[h])
        return winnerFourball(nA1, nA2, nB1, nB2)
      }
    })
  , [gross, strokesByPlayer, match.type])

  const status = useMemo(()=>statusFrom(resultsPerHole), [resultsPerHole])

  function setGrossValue(hole:number, key:string, val:number){
    setGross(prev=>({ ...prev, [hole]: { ...(prev[hole]||{}), [key]: val } }))
  }

  function PlayerGrossInput({hole, keyName, player}:{hole:number, keyName:string, player:Player}){
    if(!player || !player.active) return <div/>
    const val = (gross[hole]?.[keyName] ?? '') as any
    const strokes = strokesByPlayer[keyName]?.[hole] || 0
    return <div className="flex"><input className="input" inputMode="numeric" placeholder="-" value={val}
      onChange={e=>setGrossValue(hole, keyName, Number(e.target.value))} style={{width:'64px', textAlign:'center'}}/>
      {strokes>0 && <span className="badge">-{strokes}</span>}
    </div>
  }

  function HoleRow({hole}:{hole:number}){
    const par = course.pars[hole-1] ?? 4
    const idx = course.hcpIndex[hole-1] ?? 18
    const winner = resultsPerHole[hole-1] as any
    const badgeClass = winner==='A'? 'pillA' : winner==='B'? 'pillB' : winner==='H'? 'pillH' : ''
    const badgeText = winner==='A'? 'A' : winner==='B'? 'B' : winner==='H'? '=' : ''
    return <div className="hole-row">
      <div className="small">{hole}</div>
      <div className="small center">Par {par}</div>
      <div className="small center">HCP {idx}</div>
      <PlayerGrossInput hole={hole} keyName="A0" player={match.A[0]} />
      {match.type==='fourball' ? <PlayerGrossInput hole={hole} keyName="A1" player={match.A[1]} /> : <div/>}
      <PlayerGrossInput hole={hole} keyName="B0" player={match.B[0]} />
      {match.type==='fourball' ? <PlayerGrossInput hole={hole} keyName="B1" player={match.B[1]} /> : <div/>}
      <div className="center"><span className={"badge "+badgeClass}>{badgeText}</span></div>
    </div>
  }

  return <div className="card"><div className="content">
    <div className="flex" style={{justifyContent:'space-between'}}>
      <div className="subtitle">{match.teamNames?.A || 'Equipo A'} vs {match.teamNames?.B || 'Equipo B'}</div>
      <div className="status">Estado: {status.text}</div>
    </div>
    <div className="holes-header">
      <div>#</div><div>PAR</div><div>HCP</div>
      <div className="center">{match.A[0]?.name || 'A1'}</div>
      {match.type==='fourball'? <div className="center">{match.A[1]?.name || 'A2'}</div> : <div/>}
      <div className="center">{match.B[0]?.name || 'B1'}</div>
      {match.type==='fourball'? <div className="center">{match.B[1]?.name || 'B2'}</div> : <div/>}
      <div className="center">Punto</div>
    </div>
    {HOLES.map(h=> <HoleRow key={h} hole={h} />)}
  </div></div>
}

function SummaryBoard({matches, matchCount}:{matches:Match[], matchCount:number}){
  const rows = matches.slice(0, matchCount).map((m,i)=>{
    const results = HOLES.map(h=> m.results?.[h] ?? null) as (string|null)[]
    const st = statusFrom(results)
    let A=0,B=0
    if(st.complete){
      if(st.winner==='A') A=1
      else if(st.winner==='B') B=1
      else {A=0.5; B=0.5}
    }
    return {i, nameA:m.teamNames?.A || `Equipo A ${i+1}`, nameB:m.teamNames?.B || `Equipo B ${i+1}`, text:st.text, complete:st.complete, A, B}
  })
  const totalA = rows.reduce((acc,r)=>acc+r.A,0)
  const totalB = rows.reduce((acc,r)=>acc+r.B,0)
  return <div className="card"><div className="content">
    <div className="flex" style={{justifyContent:'space-between'}}>
      <div className="subtitle">Resumen en vivo</div>
      <div>Total: <b>{totalA}</b> – <b>{totalB}</b></div>
    </div>
    <div className="hr"></div>
    {rows.map(r=> <div key={r.i} className="row" style={{gridTemplateColumns:'1fr auto 1fr auto', alignItems:'center'}}>
      <div className="right">{r.nameA}</div><div className="small center">vs</div><div>{r.nameB}</div>
      <div className={"small "+(r.complete? 'subtitle':'' )}>{r.text}</div>
    </div>)}
  </div></div>
}

export default function App(){
  const [course, setCourse] = useState(load('course', defaultCourse))
  const [matchCount, setMatchCount] = useState<number>(load('matchCount', 4))
  const [activeTab, setActiveTab] = useState<number>(1)
  const [matches, setMatches] = useState<Match[]>(()=>{
    const saved = load('matches', null as any)
    if(saved && Array.isArray(saved) && saved.length) return saved
    return Array.from({length:10}, (_,i)=>({
      id: i+1, type:'fourball',
      teamNames: {A:`Equipo A ${i+1}`, B:`Equipo B ${i+1}`},
      A:[{name:'', hcp:12, active:true}, {name:'', hcp:18, active:true}],
      B:[{name:'', hcp:10, active:true}, {name:'', hcp:20, active:true}],
      gross:{}, results:{},
    } as Match))
  })

  useEffect(()=> save('course', course), [course])
  useEffect(()=> save('matchCount', matchCount), [matchCount])
  useEffect(()=> save('matches', matches), [matches])

  function updateMatch(idx:number, updater:(m:Match)=>Match){
    setMatches(prev => prev.map((m,i)=> i===idx? updater(m): m))
  }

  function recomputeResults(match:Match){
    const order = buildHcpOrderFromIndices(course.hcpIndex)
    const low = Math.min(...[match.A[0],match.A[1],match.B[0],match.B[1]].filter(p=>p && p.active).map(p=>p.hcp||0))
    const players:any = {A0:match.A[0], A1:match.A[1], B0:match.B[0], B1:match.B[1]}
    const strokes:any = {}
    for(const k of Object.keys(players)){
      const p = players[k]
      if(!p || !p.active) strokes[k] = Object.fromEntries(HOLES.map(h=>[h,0]))
      else strokes[k] = cycleAllocations(Math.max(0,(p.hcp||0)-low), order)
    }
    const results:Match['results'] = {}
    for(const h of HOLES){
      const g = match.gross?.[h] || {}
      if(match.type==='singles'){
        const nA = net(g.A0, strokes.A0[h]); const nB = net(g.B0, strokes.B0[h])
        results[h] = winnerSingles(nA,nB) as any
      }else{
        const nA1 = net(g.A0, strokes.A0[h]); const nA2 = net(g.A1, strokes.A1[h])
        const nB1 = net(g.B0, strokes.B0[h]); const nB2 = net(g.B1, strokes.B1[h])
        results[h] = winnerFourball(nA1,nA2,nB1,nB2) as any
      }
    }
    return {...match, results}
  }

  return <div className="container">
    <div className="flex" style={{justifyContent:'space-between', marginBottom:8}}>
      <div className="title">Match Play – Villarrica (genérico)</div>
      <div className="flex">
        <button className="btn" onClick={()=>{ save('matches_export', matches) }}>Guardar local</button>
      </div>
    </div>

    <div className="split">
      <div className="grid">
        <CourseEditor course={course} setCourse={setCourse} />

        <div className="card"><div className="content grid">
          <div className="flex" style={{justifyContent:'space-between'}}>
            <div className="subtitle">Matches activos</div>
            <div className="flex">
              <button className="btn" onClick={()=> setMatchCount(c=>clamp(c-1,1,10))}>-</button>
              <div style={{width:40, textAlign:'center', lineHeight:'36px'}}>{matchCount}</div>
              <button className="btn" onClick={()=> setMatchCount(c=>clamp(c+1,1,10))}>+</button>
            </div>
          </div>
          <div className="tabs">
            {Array.from({length:matchCount}, (_,i)=>(
              <button key={i} className={"tab "+(activeTab===i+1?'active':'')} onClick={()=>setActiveTab(i+1)}>Salida {i+1}</button>
            ))}
          </div>

          {Array.from({length:matchCount}, (_,i)=>(
            <div key={i} style={{display: activeTab===i+1? 'block':'none'}}>
              <MatchSetup match={matches[i]} onChange={(m)=> updateMatch(i, ()=>m)} />
              <ScoreCard course={course} match={matches[i]} onMatchUpdate={(m)=> updateMatch(i, (old)=> recomputeResults({...old, ...m}))} />
            </div>
          ))}
        </div></div>
      </div>

      <div className="grid">
        <SummaryBoard matches={matches} matchCount={matchCount} />
        <div className="card"><div className="content list">
          <div className="subtitle">Cómo funciona</div>
          <ul>
            <li>Pars + índices HCP genéricos editables.</li>
            <li>Reparto de palos vs el mejor hándicap (1–18 cíclico).</li>
            <li>Singles/Fourball, ganador por hoyo y estado del match.</li>
            <li>Hasta 10 salidas; tablero tipo Ryder.</li>
            <li>Autoguardado local.</li>
          </ul>
        </div></div>
      </div>
    </div>
  </div>
}
