// Procedural, articulated human models. Layout, bodies and motion are illustrative.
window.createHumanCrowd=function(THREE,group,audience,getEye){
 const geometries=new Map(),meshes=[],shaders=[];let activeMode='normal',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=0;
 const outfits=[['#b8b4aa','#43536d','#d5d1ca'],['#283849','#4c5d76','#ece9e2'],['#b17a61','#303b4d','#dad3c9'],['#777c96','#a6a6a4','#ece9e2'],['#e4d8ca','#627765','#e7e3da'],['#576b78','#353e50','#d7d1c8'],['#8e6f8b','#414b58','#e4ddd4'],['#bac4c0','#6a615a','#e9e7df']];
 const skins=['#c68f6d','#e7bc9c','#9a6249','#d0a17e','#bc8262','#e1af91','#8f5f49','#d7a78a'],hair=['#201c1b','#33231d','#161718','#6c4e37','#302523','#493328','#161a1b','#5a3e2c'];
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
 material.onBeforeCompile=shader=>{
 shader.uniforms.crowdTime={value:elapsed};shader.uniforms.crowdShow={value:0};
 shader.vertexShader='attribute vec4 crowdMotion; attribute float armPart; attribute vec3 armPivot; attribute float screenGlow; varying float vScreenGlow; uniform float crowdTime; uniform float crowdShow;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vScreenGlow=screenGlow;float phase=crowdMotion.x;float t=crowdTime;
 // Rigid arm rotation around the shoulder keeps the prop and hand together.
 float armAngle=sin(t*0.85+phase)*0.065*abs(armPart)*crowdShow;
 float ac=cos(armAngle),as=sin(armAngle);vec3 ap=transformed-armPivot;
 if(abs(armPart)>0.01){transformed.x=armPivot.x+ap.x*ac-ap.y*as;transformed.y=armPivot.y+ap.x*as+ap.y*ac;}
 // Feet stay planted during gentle upper-body weight shifts.
 float upper=smoothstep(0.65,1.65,position.y);float sway=sin(t*crowdMotion.y+phase)*crowdMotion.w;
 transformed.x+=sway*upper;transformed.z+=sin(t*0.57+phase)*crowdMotion.w*0.35*upper;
 float cheerWindow=pow(max(0.0,sin(t*0.15+phase)),16.0);
 transformed.y+=max(0.0,sin(t*3.5+phase))*crowdMotion.z*cheerWindow*crowdShow;`);
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 float na=sin(crowdTime*0.85+crowdMotion.x)*0.065*abs(armPart)*crowdShow;
 if(abs(armPart)>0.01)objectNormal.xy=mat2(cos(na),sin(na),-sin(na),cos(na))*objectNormal.xy;`);
 shader.fragmentShader='varying float vScreenGlow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vScreenGlow * vec3(0.65,0.92,1.0) * 1.8;');shaders.push(shader);
 };
 function model(style,pose,detail){const key=style+'-'+pose+'-'+detail;if(geometries.has(key))return geometries.get(key);const parts=[],outfit=outfits[style],skin=skins[style],h=hair[style],feminine=[2,3,4,6].includes(style),broad=style===1||style===5,width=feminine?.32:broad?.44:.38,seated=pose==='seated',legDrop=seated?.48:0,hipY=seated?.53:.91,shoulderY=hipY+.40,headY=hipY+.755;
 function part(geom,pos,scale,color,rot=[0,0,0],arm=0,glow=0){const g=geom.index?geom.toNonIndexed():geom;g.scale(...scale);const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot));g.applyMatrix4(m);g.translate(...pos);const c=new THREE.Color(color),count=g.attributes.position.count,colors=new Float32Array(count*3),arms=new Float32Array(count),glows=new Float32Array(count),pivots=new Float32Array(count*3);for(let i=0;i<count;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;arms[i]=arm*(pose==='phone'?.12:1);pivots[i*3]=Math.sign(arm)*width*.4;pivots[i*3+1]=shoulderY;glows[i]=glow}g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setAttribute('armPart',new THREE.BufferAttribute(arms,1));g.setAttribute('armPivot',new THREE.BufferAttribute(pivots,3));g.setAttribute('screenGlow',new THREE.BufferAttribute(glows,1));parts.push(g)}
 const sphere=(p,s,c,arm=0)=>part(new THREE.SphereGeometry(1,detail?16:8,detail?12:6),p,s,c,[0,0,0],arm),box=(p,s,c,rot=[0,0,0],arm=0,glow=0)=>part(new THREE.BoxGeometry(1,1,1),p,s,c,rot,arm,glow);
 function limb(a,b,r1,r2,color,arm=0){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r2,r1,A.distanceTo(B),detail?12:6,1),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());g.applyQuaternion(q);part(g,A.clone().add(B).multiplyScalar(.5).toArray(),[1,1,1],color,[0,0,0],arm)}
 // A continuous shaped torso, tapered waist and natural head/jaw profile.
 sphere([0,hipY-.015,0],[width*.42,.09,.105],outfit[1]);
 const profile=[[.15,0],[.17,.08],[.153,.2],[.177,.34],[.205,.41],[.195,.445],[.143,.49],[.067,.535]].map(([r,y])=>new THREE.Vector2(r,y));
 part(new THREE.LatheGeometry(profile,detail?20:10),[0,hipY,0],[width/.38,1,.65],outfit[0]);
 limb([0,hipY+.515,0],[0,hipY+.615,0],.043,.048,skin);
 const head=new THREE.SphereGeometry(1,detail?20:10,detail?16:8),hp=head.attributes.position;
 for(let i=0;i<hp.count;i++){const yy=hp.getY(i),taper=yy<-.2?1+(yy+.2)*.23:1;hp.setX(i,hp.getX(i)*taper)}head.computeVertexNormals();
 part(head,[0,headY,0],[.112+(style%3)*.004,.153,.105],skin);sphere([0,headY-.1,.028],[.075,.047,.065],skin);
 sphere([-.114,headY-.01,0],[.019,.034,.017],skin);sphere([.114,headY-.01,0],[.019,.034,.017],skin);
 // Hair silhouettes: short textured hair, bob, ponytail and long hair.
 sphere([0,headY+.077,-.018],[.13,.106,.118],h);
 if(feminine){const long=[2,4,6].includes(style);sphere([0,headY-.04,-.083],[.143,long?.22:.13,.087],h);if(style===4){sphere([.035,headY+.09,-.16],[.06,.09,.07],h);limb([.035,headY+.07,-.17],[.035,headY-.27,-.18],.05,.035,h)}}else if(style===5){sphere([0,headY+.13,0],[.13,.035,.12],'#364850')}
 if(detail){ // Small facial features hold up in neighbouring seats.
 for(const side of [-1,1]){sphere([side*.044,headY+.015,.105],[.022,.007,.004],'#f0e4d6');sphere([side*.044,headY+.015,.114],[.007,.007,.003],'#302c2a');box([side*.044,headY+.045,.111],[.043,.009,.005],h)}sphere([0,headY-.015,.116],[.019,.032,.022],skin);box([0,headY-.064,.108],[.034,.004,.004],'#8d5d52');
 if(style===1||style===7){for(const side of [-1,1])box([side*.044,headY+.016,.12],[.054,.033,.007],'#252931');box([0,headY+.016,.123],[.025,.006,.007],'#252931')}
 // Jacket seams, collar, shirt hem and fabric details.
 box([0,hipY+.3,.09],[.01,.42,.008],style%2?'#abb5be':'#706d6b');box([0,hipY+.08,.085],[width*.77,.02,.009],outfit[0]);for(const side of [-1,1])box([side*.09,hipY+.41,.094],[.07,.04,.008],outfit[0],[0,0,side*.13]);
 }
 for(const side of [-1,1]){const x=side*width*.28;if(seated){const hip=[x,hipY-.04,0],knee=[x,.49,.34],ankle=[x,.1,.36];limb(hip,knee,.083,.075,outfit[1]);limb(knee,ankle,.073,.05,outfit[1]);sphere([x,.058,.40],[.073,.052,.13],outfit[2])}else{const hip=[x,hipY-.04,0],knee=[x*1.07,.49,.015],ankle=[x*1.18,.10,.018];limb(hip,knee,.089,.065,outfit[1]);limb(knee,ankle,.063,.045,style===0?skin:outfit[1]);sphere([x*1.18,.058,.08],[.073,.053,.14],outfit[2])}}
 if(style===6&&!seated){part(new THREE.CylinderGeometry(.16,.29,.45,10),[0,hipY-.16,0],[1,1,.8],outfit[0])}
 let phone=null;
 for(const side of [-1,1]){const shoulder=[side*width*.4,shoulderY,0];let elbow,hand;const raised=(pose==='phone'||pose==='lightstick')&&side===1||pose==='cheer';if(raised){elbow=pose==='phone'?[side*.27,shoulderY-.12,.19]:[side*.29,shoulderY+.15,.1];hand=pose==='phone'?[side*.17,headY+.015,.35]:[side*.22,headY+(pose==='cheer'?.29:.17),.17];if(side===1)phone=hand}else if(seated){elbow=[side*.27,hipY+.23,.08];hand=[side*.18,hipY+.04,.29]}else{elbow=[side*.22,hipY+.18,.015];hand=[side*.21,hipY-.02,.08]}
 const arm=raised?side:0;limb(shoulder,elbow,.068,.052,outfit[0],arm);limb(elbow,hand,.045,.032,skin,arm);sphere(elbow,[.052,.052,.049],skin,arm);sphere(hand,[.034,.047,.022],skin,arm);
 if(detail){for(let finger=0;finger<4;finger++){const fx=hand[0]+(finger-1.5)*.012;limb([fx,hand[1]-.018,hand[2]+.006],[fx,hand[1]-.051,hand[2]+.02],.007,.0055,skin,arm)}limb([hand[0]-side*.025,hand[1]+.006,hand[2]+.012],[hand[0]-side*.038,hand[1]-.017,hand[2]+.026],.009,.007,skin,arm)}
 }
 if(phone&&(pose==='lightstick'||pose==='cheer')){
 const [x,y,z]=phone,cx=x-.012,cy=y+.355,r=.134;
 // Tapered silver grip, dark end cap, collar and inset power button.
 part(new THREE.CylinderGeometry(.028,.019,.285,detail?12:7),[x,y+.115,z],[1,1,1],'#d3d5da',[0,0,.035],1);
 part(new THREE.CylinderGeometry(.03,.03,.016,detail?12:7),[x,y+.257,z],[1,1,1],'#a9afb8',[0,0,0],1);
 part(new THREE.CylinderGeometry(.021,.021,.018,detail?12:7),[x+.004,y-.033,z],[1,1,1],'#393e46',[0,0,0],1);
 const hex=(radius)=>Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*radius,Math.sin(i*Math.PI/3)*radius]);
 function frame(radius,width,depth,color,cz){const pts=hex(radius),inner=hex(radius-width),shape=new THREE.Shape();shape.moveTo(...pts[0]);for(let i=1;i<6;i++)shape.lineTo(...pts[i]);shape.closePath();const hole=new THREE.Path();hole.moveTo(...inner[5]);for(let i=4;i>=0;i--)hole.lineTo(...inner[i]);hole.closePath();shape.holes.push(hole);part(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:detail,bevelThickness:.0015,bevelSize:.0015,bevelSegments:1,steps:1}),[cx,cy,cz-depth/2],[1,1,1],color,[0,0,0],1)}
 // Thick six-sided rim around a recessed layered face.
 frame(r,.011,.037,'#747e88',z);frame(r-.004,.003,.039,'#e8eced',z);
 const pts=hex(r-.014),shape=new THREE.Shape();shape.moveTo(...pts[0]);for(let i=1;i<6;i++)shape.lineTo(...pts[i]);shape.closePath();part(new THREE.ExtrudeGeometry(shape,{depth:.021,bevelEnabled:false}),[cx,cy,z-.0105],[1,1,1],'#a8b5bc',[0,0,0],1);
 function stroke(points,color,width,glow=0,faceZ=z+.014){for(let j=1;j<points.length;j++){const A=new THREE.Vector3(cx+points[j-1][0],cy+points[j-1][1],faceZ),B=new THREE.Vector3(cx+points[j][0],cy+points[j][1],faceZ),geom=new THREE.CylinderGeometry(width,width,A.distanceTo(B),detail?5:3,1);geom.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize()));part(geom,A.clone().add(B).multiplyScalar(.5).toArray(),[1,1,1],color,[0,0,0],1,glow)}}
 for(const faceSide of [-1,1]){const faceZ=z+faceSide*.015;
 // Nested diamond and triangle grooves echo the raised EXO optical pattern.
 const layers=detail?6:2;for(let k=0;k<layers;k++){const v=.102-k*.009;stroke([[.009,0],[v*.57,v*.86],[v,0],[v*.57,-v*.86],[.009,0]],k%2?'#d1d9dd':'#7d8d98',detail?.0016:.002,0,faceZ);stroke([[-v*.57,v*.86],[-v*.13,v*.86],[0,v*.12],[-v*.57,v*.86]],'#85949e',.0014,0,faceZ);stroke([[-v*.57,-v*.86],[-v*.13,-v*.86],[0,-v*.12],[-v*.57,-v*.86]],'#85949e',.0014,0,faceZ)}
 // Continuous pale cyan E / X outline, inset within the metallic frame.
 const v=.112;stroke([[-v*.5,v*.866],[-v,0],[-v*.5,-v*.866]],'#bdffff',.0035,1,faceZ+faceSide*.003);stroke([[-v,0],[-v*.49,0]],'#c9ffff',.004,1,faceZ+faceSide*.003);stroke([[-v*.5,v*.866],[0,0],[-v*.5,-v*.866]],'#e6fcff',.0035,1,faceZ+faceSide*.003);stroke([[v*.5,v*.866],[0,0],[v*.5,-v*.866],[v,0],[v*.5,v*.866]],'#e6ffff',.0035,1,faceZ+faceSide*.003);
 }
 if(detail){const logo=hex(.011).map(([a,b])=>[a+x-cx,b+y+.18-cy]);logo.push(logo[0]);stroke(logo,'#8b949f',.001,0,z+.028);stroke([[x-cx-.005,y+.174-cy],[x-cx+.005,y+.186-cy]],'#89939e',.0009,0,z+.029);box([x,y+.116,z+.028],[.008,.016,.002],'#e9edef',[0,0,0],1)}
 }

 if(phone&&pose==='phone'){const [x,y,z]=phone;box([x,y+.055,z+.015],[.085,.16,.015],'#151a21',[0,0,.08],1);box([x,y+.055,z+.005],[.069,.137,.004],'#d8eaff',[0,0,.08],1,1);if(detail)box([x,y+.111,z-.001],[.025,.008,.003],'#27313e',[0,0,.08],1)}
 const merged=new THREE.BufferGeometry();for(const name of ['position','normal','color','armPart','armPivot','screenGlow']){const itemSize=parts[0].attributes[name].itemSize,total=parts.reduce((n,g)=>n+g.attributes[name].array.length,0),data=new Float32Array(total);let off=0;for(const g of parts){data.set(g.attributes[name].array,off);off+=g.attributes[name].array.length}merged.setAttribute(name,new THREE.BufferAttribute(data,itemSize))}for(const g of parts)g.dispose();merged.computeBoundingSphere();geometries.set(key,merged);return merged}
 const o=new THREE.Object3D();
 function rebuild(mode){activeMode=mode;for(const m of meshes){group.remove(m);m.geometry.dispose();m.dispose?.()}meshes.length=0;const eye=getEye(),buckets=new Map();for(let i=0;i<audience.length;i++){const a=audience[i];if(Math.hypot(eye.x-a.point.x,eye.z-a.point.z)<.58)continue;const seed=(i*48271+Number(a.hash||0)*997)%2147483647,style=(seed>>>3)%8,detail=Math.hypot(eye.x-a.point.x,eye.z-a.point.z)<13?1:0,pose=mode==='normal'?(a.standing?'standing':'seated'):(seed%7===0?'phone':seed%3===0?'cheer':'lightstick'),key=style+'-'+pose+'-'+detail;let bucket=buckets.get(key);if(!bucket)buckets.set(key,bucket={style,pose,detail,actors:[]});bucket.actors.push({a,seed,i})}
 for(const b of buckets.values()){const geometry=model(b.style,b.pose,b.detail).clone(),motions=new Float32Array(b.actors.length*4),mesh=new THREE.InstancedMesh(geometry,material,b.actors.length);mesh.userData.transientGeometry=true;mesh.frustumCulled=false;
 for(let i=0;i<b.actors.length;i++){const {a,seed}=b.actors[i],height=.84+(seed%101)/100*.20,width=.91+((seed>>>7)%23)/100;const jump=activeMode==='show'&&b.pose==='cheer'&&seed%19===0?.045:0;o.position.copy(a.point);o.rotation.set(0,a.angle+((seed%17)-8)*.007,0);o.scale.set(width,height,width);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);motions[i*4]=(seed%628)/100;motions[i*4+1]=.55+(seed%25)/100;motions[i*4+2]=jump;motions[i*4+3]=activeMode==='show'?.008+(seed%6)/1000:.001}
 geometry.setAttribute('crowdMotion',new THREE.InstancedBufferAttribute(motions,4));mesh.instanceMatrix.needsUpdate=true;group.add(mesh);meshes.push(mesh)}
 }
 function tick(now){if(last&&!paused&&group.visible)elapsed+=Math.min(.07,(now-last)/1000);last=now;for(const shader of shaders){shader.uniforms.crowdTime.value=elapsed;shader.uniforms.crowdShow.value=activeMode==='show'?1:0}}
 return{rebuild,tick,setPaused(value){paused=value},isPaused(){return paused},getMode(){return activeMode},model,meshes};
};
