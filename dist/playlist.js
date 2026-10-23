/* Official YouTube playback; the player stays visible while music is playing. */
(()=>{
 const el=id=>document.getElementById(id),tracks=window.EXO_TRACKS;
 let index=0,player=null,ready=false,wantsPlay=false,loading=false,playing=false,expanded=false;
 const panel=el('soundtrack-panel'),toggle=el('music-toggle'),list=el('playlist-tracks'),play=el('soundtrack-play');
 const time=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
 const buttons=tracks.map((track,i)=>{const b=document.createElement('button');b.type='button';b.className='playlist-song';b.setAttribute('aria-label',`Play ${track.title}`);const n=document.createElement('span');n.className='song-number';n.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.className='song-title';title.textContent=track.title;const duration=document.createElement('span');duration.className='song-duration';duration.textContent=time(track.duration);b.append(n,title,duration);b.onclick=()=>select(i,true);list.append(b);return b});
 function status(text){el('playlist-status').textContent=text}
 function render(){el('playlist-title').textContent=tracks[index].title;el('playlist-counter').textContent=`${index+1} / ${tracks.length} · ${tracks[index].artist}`;el('soundtrack-source').href='https://www.youtube.com/watch?v='+tracks[index].id;play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',playing?'Pause playlist':'Play playlist');buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)))}
 function open(){expanded=true;panel.hidden=false;panel.classList.remove('docked');el('music-close').setAttribute('aria-label','Minimise soundtrack');toggle.setAttribute('aria-expanded','true');ensurePlayer()}
 function stop(){wantsPlay=false;if(ready)player.pauseVideo();playing=false;expanded=false;panel.hidden=true;panel.classList.remove('docked');toggle.setAttribute('aria-expanded','false');render()}
 function close(){if(!expanded){stop();return}expanded=false;toggle.setAttribute('aria-expanded','false');if(playing||wantsPlay){panel.hidden=false;panel.classList.add('docked');el('music-close').setAttribute('aria-label','Stop music and close player')}else stop()}
 function ensurePlayer(){
  if(player||loading)return;loading=true;
  if(window.YT&&window.YT.Player){createPlayer();return}
  const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(prior)prior();createPlayer()};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{loading=false;status('YouTube could not load. Use the YouTube link above or try Play again.')};document.head.append(script);
 }
 function createPlayer(){
  if(player)return;
  player=new YT.Player('soundtrack-video',{width:'298',height:'200',videoId:tracks[index].id,playerVars:{playsinline:1,rel:0,autoplay:wantsPlay&&!panel.hidden?1:0,origin:location.origin},events:{
   onReady:()=>{ready=true;loading=false;if(wantsPlay&&!panel.hidden){player.loadVideoById(tracks[index].id);status('Starting playback…')}else{player.cueVideoById(tracks[index].id);status('Ready. Choose a song or press Play.')}},
   onStateChange:e=>{
    if(e.data===YT.PlayerState.PLAYING){if(panel.hidden||document.hidden){player.pauseVideo();return}playing=true;wantsPlay=true;status('Playing · next song starts automatically.')}
    else if(e.data===YT.PlayerState.ENDED){playing=false;if(wantsPlay&&!panel.hidden){if(index<tracks.length-1)select(index+1,true,false);else{wantsPlay=false;status('Playlist finished. Choose a song to play again.')}}}
    else if(e.data===YT.PlayerState.PAUSED){playing=false;wantsPlay=false;status('Paused.')}
    else if(e.data===YT.PlayerState.BUFFERING){status('Loading song…')}
    render();
   },
   onAutoplayBlocked:()=>{playing=false;wantsPlay=false;render();status('Press Play in the YouTube player to start the music.')},
   onError:()=>{playing=false;wantsPlay=false;buttons[index].classList.add('unavailable');render();status('This song cannot play here. Press Next or open it on YouTube.')}
  }});
 }
 function select(next,autoplay,reveal=true){index=(next+tracks.length)%tracks.length;wantsPlay=autoplay;playing=false;render();if(reveal)open();else ensurePlayer();status(autoplay?'Starting '+tracks[index].title+'…':'Ready.');if(ready){if(autoplay)player.loadVideoById(tracks[index].id);else player.cueVideoById(tracks[index].id)}}
 function start(){wantsPlay=true;if(panel.hidden)open();else ensurePlayer();status('Starting '+tracks[index].title+'…');if(ready)player.playVideo()}
 function startConcert(){wantsPlay=true;if(panel.hidden)open();else ensurePlayer();if(expanded)close();status('Starting concert soundtrack…');if(ready){player.unMute();player.playVideo()}}
 play.onclick=()=>{if(ready&&playing){wantsPlay=false;player.pauseVideo()}else start()};
 el('playlist-next').onclick=()=>select(index+1,true,false);
 el('playlist-prev').onclick=()=>{if(ready&&player.getCurrentTime()>3){player.seekTo(0,true);wantsPlay=true;player.playVideo()}else select(index-1,true,false)};
 document.addEventListener('pointerdown',event=>{if(expanded&&!panel.contains(event.target)&&!toggle.contains(event.target))close()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){close();toggle.focus()}});
 // Never keep a hidden YouTube player running.
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready){wantsPlay=false;player.pauseVideo()}});
 window.EXOPlaylist={play:start,concert:startConcert,close,stop,toggle:()=>expanded?close():open()};render();
 // Prepare a paused player before the Concert click, preserving its user gesture.
 ensurePlayer();
})();
