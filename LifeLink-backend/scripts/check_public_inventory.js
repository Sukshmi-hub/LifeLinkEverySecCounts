#!/usr/bin/env node
// scripts/check_public_inventory.js
// Calls public API /api/hospitals and /api/hospitals/:id/inventory and prints human-friendly summary

// Use global fetch available in Node 18+
const API = process.env.API_BASE || 'http://localhost:5000';

const ORGANS = ['KIDNEY','LIVER','HEART','LUNG','PANCREAS','CORNEA','BONE MARROW'];
const BLOOD = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

async function run(){
  try{
    const resp = await fetch(`${API}/api/hospitals`);
    const json = await resp.json();
    if(!resp.ok) { console.error('Failed to fetch hospitals', json); process.exit(1); }
    const hospitals = Array.isArray(json.data) ? json.data : [];
    console.log('Hospitals:', hospitals.length);
    for(const h of hospitals){
      const id = h.id || h._id;
      console.log('\n==', h.name || h.organizationName || id, '==');
      let inv=[];
      try{
        // try plural then singular mount (some servers mount either)
        let r2 = await fetch(`${API}/api/hospitals/${id}/inventory`);
        let j2 = await r2.json().catch(()=>({}));
        if(!r2.ok){
          r2 = await fetch(`${API}/api/hospital/${id}/inventory`);
          j2 = await r2.json().catch(()=>({}));
        }
        if(r2.ok && Array.isArray(j2.data)) inv = j2.data;
        else console.warn('inventory fetch not ok for', id, j2);
      }catch(e){ console.error('inventory fetch error', e); }
      const organMap = {};
      const bloodMap = {};
      inv.forEach(it=>{
        if(it.itemType==='organ' && it.organType){ organMap[String(it.organType).toUpperCase()] = Number(it.count)||0 }
        if(it.itemType==='blood' && it.bloodType){ bloodMap[String(it.bloodType).toUpperCase()] = Number(it.count)||0 }
      })
      const organsPresent = ORGANS.map(k=> ({k, v: organMap[k]||0})).filter(x=>x.v>0);
      const bloodPresent = BLOOD.map(k=> ({k, v: bloodMap[k]||0})).filter(x=>x.v>0);
      if(organsPresent.length===0) console.log('Organs present:\n  no organs present'); else console.log('Organs present:\n', organsPresent.map(o=>`  ${o.k} (+${o.v})`).join('\n'));
      if(bloodPresent.length===0) console.log('Blood groups present:\n  no blood present'); else console.log('Blood groups present:\n', bloodPresent.map(b=>`  ${b.k} (+${b.v})`).join('\n'));
    }
  }catch(e){ console.error(e); process.exit(1) }
}

run();
