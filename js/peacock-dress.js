/* Maison Amani — the peacock, dressed in light.
   Takes the rig's opaque silhouette and gives it a material: smoked black to
   espresso, a soft key light from above-left, a slow lacquer sheen that drifts
   along body and train, and a fine champagne rim where edges face the light.
   Nothing here changes the silhouette: every effect is clipped to it. */
(function(root){
  function mkc(){ var c = document.createElement('canvas'); return [c, c.getContext('2d')]; }
  function Dress(){ var a=mkc(), b=mkc(), c=mkc(), h=mkc(); this.mk=a[0]; this.mg=a[1]; this.lay=b[0]; this.lg=b[1]; this.rim=c[0]; this.rg=c[1]; this.halo=h[0]; this.hg=h[1]; }
  Dress.prototype.build = function(rig, t, scale){
    var bx = rig.box, W = Math.ceil((bx[2]-bx[0])*scale), H = Math.ceil((bx[3]-bx[1])*scale);
    var mk=this.mk, mg=this.mg, lay=this.lay, lg=this.lg, rim=this.rim, rg=this.rg;
    [mk,lay,rim].forEach(function(c){ if(c.width!==W||c.height!==H){ c.width=W; c.height=H; } });
    // the silhouette, exactly as the rig draws it
    mg.setTransform(1,0,0,1,0,0); mg.clearRect(0,0,W,H);
    mg.setTransform(scale,0,0,scale,-bx[0]*scale,-bx[1]*scale); rig.draw(mg, t, '#000');
    // body: smoked black warming to espresso where the light falls
    lg.setTransform(1,0,0,1,0,0); lg.globalCompositeOperation='copy'; lg.globalAlpha=1; lg.drawImage(mk,0,0);
    lg.globalCompositeOperation='source-in';
    var g = lg.createLinearGradient(W*0.05, H*0.15, W*0.55, H*0.95);
    g.addColorStop(0,'#1C1815'); g.addColorStop(0.45,'#0F0D0C'); g.addColorStop(1,'#070606');
    lg.fillStyle=g; lg.fillRect(0,0,W,H);
    lg.globalCompositeOperation='source-atop';
    // a soft pool of key light over the shoulder and wing root
    var k = lg.createRadialGradient(W*0.22,H*0.42,0, W*0.22,H*0.42, W*0.34);
    k.addColorStop(0,'rgba(216,198,166,0.13)'); k.addColorStop(1,'rgba(216,198,166,0)');
    lg.fillStyle=k; lg.fillRect(0,0,W,H);
    // lacquer: one narrow, soft reflection that travels the length of the bird every ~11 s
    var ph = (t/11) % 1, cx = W*(-0.25 + 1.5*ph);
    var s = lg.createLinearGradient(cx - W*0.09, H*0.1, cx + W*0.09, H*0.55);
    s.addColorStop(0,'rgba(236,222,194,0)'); s.addColorStop(0.5,'rgba(236,222,194,0.11)'); s.addColorStop(1,'rgba(236,222,194,0)');
    lg.fillStyle=s; lg.fillRect(0,0,W,H);
    lg.globalCompositeOperation='source-over';
    // rim: keep only the edges that face the light (upper left), as a hairline
    var d = Math.max(0.9, Math.min(2.4, scale*9));
    rg.setTransform(1,0,0,1,0,0); rg.globalCompositeOperation='copy'; rg.drawImage(mk,0,0);
    rg.globalCompositeOperation='source-in'; rg.fillStyle='#D4BF96'; rg.fillRect(0,0,W,H);
    rg.globalCompositeOperation='destination-out'; rg.drawImage(mk, d*0.75, d);
    // the light falls off away from the key: full on the head and wing, fading down the train
    rg.globalCompositeOperation='destination-in';
    var f = rg.createLinearGradient(W*0.08, H*0.2, W*0.95, H*0.85);
    f.addColorStop(0,'rgba(0,0,0,1)'); f.addColorStop(0.45,'rgba(0,0,0,0.7)'); f.addColorStop(1,'rgba(0,0,0,0.28)');
    rg.fillStyle=f; rg.fillRect(0,0,W,H);
    rg.globalCompositeOperation='source-over';
    // halo: the silhouette's own soft glow, built in device pixels (shadows ignore transforms)
    var P = this.pad = Math.ceil(Math.max(W,H)*0.05), hb = this.halo;
    if(hb.width!==W+2*P || hb.height!==H+2*P){ hb.width=W+2*P; hb.height=H+2*P; }
    var hg=this.hg; hg.setTransform(1,0,0,1,0,0); hg.clearRect(0,0,hb.width,hb.height);
    hg.shadowColor='rgba(214,194,154,1)'; hg.shadowBlur=P*0.9; hg.shadowOffsetX=hb.width+40;
    hg.drawImage(mk, P-(hb.width+40), P);
    hg.shadowColor='transparent'; hg.shadowBlur=0; hg.shadowOffsetX=0;
    this.W=W; this.H=H;
  };
  // lay the dressed bird into a scene; dark=true for the night sky (a faint warm halo)
  Dress.prototype.paint = function(ctx, x, y, w, h, opts){
    opts = opts || {};
    if(opts.halo){
      var k = w/this.W, p = this.pad*k;
      ctx.save(); ctx.globalAlpha = opts.halo; ctx.drawImage(this.halo, x-p, y-p, w+2*p, h+2*p); ctx.restore();
    }
    ctx.drawImage(this.lay, x, y, w, h);
    ctx.save(); ctx.globalAlpha = opts.rim == null ? 0.55 : opts.rim; ctx.drawImage(this.rim, x, y, w, h); ctx.restore();
  };
  root.PeacockDress = Dress;
})(window);
