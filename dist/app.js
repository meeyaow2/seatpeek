const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),zones=window.SIS_REFERENCE.sections;
let mode='orbit',az=Math.PI/4,el=.75,zoom=1,drag=null,moved=false,selected=null,lookYaw=0,lookPitch=0;const groupNames=['Arena','North','West','East'];
const normaliseSection=value=>String(value).trim().toUpperCase().replace(/^SECTION\s*/,'').replace(/^(?:PIT|PEN|STANDING(?:\s+PEN)?)\s*([AB])$/,'P$1').replace(/^([AB])$/,'P$1'),positiveInteger=value=>/^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value))&&Number(value)>0;
const validHeight=value=>/^\d+$/.test(String(value))&&Number(value)>=90&&Number(value)<=220;let userHeight=validHeight(params.get('height'))?Number(params.get('height')):165;$('viewer-height').value=String(userHeight);
const initialSection=normaliseSection(params.get('zone')||'211');
let ticket={section:zones.some(z=>z.id===initialSection)?initialSection:'211',row:positiveInteger(params.get('row'))?params.get('row'):'',seat:positiveInteger(params.get('seat'))?params.get('seat'):'',located:positiveInteger(params.get('row'))&&positiveInteger(params.get('seat'))};
for(const z of zones)$('section-options').append(new Option(z.name,z.id));$('section').value=params.has('zone')?ticket.section:'';$('row').value=ticket.row;$('seat').value=ticket.seat;
const areaFor=z=>z.bank==='Arena'?'standing':z.tier===2?'l3':'l2';let activeArea=areaFor(zones.find(z=>z.id===ticket.section));
function renderAreaPicker(area){activeArea=area;for(const id of ['l2','l3','standing']){$('area-'+id).classList.toggle('active',id===area);$('area-'+id).setAttribute('aria-pressed',String(id===area))}const options=zones.filter(z=>areaFor(z)===area).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));$('area-caption').textContent=area==='l3'?'Level 3 · Balcony sections (300s)':area==='l2'?'Level 2 · Terrace sections (200s)':'Standing floor · choose an area';$('area-options').innerHTML=options.map(z=>`<button type="button" data-zone="${z.id}" class="area-option${normaliseSection($('section').value)===z.id?' selected-area':''}">${area==='standing'?z.name:z.id}</button>`).join('');$('area-options').classList.toggle('pit-options',area==='standing');$('section-options').innerHTML='';for(const z of options)$('section-options').append(new Option(z.name,z.id));$('section').placeholder=area==='l3'?'e.g. 310':area==='l2'?'e.g. 211':'Choose an area below';}
function chooseArea(area){const preferred=area==='l3'?'310':area==='standing'?'PA':'211',z=zones.find(z=>z.id===preferred)||zones.find(z=>areaFor(z)===area);ticket={section:z.id,row:'',seat:'',located:true};$('section').value=z.id;$('row').value='';$('seat').value='';renderAreaPicker(area);syncSeatSelectors();$('ticket-error').textContent='';faceStage();update();$('ticket-status').textContent=area==='standing'?'Standing pit selected. Choose a floor area below; no row or seat is needed.':`Level ${area==='l3'?'3':'2'} selected. Choose a section below or type your ticket details.`;}
for(const area of ['l2','l3','standing'])$('area-'+area).onclick=()=>chooseArea(area);
$('area-options').onclick=e=>{const button=e.target.closest('[data-zone]');if(!button)return;const z=zones.find(z=>z.id===button.dataset.zone);ticket={section:z.id,row:'',seat:'',located:true};$('section').value=z.id;$('row').value='';$('seat').value='';$('ticket-error').textContent='';renderAreaPicker(areaFor(z));faceStage();update();$('ticket-status').textContent=z.bank==='Arena'?z.name+' selected. Preview the standing area.':`Level ${z.tier===2?'3':'2'} · Section ${z.id} selected. Enter your ticket row and seat if you have them.`;};
renderAreaPicker(activeArea);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0c1525);const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-70,70,60,-60,.1,500),povCamera=new THREE.PerspectiveCamera(55,1,.1,500),arenaCamera=new THREE.PerspectiveCamera(42,1,.1,500);const houseLight=new THREE.HemisphereLight(0xffffff,0xe1e1e1,1.3);scene.add(houseLight);const light=new THREE.DirectionalLight(0xffffff,.7);light.position.set(-20,90,35);scene.add(light);const bowl=new THREE.Group();scene.add(bowl);const pickables=[],labelObjects=[];const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});const floorMat=material('#d6d6d6');let modelBounds;
function face(poly,y,depth,color,parent=bowl){const shape=new THREE.Shape();poly.forEach((p,i)=>i?shape.lineTo(p[0],p[1]):shape.moveTo(p[0],p[1]));shape.closePath();const geom=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geom.rotateX(Math.PI/2);const mesh=new THREE.Mesh(geom,material(color));mesh.position.y=y;parent.add(mesh);return mesh}
function label(text,x,y,z,w=4.2,color='#112632'){const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.font=(text.length>10?'500 39px':'500 64px')+' Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,80);const tex=new THREE.CanvasTexture(c),plane=new THREE.Mesh(new THREE.PlaneGeometry(w,w/3.2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(x,y,z);bowl.add(plane);labelObjects.push(plane);return plane}
function center(poly){return poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0])}
for(const z of zones){z.top=1.8;z.original=material(z.color);z.mesh=face(z.polygon,z.top,1.05,z.color);z.mesh.material=z.original;z.mesh.userData.zone=z;pickables.push(z.mesh);if(z.vipBand){const band=face(z.vipBand,z.top+.03,.03,'#a8e7d6');band.userData.zone=z;pickables.push(band)}z.center=center(z.polygon);z.label=label(z.id.startsWith('CAT1-')?'CAT 1 STANDING':z.id.startsWith('VIP-')?'VIP STANDING':z.id.startsWith('P')?'STANDING PEN '+z.id.slice(-1):z.id,...[z.center[0],z.top+.07,z.center[1]],['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id)?24:z.id==='231'?5.5:3.6);}
face(window.SIS_REFERENCE.stageOutline,.8,.8,'#353d49');const sc=center(window.SIS_REFERENCE.stage);label('STAGE',sc[0],.88,sc[1],15,'#f4f6fa');face(window.SIS_REFERENCE.foh,1.9,1.3,'#24282b');const fc=center(window.SIS_REFERENCE.foh);label('SOUND CONTROL',fc[0],2,fc[1],7,'#f5f5f5');
modelBounds=new THREE.Box3().setFromObject(bowl);const target=modelBounds.getCenter(new THREE.Vector3());target.y=0;
for(const [text,x,z] of [['NORTH',49,-6],['WEST',-5,-53],['EAST',-3,53]])label(text,x,0,z,9,'#55626c');
const pin=new THREE.Mesh(new THREE.SphereGeometry(.7,16,12),material('#293b50'));scene.add(pin);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,.15,8,40),material('#293b50'));ring.rotation.x=-Math.PI/2;scene.add(ring);
function position(z,u,v){const n=z.bank==='North'?[1,0]:z.bank==='West'?[0,-1]:z.bank==='East'?[0,1]:[1,0],t=[-n[1],n[0]],p=z.polygon.map(p=>[p[0]*t[0]+p[1]*t[1],p[0]*n[0]+p[1]*n[1]]),near=Math.min(...p.map(p=>p[1])),far=Math.max(...p.map(p=>p[1])),r=near+(far-near)*Math.max(.015,Math.min(.985,v)),xs=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=r&&b[1]>r)||(b[1]<=r&&a[1]>r))xs.push(a[0]+(r-a[1])/(b[1]-a[1])*(b[0]-a[0]))}const lo=Math.min(...xs),hi=Math.max(...xs),ac=lo+(hi-lo)*u;return new THREE.Vector3(n[0]*r+t[0]*ac,z.top+1.7,n[1]*r+t[1]*ac)}
// Estimated venue shell follows the outer section footprint, not a blank canvas.
function venueHull(points){const p=points.map(a=>[...a]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],hi=[];for(const a of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),a)<=0)lo.pop();lo.push(a)}for(const a of [...p].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),a)<=0)hi.pop();hi.push(a)}return lo.slice(0,-1).concat(hi.slice(0,-1))}
const venueFootprint=venueHull(zones.flatMap(z=>z.polygon).concat(window.SIS_REFERENCE.stage)),venueCenter=center(venueFootprint),expandFootprint=scale=>venueFootprint.map(p=>[venueCenter[0]+(p[0]-venueCenter[0])*scale,venueCenter[1]+(p[1]-venueCenter[1])*scale]);
// Immersive scene: illustrative row spacing, elevations and crowd, separate from
// the reference section diagram. These values are not venue seat inventory.
const immersive=new THREE.Group(),crowdGroup=new THREE.Group();immersive.add(crowdGroup);scene.add(immersive);immersive.visible=false;
const arenaSurfaces=new THREE.Group();arenaSurfaces.name='Arena floor and concourse';immersive.add(arenaSurfaces);
face(expandFootprint(1.11),-.08,.24,'#152237',arenaSurfaces);face(expandFootprint(1.055),-.055,.1,'#25364d',arenaSurfaces);face(expandFootprint(.99),-.035,.08,'#1c2b40',arenaSurfaces);
face(expandFootprint(1.11),.06,.06,'#243650',bowl);face(expandFootprint(1.055),.08,.025,'#35445a',bowl);face(expandFootprint(.99),.10,.02,'#29394e',bowl);
const categoryRows=[];
function pointInBand(point,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>point.z)!==(b[1]>point.z)&&point.x<(b[0]-a[0])*(point.z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function categoryTint(z,point){const color=z.vipBand&&pointInBand(point,z.vipBand)?'#a8e7d6':z.color;return new THREE.Color(color).lerp(new THREE.Color('#a5aeb9'),.23)}
const overviewPickables=[];const overviewLabels=new THREE.Group();scene.add(overviewLabels);const audience=[],seatTransforms=[],tmpObject=new THREE.Object3D();
function rowsFor(z){return ['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id)?20:z.tier===0?7:z.tier===1?14:7}
function surfaceHeight(z,v){if(['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id))return 0;const rows=rowsFor(z),r=Math.min(rows-1,Math.floor(v*rows));return(z.tier===0?.5:z.tier===1?4.5:14.5)+r*(z.tier===0?.34:z.tier===1?.49:.58)}
function eyeLevelMetres(){const standing=(userHeight-11)/100;return $('eyeheight').value==='standing'?standing:.45+standing*.46}
function syncHeightSummary(){$('height-summary').textContent=userHeight+' cm tall · '+($('eyeheight').value==='standing'?'Standing':'Seated')+' eye level ≈ '+Math.round(eyeLevelMetres()*100)+' cm above the floor'}
function applyViewerHeight(){const value=$('viewer-height').value;if(!validHeight(value)){$('height-error').textContent='Enter a height from 90 to 220 cm.';$('viewer-height').setAttribute('aria-invalid','true');return false}userHeight=Number(value);$('height-error').textContent='';$('viewer-height').setAttribute('aria-invalid','false');syncHeightSummary();updateCrowd();urlState();return true}
$('viewer-height').addEventListener('input',applyViewerHeight);
function eyePosition(){const {u,v}=selectedCoordinates(),p=position(selected,u,v);p.y=surfaceHeight(selected,v)+eyeLevelMetres();return p}
function addBox(w,h,d,x,y,z,color,parent=immersive){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh}
addBox(145,.6,125,0,-.45,2,'#101b2b');
for(const z of zones){const standing=['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id);const rows=rowsFor(z);for(let row=0;row<rows;row++){const v=(row+.5)/rows,a=position(z,.025,v),b=position(z,.975,v),width=a.distanceTo(b),y=surfaceHeight(z,v),centerLine=a.clone().add(b).multiplyScalar(.5);const riser=addBox(width,standing?.24:y+.12,standing?.82:(z.tier===0?.75:1),centerLine.x,standing?y-.12:(y-.12)/2,centerLine.z,standing?z.color:'#737f8e');riser.userData.zone=z;riser.userData.categoryTint=categoryTint(z,centerLine);riser.userData.standing=standing;categoryRows.push(riser);overviewPickables.push(riser);riser.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);const aisleFraction=standing?0:Math.min(.22,.9/(width||1)),cols=Math.max(1,Math.floor(width*(1-aisleFraction)/(standing?.83:.66)));for(let col=0;col<cols;col++){const u=standing?(col+.5)/cols:.025+aisleFraction+(col+.5)/cols*(.95-aisleFraction),point=position(z,u,v);point.y=y;const angle=Math.atan2(sc[0]-point.x,sc[1]-point.z);if(!standing)seatTransforms.push({point,angle,zone:z.id,row:row+1,seat:col+1});audience.push({point,angle,standing,zone:z.id,u,v,row:row+1,seat:col+1,cols,hash:(row*31+col*17+Number(z.id.replace(/\D/g,''))*7||row*13+col*31)%101})}}}
const seatMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.48,.12,.48),material('#ffffff'),seatTransforms.length),backMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.48,.62,.11),material('#ffffff'),seatTransforms.length);
seatTransforms.forEach((seat,i)=>{tmpObject.position.copy(seat.point).add(new THREE.Vector3(0,.47,0));tmpObject.rotation.set(0,seat.angle,0);tmpObject.scale.set(1,1,1);tmpObject.updateMatrix();seatMesh.setMatrixAt(i,tmpObject.matrix);tmpObject.position.add(new THREE.Vector3(-Math.sin(seat.angle)*.23,.25,-Math.cos(seat.angle)*.23));tmpObject.updateMatrix();backMesh.setMatrixAt(i,tmpObject.matrix)});seatMesh.frustumCulled=backMesh.frustumCulled=false;immersive.add(seatMesh,backMesh);
function applyCategoryColours(){
 const coloured=mode==='orbit';
 for(const mesh of categoryRows){const tint=mesh.userData.categoryTint;mesh.material.color.copy(coloured?tint.clone().lerp(new THREE.Color('#637184'),.20):new THREE.Color(mesh.userData.standing?mesh.userData.zone.color:'#737f8e'));mesh.material.emissive.copy(coloured?tint:new THREE.Color('#000000'));mesh.material.emissiveIntensity=coloured?.065:0}
 seatTransforms.forEach((seat,i)=>{const z=zones.find(z=>z.id===seat.zone),tint=categoryTint(z,seat.point);seatMesh.setColorAt(i,coloured?tint:new THREE.Color('#c78c49'));backMesh.setColorAt(i,coloured?tint.clone().lerp(new THREE.Color('#e9edf1'),.12):new THREE.Color('#d6a364'))});
 if(seatMesh.instanceColor)seatMesh.instanceColor.needsUpdate=true;if(backMesh.instanceColor)backMesh.instanceColor.needsUpdate=true;
}
const inventory=new Map(zones.map(z=>[z.id,audience.filter(a=>a.zone===z.id)]));
function isStanding(){return selected&&['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(selected.id)}
function syncSeatSelectors(){const pen=activeArea==='standing'||['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(normaliseSection($('section').value));$('assigned-seats').hidden=pen;$('standing-position').hidden=!pen;$('row').required=$('seat').required=!pen}
function selectedCoordinates(){if(isStanding())return{u:+$('pen-side').value||.5,v:+$('pen-depth').value||.5};const records=inventory.get(selected.id),middleRow=Math.ceil(rowsFor(selected)/2),row=records.filter(a=>a.row===middleRow);return row[Math.floor(row.length/2)]||records[Math.floor(records.length/2)]}
function locateTicket(){const section=normaliseSection($('section').value),zone=zones.find(z=>z.id===section);$('ticket-error').textContent='';if(!zone){$('ticket-error').textContent='We could not find that section in this reference layout. Try a listed section, such as 211, or PA / PB; use the listed standing-area names for the rear zones.';$('section').setAttribute('aria-invalid','true');return false}$('section').setAttribute('aria-invalid','false');const pen=['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(section);if(!pen&&(!positiveInteger($('row').value)||!positiveInteger($('seat').value))){$('ticket-error').textContent='Enter the positive whole-number row and seat shown on your ticket.';return false}ticket={section,row:pen?'':$('row').value,seat:pen?'':$('seat').value,located:true};$('section').value=section;lookYaw=0;lookPitch=0;az=Math.PI/4;el=.75;zoom=1.2;mode='orbit';setMode('orbit');$('ticket-status').textContent=pen?zone.name+' located.':`Section ${section} located. Your ticket says row ${ticket.row}, seat ${ticket.seat}. Exact seat coordinates are not yet mapped.`;return true}
function revealArena(){if(matchMedia('(max-width:1100px)').matches)$('viewer').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
$('ticket-form').onsubmit=e=>{e.preventDefault();if(locateTicket())revealArena()};$('section').addEventListener('input',()=>{const z=zones.find(z=>z.id===normaliseSection($('section').value));if(z)renderAreaPicker(areaFor(z));syncSeatSelectors();$('ticket-error').textContent=''});
const seatHighlight=new THREE.Mesh(new THREE.BoxGeometry(.53,.035,.53),new THREE.MeshBasicMaterial({color:'#8baaf0'}));immersive.add(seatHighlight);
function updateSeatHighlight(){const c=selectedCoordinates();seatHighlight.visible=false;seatHighlight.position.set(c.point?.x||0,(c.point?.y||0)+.55,c.point?.z||0);if(c.angle!==undefined)seatHighlight.rotation.y=c.angle}
let crowdMode=['show','concert'].includes(params.get('crowd'))?'show':'normal';
const humanCrowd=createHumanCrowd(THREE,crowdGroup,audience,eyePosition);
function updateCrowd(){syncHeightSummary();crowdGroup.visible=$('people').checked;humanCrowd.rebuild(crowdMode)}
function refreshCrowdControls(){for(const id of ['normal','show']){$('crowd-'+id).classList.toggle('active',crowdMode===id);$('crowd-'+id).setAttribute('aria-pressed',crowdMode===id?'true':'false')}$('pause-motion').textContent=humanCrowd.isPaused()?'▶ Resume motion':'Ⅱ Pause motion';$('pause-motion').hidden=crowdMode!=='show';$('crowd-description').textContent=crowdMode==='show'?'Lights down · stage performance · moving beams · glowing lightsticks · five performers.':'Seated stands and relaxed standing pens.'}
function chooseCrowd(value){crowdMode=value;$('people').checked=true;if(mode!=='pov')setMode('pov');$('eyeheight').value=value==='show'||['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(selected.id)?'standing':'seated';refreshCrowdControls();updateCrowd();applyShowLighting();if(value==='show')startShowSoundtrack();else closeSoundtrack();urlState();revealArena()}
$('crowd-normal').onclick=()=>chooseCrowd('normal');$('crowd-show').onclick=()=>chooseCrowd('show');$('pause-motion').onclick=()=>{humanCrowd.setPaused(!humanCrowd.isPaused());refreshCrowdControls()};refreshCrowdControls();
// Clearly visible stage, screens and performer-scale figures provide a stable
// visual target when entering preview, including from side sections.
const continuousStage=face(window.SIS_REFERENCE.stageOutline,2.2,2.2,'#2c3037',immersive);continuousStage.name='Continuous main stage, centre platform and angled runways';continuousStage.material=[new THREE.MeshStandardMaterial({color:'#303741',roughness:.64,metalness:.12}),new THREE.MeshStandardMaterial({color:'#1a2029',roughness:.88})];const stageRearA=window.SIS_REFERENCE.stage[0],stageRearB=window.SIS_REFERENCE.stage[3],stageSpan=Math.hypot(stageRearB[0]-stageRearA[0],stageRearB[1]-stageRearA[1]),backX=(stageRearA[0]+stageRearB[0])/2+.15,stageZ=(stageRearA[1]+stageRearB[1])/2,stageAngle=Math.atan2(stageRearB[0]-stageRearA[0],stageRearB[1]-stageRearA[1]);
const stageAssembly=new THREE.Group();stageAssembly.name='Stage-aligned screens and lighting';immersive.add(stageAssembly);const stageMatrix=new THREE.Matrix4().makeTranslation(backX,0,stageZ).multiply(new THREE.Matrix4().makeRotationY(stageAngle)).multiply(new THREE.Matrix4().makeTranslation(-backX,0,-stageZ));stageAssembly.applyMatrix4(stageMatrix);const inverseStageMatrix=stageMatrix.clone().invert();
function stageBox(...args){return addBox(...args,stageAssembly)}
function stageBeam(...args){const m=rigBeam(...args);stageAssembly.add(m);return m}
stageBox(.7,11,25,backX,7.7,stageZ,'#1b2230');
// Panoramic scenic LED artwork, shared by the main and side screens.
function paintStageArtwork(c,w,h,t=0,show=false){
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#060e1c');g.addColorStop(.48,show?'#123f67':'#294963');g.addColorStop(.67,'#74a5b6');g.addColorStop(.68,'#182f45');g.addColorStop(1,'#040b15');c.fillStyle=g;c.fillRect(0,0,w,h);
 // Distant ridges and a luminous central horizon, like the scenic reference.
 for(let layer=0;layer<3;layer++){c.fillStyle=['#253a50','#172c40','#0a1b2e'][layer];c.beginPath();c.moveTo(0,h*.7);for(let i=0;i<=28;i++){const x=i*w/28,y=h*(.60+layer*.045)-Math.sin(i*1.2+layer)*h*.035-Math.abs(Math.sin(i*.41+layer))*h*.065;c.lineTo(x,y)}c.lineTo(w,h);c.lineTo(0,h);c.fill()}
 for(let i=0;i<25;i++){const y=h*.68+i*i*h*.00048;c.strokeStyle=i%3?'#91c5d51a':'#c4e8f52a';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
 for(const side of [-1,1]){c.strokeStyle='#99d4e259';c.lineWidth=w*.002;c.beginPath();c.moveTo(w*.5+side*w*.025,h*.68);c.lineTo(w*.5+side*w*.36,h);c.stroke()}
 for(let i=0;i<44;i++){c.fillStyle='#d6ecff'+(i%3?'65':'a0');c.fillRect((i*137.7)%w,(i*47.4)%(h*.48),i%4?1:2,i%4?1:2)}
 const pulse=show?Math.sin(t*.5)*.025:0;c.fillStyle='#e9f1f6';c.textAlign='center';c.font='400 '+Math.round(h*.125)+'px Georgia';c.fillText('EXO HORIZON #6',w*.5,h*(.34+pulse));c.font=Math.round(h*.047)+'px Georgia';c.fillText('EXhOrizon',w*.5,h*.44);c.font=Math.round(h*.027)+'px Arial';c.fillText('S I N G A P O R E   I N D O O R   S T A D I U M',w*.5,h*.52);
 // Fine cabinet-scale pixel lines, rather than a flat block of colour.
 c.fillStyle='#00000013';for(let y=0;y<h;y+=5)c.fillRect(0,y,w,1);
}
function screenTexture(){const c=document.createElement('canvas');c.width=1536;c.height=640;paintStageArtwork(c.getContext('2d'),c.width,c.height);return new THREE.CanvasTexture(c)}
const screenMaterial=new THREE.MeshBasicMaterial({map:screenTexture(),side:THREE.DoubleSide}),stageScreens=[];
// Continuous black backing and three framed LED banks fill the production wall.
stageBox(.65,13.5,35.5,backX+.35,8.8,stageZ,'#080c13');
for(const [z,width,height,y] of [[stageZ,18,10,8.8],[stageZ-13.3,7.8,10,8.8],[stageZ+13.3,7.8,10,8.8]]){
 stageBox(.48,height+.4,width+.4,backX+.8,y,z,'#363b43');
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),screenMaterial);panel.rotation.y=Math.PI/2;panel.position.set(backX+1.06,y,z);panel.name='EXO HORIZON #6 LED screen';stageScreens.push(panel);stageAssembly.add(panel);
 // Rear cabinet divisions, mounting ribs and screen feet remain visible in 3D.
 for(let zz=z-width/2;zz<=z+width/2;zz+=1.5)stageBox(.12,height,.045,backX+.48,y,zz,'#555f6c');
 for(let yy=y-height/2;yy<=y+height/2;yy+=1.25)stageBox(.12,.045,width,backX+.48,yy,z,'#48515d');
 for(const zz of [z-width*.38,z+width*.38])stageBox(.48,3.9,.3,backX+.55,1.95,zz,'#222a34');
}
// Five distinct stage models inspired by the supplied black-outfit poster.
function createStagePerformer(index){
 const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:['#dfb59b','#e3baa0','#e6c0a7','#dbad92','#d9ae95'][index],roughness:.6}),coat=new THREE.MeshStandardMaterial({color:['#182027','#131a20','#20262d','#151e25','#11191f'][index],roughness:.36,metalness:.18}),cloth=new THREE.MeshStandardMaterial({color:'#11151b',roughness:.85}),hair=new THREE.MeshStandardMaterial({color:index===4?'#302724':'#171719',roughness:.5}),metal=new THREE.MeshStandardMaterial({color:'#b9c3ce',metalness:.8,roughness:.25}),white=new THREE.MeshStandardMaterial({color:'#eee4dd'}),dark=new THREE.MeshStandardMaterial({color:'#25201f'}),lip=new THREE.MeshStandardMaterial({color:'#a56d68',roughness:.8});
 const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1,parent=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m};
 const ell=(mat,x,y,z,a,b,c,parent=g)=>add(new THREE.SphereGeometry(1,16,12),mat,x,y,z,a,b,c,parent);
 const box=(mat,x,y,z,a,b,c,parent=g)=>add(new THREE.BoxGeometry(a,b,c),mat,x,y,z,1,1,1,parent);
 const height=[1.04,1.015,.97,1,1.055][index],faceWidth=[.115,.12,.119,.112,.118][index];
 for(const side of [-1,1]){add(new THREE.CylinderGeometry(.07,.06,.83,10),cloth,side*.105,.48,0);box(coat,side*.105,.07,.06,.16,.14,.31);box(metal,side*.105,.015,.07,.16,.02,.31)}
 add(new THREE.CylinderGeometry(.205,.155,.59,12),coat,0,1.19,0,1,1,.64);ell(coat,0,1.46,0,.235,.08,.135);box(cloth,0,1.34,.13,.13,.36,.015);
 for(const side of [-1,1]){const lapel=box(coat,side*.075,1.39,.145,.075,.28,.025);lapel.rotation.z=side*-.25;box(metal,side*.125,1.17,.135,.005,.28,.008);box(coat,side*.143,1.32,.145,.09,.025,.025);if(index===0||index===4){const tail=box(coat,side*.11,.72,-.03,.21,.62,.09);tail.rotation.z=side*.04}}
 box(metal,0,.925,.137,.075,.035,.018);add(new THREE.CylinderGeometry(.055,.06,.1,12),skin,0,1.55,0);
 ell(skin,0,1.73,0,faceWidth,.166,.112);ell(skin,0,1.64,.025,faceWidth*.78,.085,.079);
 for(const side of [-1,1]){ell(skin,side*.119,1.715,0,.024,.045,.023);ell(white,side*.045,1.742,.103,.024,.008,.005);ell(dark,side*.045,1.742,.109,.009,.008,.003);const brow=box(hair,side*.046,1.769,.106,.045,.008,.006);brow.rotation.z=side*-.08;ell(skin,side*.069,1.702,.078,.034,.025,.024)}
 ell(skin,0,1.709,.112,.017,.033,.023);ell(lip,0,1.671,.104,.031,.006,.004);box(dark,0,1.673,.108,.036,.002,.002);
 ell(hair,0,1.82,-.018,.129,.098,.116);ell(hair,-.105,1.752,-.01,.027,.072,.092);ell(hair,.105,1.752,-.01,.027,.072,.092);
 // Separate fringe locks and partings follow the five silhouettes in the poster.
 const locks=index===0?5:index===1||index===3?8:11;
 for(let j=0;j<locks;j++){const u=j/(locks-1),x=(u-.5)*.22,parted=index===1||index===3,drop=parted?Math.abs(u-.5)*.055:index===0?.01:.055;const strand=ell(hair,x,1.81-drop,.073,.021,index===0?.05:.069,.039);strand.rotation.z=index===0?-.45:(u<.5?-.2:.2)}
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.226,1.43,0);g.add(arm);add(new THREE.CylinderGeometry(.07,.056,.34,10),coat,side*.02,-.16,0,1,1,1,arm);const fore=add(new THREE.CylinderGeometry(.055,.04,.29,10),coat,side*.025,-.46,.03,1,1,1,arm);fore.rotation.x=-.14;ell(skin,side*.025,-.635,.06,.043,.064,.031,arm);for(let k=0;k<3;k++)box(coat,side*.028,-.36+k*.027,.055,.11,.009,.02,arm);arms.push(arm);if(side===1){add(new THREE.CylinderGeometry(.018,.018,.16,10),dark,side*.025,-.63,.125,1,1,1,arm).rotation.x=Math.PI/2;ell(metal,side*.025,-.63,.215,.028,.028,.03,arm)}}
 g.scale.set(1,height,1);g.userData.arms=arms;g.userData.illustrative=true;return g;
}
const performers=[];for(const [index,offset] of [-7,-3.5,0,3.5,7].entries()){const performer=createStagePerformer(index);performer.rotation.y=Math.PI/2;performer.position.set(sc[0],2.2,stageZ+offset);performer.userData.base=performer.position.clone();performers.push(performer);stageAssembly.add(performer)}
// Roof/walls provide enclosure only from within the arena.
const enclosure=[];enclosure.push(addBox(146,1,128,0,33,2,'#d3d6de'));for(const [x,z,w,d] of [[64,0,1,124],[0,-57,128,1],[0,61,128,1],[-65,0,1,124]])enclosure.push(addBox(w,30,d,x,15,z,'#c1c7d1'));
const productionRig=new THREE.Group();immersive.add(productionRig);
function rigBeam(a,b,r=.10,color='#424b5a'){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,A.distanceTo(B),8),new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.4}));mesh.position.copy(A.clone().add(B).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());productionRig.add(mesh);return mesh}
// An illustrative stage production rig: main LED wall, side screens, PA arrays,
// front lighting and physical runway edging, rather than a flat map icon.
const rigX=backX+7,rigY=16;
for(const x of [backX-1,rigX])for(const z of [stageZ-stageSpan/2,stageZ+stageSpan/2]){stageBeam([x,0,z],[x,rigY,z],.13);stageBeam([x-.25,0,z],[x-.25,rigY,z],.08);for(let y=0;y<rigY;y+=2)stageBeam([x-.25,y,z],[x,y+2,z],.05)}
for(const x of [backX-1,rigX]){stageBeam([x,rigY,stageZ-stageSpan/2],[x,rigY,stageZ+stageSpan/2],.15);stageBeam([x,rigY+.6,stageZ-stageSpan/2],[x,rigY+.6,stageZ+stageSpan/2],.1);for(let z=stageZ-stageSpan/2;z<stageZ+stageSpan/2;z+=3)stageBeam([x,rigY,z],[x,rigY+.6,Math.min(z+3,stageZ+stageSpan/2)],.055)}
for(const z of [stageZ-stageSpan/2,stageZ+stageSpan/2])stageBeam([backX-1,rigY,z],[rigX,rigY,z],.13);
for(const side of [-1,1]){for(let i=0;i<6;i++){const speaker=addBox(1.3,.65,1.45,backX+3,13-i*.68,stageZ+side*(stageSpan/2-1.1),'#222a37',stageAssembly);speaker.rotation.z=-.06*i;addBox(.035,.38,1.1,backX+3.68,13-i*.68,stageZ+side*(stageSpan/2-1.1),'#3a4557',stageAssembly)}}
for(let i=0;i<9;i++){const z=stageZ-stageSpan*.43+i*stageSpan*.86/8;const fixture=new THREE.Mesh(new THREE.CylinderGeometry(.31,.38,.65,10),material('#253044'));fixture.rotation.z=Math.PI/4;fixture.position.set(rigX,15.4,z);stageAssembly.add(fixture);const lens=new THREE.Mesh(new THREE.SphereGeometry(.23,10,7),new THREE.MeshBasicMaterial({color:i%2?'#d2b5ff':'#a8d8ff'}));lens.position.set(rigX+.2,15.13,z);stageAssembly.add(lens)}
// Thin illuminated runway edging makes the platform depth legible from above.
for(const polygon of [window.SIS_REFERENCE.stageOutline]){const points=polygon.map(p=>new THREE.Vector3(p[0],2.24,p[1]));points.push(points[0]);productionRig.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#b4becd'})))}
for(const z of zones.filter(z=>['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id))){for(let i=0;i<z.polygon.length;i++){const a=z.polygon[i],b=z.polygon[(i+1)%z.polygon.length];rigBeam([a[0],.9,a[1]],[b[0],.9,b[1]],.04,'#697586');const length=Math.hypot(a[0]-b[0],a[1]-b[1]);for(let t=0;t<=length;t+=3){const u=t/(length||1);rigBeam([a[0]+(b[0]-a[0])*u,0,a[1]+(b[1]-a[1])*u],[a[0]+(b[0]-a[0])*u,.9,a[1]+(b[1]-a[1])*u],.035,'#697586')}}}
// Production details from the supplied stage photographs; dimensions estimated.
const stageDetails=new THREE.Group();stageDetails.name='Stage deck, risers and production hardware';immersive.add(stageDetails);
// Fascia panel joints and lower skirting along every runway edge.
for(const poly of [window.SIS_REFERENCE.stageOutline])for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
 rigBeam([a[0],.16,a[1]],[b[0],.16,b[1]],.055,'#0b111a');
 for(let d=0;d<len;d+=1.4){const u=d/len,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;const joint=rigBeam([x,.2,z],[x,2.16,z],.012,'#171c24');stageDetails.add(joint)}
 const top=rigBeam([a[0],2.225,a[1]],[b[0],2.225,b[1]],.025,'#ccd1d8');stageDetails.add(top);
}
// Subtle deck joints clipped to the united footprint; no bright lines at joins.
for(const segment of window.SIS_REFERENCE.stageDeckSeams){const points=segment.map(p=>new THREE.Vector3(p[0],2.207,p[1]));stageDetails.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#414954',transparent:true,opacity:.5})))}
const inset=window.SIS_REFERENCE.stageInset.map(p=>new THREE.Vector3(p[0],2.218,p[1]));inset.push(inset[0]);stageDetails.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(inset),new THREE.LineBasicMaterial({color:'#8e99a7'})));
// Restrained white position tape on the centre platform, as in the stage photo.
for(const [x1,x2,z1,z2] of [[-16.8,-9.4,2.5,8.2],[-14.4,-11.8,2.5,8.2]]){const p=[[x1,z1],[x2,z1],[x2,z2],[x1,z2],[x1,z1]].map(p=>new THREE.Vector3(p[0],2.223,p[1]));stageDetails.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),new THREE.LineBasicMaterial({color:'#b3bbc6',transparent:true,opacity:.7})))}
// Three raised, two-step platforms behind the five-person performance line.
for(const [offset,width,rise] of [[-6,6,.48],[0,3.1,.78],[6,6,.48]]){
 const z=stageZ+offset;addBox(2.6,rise,width,sc[0]-.35,2.2+rise/2,z,'#252b34',stageAssembly);
 for(let k=0;k<2;k++){const y=2.2+rise*(k+1)/3;addBox(.48,rise*(k+1)/3,width,sc[0]+1.19+(1-k)*.44,2.2+rise*(k+1)/6,z,'#343b45',stageAssembly);stageBeam([sc[0]+1.44+(1-k)*.44,y,z-width/2],[sc[0]+1.44+(1-k)*.44,y,z+width/2],.018,'#e2e5e9')}
 stageBeam([sc[0]+.97,2.2+rise,z-width/2],[sc[0]+.97,2.2+rise,z+width/2],.022,'#d7dce2');
}
for(let i=0;i<performers.length;i++){performers[i].position.y+=i===2?.78:.48;performers[i].userData.base.copy(performers[i].position)}
// Floor monitor wedges, lens housings, grilles and cable runs at the stage lip.
for(let i=0;i<8;i++){const z=stageZ-13+i*3.8,x=-27.235+(z+10.373)*2.42/35.085-.45;const wedge=addBox(.65,.36,1.05,x,2.43,z,'#101722',stageDetails);wedge.rotation.z=-.2;addBox(.025,.25,.88,x+.33,2.47,z,'#3d4652',stageDetails);for(let j=0;j<5;j++)addBox(.03,.018,.82,x+.35,2.38+j*.045,z,'#111923',stageDetails);rigBeam([x-.5,2.23,z],[x-2.8,2.23,z],.018,'#0b0e13')}
// Dense footlight and overhead fixture rows read clearly from distant seats.
for(let i=0;i<25;i++){const z=stageZ-stageSpan*.46+i*stageSpan*.92/24;addBox(.45,.3,.48,rigX,15.5,z,'#161f2c',stageAssembly);const lens=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:i%3?'#d2eaff':'#b7adff'}));lens.position.set(rigX+.24,15.38,z);stageAssembly.add(lens);const floorLens=lens.clone();floorLens.position.set(backX+2.3,2.55,z);stageAssembly.add(floorLens);addBox(.35,.3,.4,backX+2.18,2.4,z,'#101824',stageAssembly)}
// Intermediate fly bars, bracing and suspension drops connect the rig to roof steel.
for(const x of [backX+1,backX+4,rigX]){stageBeam([x,17.1,stageZ-stageSpan/2],[x,17.1,stageZ+stageSpan/2],.08,'#7c8796');for(const z of [stageZ-stageSpan*.43,stageZ,stageZ+stageSpan*.43])stageBeam([x,17.1,z],[x,30,z],.018,'#424c59')}
// A four-faced suspended display, visible from the upper terraces.
const overheadDisplay=new THREE.Group();overheadDisplay.name='Suspended concert display';immersive.add(overheadDisplay);enclosure.push(overheadDisplay);const displayX=sc[0]+20,displayY=23;
addBox(8.4,4.6,8.4,displayX,displayY,stageZ,'#111824',overheadDisplay);
for(let i=0;i<4;i++){const angle=i*Math.PI/2,panel=new THREE.Mesh(new THREE.PlaneGeometry(8,4),screenMaterial);panel.position.set(displayX+Math.sin(angle)*4.23,displayY,stageZ+Math.cos(angle)*4.23);panel.rotation.y=angle;overheadDisplay.add(panel)}
for(const dx of [-3,3])for(const dz of [-3,3])rigBeam([displayX+dx,displayY+2.4,stageZ+dz],[displayX+dx,30,stageZ+dz],.025,'#505b6b');
// Clear stepped aisles and real 3D railing geometry. Dimensions are illustrative.
const architecture=new THREE.Group();architecture.name='Stairs and guardrails';immersive.add(architecture);
const stairParts=[],walkParts=[],railParts=[];
function rail(a,b,r=.035){if(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))>.001)railParts.push({a,b,r})}
function stairEdge(z,v,side){const a=position(z,.025,v),b=position(z,.975,v),width=a.distanceTo(b),fraction=Math.min(.22,.9/(width||1)),u=.025+fraction*(side==='left'?.04:side==='right'?.96:.5);return{point:position(z,u,v),width:Math.max(.22,width*fraction/.95),across:a.clone().sub(b).normalize()}}
for(const z of zones.filter(z=>!['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id))){const count=rowsFor(z)*2,base=surfaceHeight(z,.025),top=surfaceHeight(z,.975),rise=(top-base)/Math.max(1,count-1);const levels=[];
 for(let k=0;k<count;k++){const v=.025+.95*(k+.5)/count,edge=stairEdge(z,v,'middle'),point=edge.point,y=base+k*rise,prior=stairEdge(z,Math.max(.025,v-.95/count),'middle').point,next=stairEdge(z,Math.min(.975,v+.95/count),'middle').point,depth=Math.max(.16,prior.distanceTo(next)/2),angle=-Math.atan2(edge.across.z,edge.across.x);stairParts.push({p:[point.x,y-.09,point.z],s:[edge.width,.18,depth+.015],angle});levels.push({v,y});
 // Contrasting tread nosing helps the stair flight read from a seated view.
 const nose=point.clone().add(next.clone().sub(prior).normalize().multiplyScalar(-depth*.38));rail([nose.x-edge.across.x*edge.width*.45,y+.012,nose.z-edge.across.z*edge.width*.45],[nose.x+edge.across.x*edge.width*.45,y+.012,nose.z+edge.across.z*edge.width*.45],.013)
 }
 for(const side of ['left','right'])for(let k=0;k<levels.length;k++){const {v,y}=levels[k],a=stairEdge(z,v,side).point;if(k%3===0||k===levels.length-1){rail([a.x,y+.08,a.z],[a.x,y+1.02,a.z],.035)}if(k<levels.length-1){const next=levels[k+1],b=stairEdge(z,next.v,side).point;rail([a.x,y+1.02,a.z],[b.x,next.y+1.02,b.z],.04);rail([a.x,y+.52,a.z],[b.x,next.y+.52,b.z],.025)}}
 // Front landings and guardrails across each tier.
 const a=position(z,.025,.018),b=position(z,.975,.018),y=surfaceHeight(z,.018),distance=a.distanceTo(b),c=a.clone().add(b).multiplyScalar(.5),angle=-Math.atan2(b.z-a.z,b.x-a.x);walkParts.push({p:[c.x,y-.1,c.z],s:[distance,.2,.65],angle});const guard=z.tier===2?1.06:.96;rail([a.x,y+guard,a.z],[b.x,y+guard,b.z],.045);rail([a.x,y+.5,a.z],[b.x,y+.5,b.z],.026);for(let d=0;d<=distance;d+=1.8){const u=d/(distance||1),x=a.x+(b.x-a.x)*u,zz=a.z+(b.z-a.z)*u;rail([x,y,zz],[x,y+guard,zz],.035)}
}
function instanceBoxes(items,color){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material(color),items.length);items.forEach((part,i)=>{tmpObject.position.set(...part.p);tmpObject.rotation.set(0,part.angle||0,0);tmpObject.scale.set(...part.s);tmpObject.updateMatrix();mesh.setMatrixAt(i,tmpObject.matrix)});mesh.frustumCulled=false;architecture.add(mesh);return mesh}
instanceBoxes(stairParts,'#b8bec7');instanceBoxes(walkParts,'#969fae');
const railingMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,7),new THREE.MeshStandardMaterial({color:'#5d6673',metalness:.55,roughness:.38}),railParts.length);const axis=new THREE.Vector3(0,1,0);railParts.forEach((part,i)=>{const a=new THREE.Vector3(...part.a),b=new THREE.Vector3(...part.b);tmpObject.position.copy(a.clone().add(b).multiplyScalar(.5));tmpObject.quaternion.setFromUnitVectors(axis,b.clone().sub(a).normalize());tmpObject.scale.set(part.r,a.distanceTo(b),part.r);tmpObject.updateMatrix();railingMesh.setMatrixAt(i,tmpObject.matrix)});railingMesh.frustumCulled=false;architecture.add(railingMesh);
// Carry architectural context into the top-down seating diagram as well.
const planArchitecture=new THREE.Group();planArchitecture.name='Plan stair aisles, barriers and service paths';bowl.add(planArchitecture);
function planLine(points,color='#687888',height=2.045,parent=planArchitecture){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],height,p[1]))),new THREE.LineBasicMaterial({color}));parent.add(line);return line}
for(const scale of [1.065,1.10]){const p=expandFootprint(scale);p.push(p[0]);planLine(p,'#697b8d',.13);const q=expandFootprint(scale);q.push(q[0]);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(q.map(p=>new THREE.Vector3(p[0],.035,p[1]))),new THREE.LineBasicMaterial({color:'#d0d6dd'}));arenaSurfaces.add(line)}
// Reuse the same tread positions as the 3D stair flights; do not invent seat IDs.
const planTreads=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material('#eef0f2'),stairParts.length);
stairParts.forEach((p,i)=>{tmpObject.position.set(p.p[0],2.025,p.p[2]);tmpObject.rotation.set(0,p.angle,0);tmpObject.scale.set(p.s[0],.025,Math.max(.09,p.s[2]*.75));tmpObject.updateMatrix();planTreads.setMatrixAt(i,tmpObject.matrix)});planTreads.frustumCulled=false;planArchitecture.add(planTreads);
for(const z of zones.filter(z=>z.bank!=='Arena')){
 const a=position(z,.025,.018),b=position(z,.975,.018);planLine([[a.x,a.z],[b.x,b.z]],'#4d6277');
 for(const side of ['left','right']){const p=[];for(let k=0;k<=12;k++){const q=stairEdge(z,.025+.95*k/12,side).point;p.push([q.x,q.z])}planLine(p,'#8594a3')}
 // Short landings connect the stair head to the outer circulation surface.
 const q=stairEdge(z,.975,'middle'),d=q.point.clone().sub(stairEdge(z,.85,'middle').point).normalize();planLine([[q.point.x,q.point.z],[q.point.x+d.x*1.4,q.point.z+d.z*1.4]],'#f0f2f4',2.03);
}
for(const z of zones.filter(z=>z.bank==='Arena')){const p=[...z.polygon,z.polygon[0]];planLine(p,'#5d6b79',2.02);for(let i=0;i<z.polygon.length;i++){const a=z.polygon[i],b=z.polygon[(i+1)%z.polygon.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<len;d+=2){const u=d/len;addBox(.12,.04,.12,a[0]+(b[0]-a[0])*u,2.05,a[1]+(b[1]-a[1])*u,'#43596d',planArchitecture)}}}
// Stage footprint and edge trim read against the arena floor.
for(const p of [window.SIS_REFERENCE.stageOutline])planLine([...p,p[0]],'#687786',.86);
// Plan seating uses the same clipped section cross-sections and clear aisle
// as the arena. These chair symbols are illustrative, not ticket coordinates.
const planSeats=[],planBacks=[];
for(const z of zones.filter(z=>z.bank!=='Arena')){
 const outline=[...z.polygon,z.polygon[0]];planLine(outline,'#53687c',1.84);
 const rows=rowsFor(z),normal=z.bank==='North'?[1,0]:z.bank==='West'?[0,-1]:[0,1];
 const angle=Math.atan2(-normal[0],-normal[1]);
 for(let row=0;row<rows;row++){
  const v=(row+.5)/rows,a=position(z,.025,v),b=position(z,.975,v),width=a.distanceTo(b);
  const aisle=Math.min(.22,.9/(width||1)),start=.025+aisle,span=.95-aisle;
  const cols=Math.floor(width*(1-aisle)/.66);if(cols<1)continue;
  const prev=position(z,.5,Math.max(.015,v-.4/rows)),next=position(z,.5,Math.min(.985,v+.4/rows));
  const depth=Math.min(.48,prev.distanceTo(next)*.72);
  for(let col=0;col<cols;col++){
   const q=position(z,start+(col+.5)/cols*span,v);
   // Avoid symbols protruding through narrow corner tips.
   const corners=[[-.21,-depth/2],[.21,-depth/2],[.21,depth/2],[-.21,depth/2]];
   if(!corners.every(([x,d])=>pointInBand({x:q.x+x*Math.cos(angle)+d*Math.sin(angle),z:q.z-x*Math.sin(angle)+d*Math.cos(angle)},z.polygon)))continue;
   const tint=categoryTint(z,q).lerp(new THREE.Color('#33465b'),.22);
   planSeats.push({point:q,angle,depth,tint});
  }
 }
 // A light badge keeps section numbers readable above the chair texture.
 const old=z.label;old.position.y=2.22;
 if(/^\d+$/.test(z.id)){
  const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(248,250,253,.94)';ctx.beginPath();ctx.roundRect(21,17,214,94,22);ctx.fill();
  ctx.strokeStyle='#65788b';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#182c40';ctx.font='700 64px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(z.id,128,67);
  old.geometry.dispose();old.geometry=new THREE.PlaneGeometry(z.id==='231'?3.8:2.8,z.id==='231'?1.9:1.4);old.material.map.dispose();old.material.map=new THREE.CanvasTexture(c);old.material.needsUpdate=true;
 }
}
const planSeatMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material('#ffffff'),planSeats.length);
const planBackMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material('#ffffff'),planSeats.length);
planSeats.forEach((seat,i)=>{
 tmpObject.rotation.set(0,seat.angle,0);tmpObject.position.set(seat.point.x,1.865,seat.point.z);tmpObject.scale.set(.42,.035,seat.depth);tmpObject.updateMatrix();planSeatMesh.setMatrixAt(i,tmpObject.matrix);planSeatMesh.setColorAt(i,seat.tint);
 tmpObject.position.x-=Math.sin(seat.angle)*seat.depth*.43;tmpObject.position.z-=Math.cos(seat.angle)*seat.depth*.43;tmpObject.position.y=1.905;tmpObject.scale.set(.45,.045,.075);tmpObject.updateMatrix();planBackMesh.setMatrixAt(i,tmpObject.matrix);planBackMesh.setColorAt(i,seat.tint.clone().multiplyScalar(.72));
});
planSeatMesh.frustumCulled=planBackMesh.frustumCulled=false;planArchitecture.add(planSeatMesh,planBackMesh);
// Physical low guardrails around the outer floor circulation edge.
const perimeter=expandFootprint(1.10);for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(const h of [.52,1.04])arenaSurfaces.add(rigBeam([a[0],h,a[1]],[b[0],h,b[1]],.033,'#647182'));for(let d=0;d<len;d+=2.6){const u=d/len,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;arenaSurfaces.add(rigBeam([x,0,z],[x,1.04,z],.03,'#647182'))}}
// A service deck and equipment at the existing sound-control footprint.
for(const parent of [immersive,bowl]){const y=parent===bowl?2.08:1.95;for(let i=0;i<3;i++){addBox(1.2,.2,1.6,fc[0]-2+i*1.7,y,fc[1],'#3c4858',parent);addBox(.13,.3,1.1,fc[0]-2+i*1.7,y+.22,fc[1]-.25,'#1d2c3e',parent)}}
// Stage access stairs and clearly visible stage fascia at the main platform.
for(let i=0;i<8;i++)addBox(.55,.28*(i+1),1.55,sc[0]-5.5+i*.5,.14*(i+1),stageZ+10,'#474d57',productionRig);
rigBeam([sc[0]-5.5,.95,stageZ+10.9],[sc[0]-2,3.05,stageZ+10.9],.04,'#747e8c');
// The photographs show exposed roof steelwork. Keep it above inside views,
// and remove it from the cutaway overview so the stage remains visible.
const roofSteel=new THREE.Group();roofSteel.name='Exposed roof trusses';immersive.add(roofSteel);enclosure.push(roofSteel);
function roofBeam(a,b,r=.10){const beam=rigBeam(a,b,r,'#b9c0cb');roofSteel.add(beam)}
for(let x=-60;x<=60;x+=12){roofBeam([x,30,-54],[x,30,57],.16);roofBeam([x,32,-54],[x,32,57],.1);for(let z=-54;z<57;z+=12)roofBeam([x,30,z],[x,32,Math.min(z+12,57)],.07)}
for(let z=-54;z<=54;z+=12){roofBeam([-62,30,z],[62,30,z],.15);for(let x=-60;x<60;x+=12)roofBeam([x,30,z],[x+12,32,z],.065)}
for(const z of zones){const y=['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(z.id)?2:surfaceHeight(z,.65)+1.25;const text=z.id.startsWith('CAT1-')?'CAT 1 STANDING':z.id.startsWith('VIP-')?'VIP STANDING':z.id.startsWith('P')?'PEN '+z.id.slice(-1):z.id;const mark=label(text,z.center[0],y,z.center[1],z.id.startsWith('CAT1-')?9:z.id.startsWith('VIP-')?9:z.id.startsWith('P')?8:3.8,'#e0e9fb');overviewLabels.add(mark)}
const stageMark=label('STAGE',sc[0],2.32,sc[1],12,'#b7c9e4');overviewLabels.add(stageMark);
// Show mode is a simulated concert environment. No strobing or video sync.
const showRig=new THREE.Group();showRig.name='Concert show lighting';stageAssembly.add(showRig);const movingBeams=[],showSpots=[];let showTime=0,lastShowFrame=0,lastScreenPaint=-1000;
const beamColors=['#70f1de','#b287ff','#659cff','#7bf3e5','#ca8be9','#54cce3','#a2d6ff','#a99dff','#6bdfd2'];
for(let i=0;i<9;i++){const start=new THREE.Vector3(rigX,15.2,stageZ-stageSpan*.43+i*stageSpan*.86/8),beam=new THREE.Mesh(new THREE.ConeGeometry(4,1,16,1,true),new THREE.MeshBasicMaterial({color:beamColors[i],transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));showRig.add(beam);movingBeams.push({beam,start,index:i});if(i%3===0){const spot=new THREE.SpotLight(beamColors[i],3.1,90,.27,.75,1);spot.position.copy(start);showRig.add(spot,spot.target);showSpots.push({spot,index:i})}}
for(const [z,color] of [[stageZ-7,'#9778ff'],[stageZ+7,'#68dbc8']]){const wash=new THREE.PointLight(color,1.7,32,1);wash.position.set(sc[0]+3,6,z);showRig.add(wash)}
const normalScreenMap=screenMaterial.map,showCanvas=document.createElement('canvas');showCanvas.width=768;showCanvas.height=384;const showContext=showCanvas.getContext('2d'),showScreenMap=new THREE.CanvasTexture(showCanvas);
function paintShowScreen(t){paintStageArtwork(showContext,768,384,t,true);showScreenMap.needsUpdate=true}
function applyShowLighting(){const show=crowdMode==='show'&&mode!=='plan';houseLight.intensity=show?.11:1.3;houseLight.color.set(show?'#8294bf':'#ffffff');houseLight.groundColor.set(show?'#101b2b':'#e1e1e1');light.intensity=show?.055:.7;showRig.visible=show;scene.fog=show?new THREE.FogExp2('#07111e',.0038):null;renderer.setClearColor(show?0x060d18:mode==='pov'?0x101b2b:0x0c1525);screenMaterial.map=show?showScreenMap:normalScreenMap;screenMaterial.needsUpdate=true;$('viewer').classList.toggle('showtime',show);if(show)paintShowScreen(showTime);for(const performer of performers){performer.position.copy(performer.userData.base);performer.rotation.y=Math.PI/2}}
const stageAimPoints=[...performers.map(p=>p.userData.base.clone().add(new THREE.Vector3(0,.7,0))),...[[2,.3],[2,.7],[3,.5],[4,.5]].map(([part,f])=>{const poly=window.SIS_REFERENCE.stageParts[part],c=center(poly);return new THREE.Vector3(c[0],2.6,c[1]).applyMatrix4(inverseStageMatrix)})];
function concertLightTarget(index,t){const p=stageAimPoints[index].clone();p.x+=Math.sin(t*.32+index)*.22;p.z+=Math.sin(t*.43+index*1.7)*.22;return p}
function animateShow(now){const running=crowdMode==='show'&&mode!=='plan';if(lastShowFrame&&!humanCrowd.isPaused()&&running)showTime+=Math.min(.065,(now-lastShowFrame)/1000);lastShowFrame=now;if(!running)return;const t=showTime;for(const item of movingBeams){const end=concertLightTarget(item.index,t),start=item.start,length=start.distanceTo(end);item.beam.position.copy(start.clone().add(end).multiplyScalar(.5));item.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),start.clone().sub(end).normalize());item.beam.scale.set(1,length,1);for(const lamp of showSpots)if(lamp.index===item.index)lamp.spot.target.position.copy(end)}for(let i=0;i<performers.length;i++){const a=performers[i],base=a.userData.base;a.position.copy(base);a.rotation.y=Math.PI/2+Math.sin(t*.65+i)*.065;a.rotation.z=0;for(const [j,arm] of a.userData.arms.entries()){arm.rotation.x=Math.sin(t*.85+i+j)*.10;arm.rotation.z=(j===0?1:-1)*(.06+Math.max(0,Math.sin(t*.45+i))*.12)}}if(now-lastScreenPaint>90){paintShowScreen(t);lastScreenPaint=now}}
function faceStage(){lookYaw=0;lookPitch=0;povCamera.fov=55;povCamera.updateProjectionMatrix()}
$('people').onchange=updateCrowd;$('eyeheight').onchange=()=>{updateCrowd();urlState()};$('face-stage').onclick=faceStage;
function update(){selected=zones.find(z=>z.id===ticket.section);const typedZone=zones.find(z=>z.id===normaliseSection($('section').value));if(typedZone)renderAreaPicker(areaFor(typedZone));syncSeatSelectors();for(const z of zones){z.mesh.material=z.original;z.mesh.material.emissive.setHex(ticket.located&&z===selected?0x1c2430:0);z.mesh.material.emissiveIntensity=ticket.located&&z===selected?.18:0}const markerY=mode==='plan'?selected.top:surfaceHeight(selected,.5);pin.position.set(selected.center[0],markerY+2.6,selected.center[1]);ring.position.set(selected.center[0],markerY+.15,selected.center[1]);pin.visible=ring.visible=ticket.located&&mode!=='pov';$('selection').textContent=ticket.located?(isStanding()?selected.name:`Level ${selected.tier===2?'3':'2'} · Section ${selected.id} · ${selected.bank}`):'Singapore Indoor Stadium';$('selecteddetail').textContent=!ticket.located?'Enter your ticket details to locate your section':isStanding()?'Standing area · no assigned seats':`Your ticket: Row ${ticket.row||'—'} · Seat ${ticket.seat||'—'}`;$('source-status').textContent=!ticket.located?'Select a section on the map, or use your ticket details.':mode==='pov'?'Representative section view · Exact ticket position not mapped.':'Section highlighted · Exact row / seat position not mapped.';$('pov').innerHTML=(isStanding()?'Preview standing area':'Preview section view')+' <span>↗</span>';$('pov').disabled=!ticket.located;$('capacity').textContent=ticket.located?'Section located. Exact row and seat coordinates are not available in the supplied maps.':'Your ticket details are kept as entered; they will not be converted into invented preview row numbers.';updateSeatHighlight();if(mode!=='plan')updateCrowd();urlState()}
function urlState(){const q=new URLSearchParams({zone:ticket.section,view:mode,eye:$('eyeheight').value,height:String(userHeight),people:$('people').checked?'1':'0',crowd:crowdMode});if(isStanding()){q.set('depth',$('pen-depth').value);q.set('side',$('pen-side').value)}else if(ticket.located){if(ticket.row)q.set('row',ticket.row);if(ticket.seat)q.set('seat',ticket.seat)}history.replaceState(null,'','?'+q)}
function setMode(m){const entering=m==='pov'&&mode!=='pov';mode=m;applyCategoryColours();if(entering){$('eyeheight').value=params.get('eye')==='standing'||crowdMode==='show'||selected&&['PA','PB','VIP-W','VIP-E','CAT1-W','CAT1-E'].includes(selected.id)?'standing':'seated';faceStage()}bowl.visible=m==='plan';immersive.visible=m!=='plan';overviewLabels.visible=m==='orbit';for(const room of enclosure)room.visible=m==='pov';$('pov-controls').hidden=m!=='pov';$('viewer').classList.toggle('immersive',m==='pov');applyShowLighting();for(const [id,v] of [['orbit','orbit'],['plan','plan'],['seatview','pov']])$(id).classList.toggle('active',m===v);pin.visible=ring.visible=m!=='pov';for(const o of labelObjects)o.visible=m!=='pov';$('gesture').textContent=matchMedia('(pointer:coarse)').matches?(m==='plan'?'Tap a section · Pinch to zoom':m==='pov'?'Drag to look around · Pinch to zoom':'Drag to orbit · Pinch to zoom · Tap a section'):m==='orbit'?'Drag to orbit the arena · Scroll to zoom · Click the stands':m==='plan'?'Seating rows & clear stair aisles · Click a section · Scroll to zoom':'Drag to look around · Scroll to zoom · Face stage to reset';update()}
$('orbit').onclick=()=>setMode('orbit');$('plan').onclick=()=>setMode('plan');$('seatview').onclick=$('pov').onclick=()=>{setMode('pov');faceStage();revealArena()};for(const id of ['pen-side','pen-depth'])$(id).addEventListener('change',update);$('reset').onclick=()=>{az=Math.PI/4;el=.75;zoom=1;setMode('orbit')};$('plus').onclick=()=>{if(mode==='pov'){povCamera.fov=Math.max(35,povCamera.fov-5);povCamera.updateProjectionMatrix()}else zoom=Math.min(2.6,zoom*1.15)};$('minus').onclick=()=>{if(mode==='pov'){povCamera.fov=Math.min(85,povCamera.fov+5);povCamera.updateProjectionMatrix()}else zoom=Math.max(.6,zoom/1.15)};$('about').onclick=()=>$('info').showModal();$('close').onclick=()=>$('info').close();$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('toast').textContent='View link copied'}catch{$('toast').textContent='Copy the link from your address bar'}$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2500)};
const canvas=$('scene'),touchPointers=new Map();let pinchDistance=0,gestureStart=null;
function zoomView(factor){if(mode==='pov'){povCamera.fov=Math.max(35,Math.min(85,povCamera.fov/factor));povCamera.updateProjectionMatrix()}else zoom=Math.max(.6,Math.min(2.6,zoom*factor))}
canvas.onpointerdown=e=>{touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPointers.size===1){drag={x:e.clientX,y:e.clientY};gestureStart={...drag};moved=false}else{moved=true;const [a,b]=[...touchPointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y)}canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!touchPointers.has(e.pointerId))return;touchPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPointers.size>1){const [a,b]=[...touchPointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&distance>0)zoomView(distance/pinchDistance);pinchDistance=distance;moved=true;return}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(gestureStart&&Math.hypot(e.clientX-gestureStart.x,e.clientY-gestureStart.y)>5)moved=true;if(mode==='pov'){lookYaw-=dx*.004;lookPitch=Math.max(-.65,Math.min(.65,lookPitch+dy*.003))}else if(mode!=='plan'){az-=dx*.006;el=Math.max(.38,Math.min(1.5,el+dy*.005))}drag={x:e.clientX,y:e.clientY}};
canvas.onpointerup=e=>{touchPointers.delete(e.pointerId);if(touchPointers.size){drag={...[...touchPointers.values()][0]};pinchDistance=0;moved=true;return}drag=null;pinchDistance=0;if(moved||mode==='pov')return;const r=canvas.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,mode==='plan'?camera:arenaCamera);const h=ray.intersectObjects(mode==='plan'?pickables:overviewPickables)[0];if(h){ticket={section:h.object.userData.zone.id,row:'',seat:'',located:true};$('section').value=ticket.section;$('row').value='';$('seat').value='';$('ticket-status').textContent='Section selected. Enter your ticket row and seat, then locate.';faceStage();update()}};
canvas.onpointercancel=canvas.onlostpointercapture=e=>{touchPointers.delete(e.pointerId);drag=null;pinchDistance=0;moved=true};
canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode==='pov'){povCamera.fov=Math.max(35,Math.min(85,povCamera.fov+e.deltaY*.025));povCamera.updateProjectionMatrix()}else zoom=Math.max(.6,Math.min(2.6,zoom-e.deltaY*.001))},{passive:false});
new ResizeObserver(()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);povCamera.aspect=canvas.clientWidth/canvas.clientHeight;povCamera.updateProjectionMatrix();arenaCamera.aspect=povCamera.aspect;arenaCamera.updateProjectionMatrix()}).observe(canvas);
function frame(now=0){requestAnimationFrame(frame);if(mode!=='plan')humanCrowd.tick(now);animateShow(now);const aspect=canvas.clientWidth/canvas.clientHeight,h=Math.max(114,112/aspect),w=h*aspect;camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.zoom=zoom;camera.updateProjectionMatrix();if(mode==='pov'){povCamera.position.copy(eyePosition());const stageTarget=new THREE.Vector3(sc[0],3.1,sc[1]),direction=stageTarget.sub(povCamera.position).normalize(),yaw=Math.atan2(direction.x,direction.z)+lookYaw,pitch=Math.asin(direction.y)+lookPitch;povCamera.lookAt(povCamera.position.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch))));renderer.render(scene,povCamera)}else{camera.up.set(0,1,0);if(mode==='plan'){camera.position.set(target.x,180,target.z+.001);camera.up.set(0,0,-1)}else{const distance=165/zoom*Math.max(1,.95/aspect);arenaCamera.aspect=aspect;arenaCamera.updateProjectionMatrix();arenaCamera.position.set(target.x+Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance+5,target.z+Math.cos(az)*Math.cos(el)*distance);arenaCamera.lookAt(target.x,5,target.z)}camera.lookAt(target);renderer.render(scene,mode==='plan'?camera:arenaCamera)}}$('pen-depth').value=['0.15','0.5','0.85'].includes(params.get('depth'))?params.get('depth'):'0.5';$('pen-side').value=['0.15','0.5','0.85'].includes(params.get('side'))?params.get('side'):'0.5';$('people').checked=params.get('people')!=='0';setMode(['pov','plan'].includes(params.get('view'))?params.get('view'):'orbit');frame();

function startShowSoundtrack(){window.EXOPlaylist.concert()}
function closeSoundtrack(){window.EXOPlaylist.stop()}
$('music-toggle').onclick=()=>window.EXOPlaylist.toggle();$('music-close').onclick=()=>window.EXOPlaylist.close();

// Shared Concert links request the same soundtrack as the Concert button.
if(crowdMode==='show')startShowSoundtrack();
