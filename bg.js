/* ════════════════════════════════════════
   PARKBRIDGE — Animated Background Engine
   Works on all pages (desktop + mobile)
   ════════════════════════════════════════ */

(function () {
  /* ── CURSOR ── */
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  const dot  = document.getElementById("cur-dot");
  const ring = document.getElementById("cur-ring");
  if (dot && ring) {
    document.addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });
    (function ac() {
      dot.style.left  = mx + "px"; dot.style.top  = my + "px";
      rx += (mx - rx) * 0.13;     ry += (my - ry) * 0.13;
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      requestAnimationFrame(ac);
    })();
  }

  /* ── CITY CANVAS ── */
  const cvC = document.getElementById("cv-city");
  if (cvC) {
    const ctx = cvC.getContext("2d");
    let W, H;
    const rs = () => { W = cvC.width = innerWidth; H = cvC.height = innerHeight; };
    rs(); window.addEventListener("resize", rs);

    const hR = [.18, .38, .58, .78];
    const vR = [.15, .35, .55, .75, .92];
    const COLS = [
      "rgba(0,255,231,.8)", "rgba(255,77,106,.8)", "rgba(255,215,0,.75)",
      "rgba(124,58,237,.8)", "rgba(0,191,255,.8)", "rgba(0,255,136,.7)"
    ];
    const cars = [];
    hR.forEach(y => {
      for (let i = 0; i < 5; i++)
        cars.push({ x: Math.random() * 2000, y, vx: (Math.random() > .5 ? 1 : -1) * (.6 + Math.random() * 1.8), vy: 0, w: 26, h: 11, col: COLS[~~(Math.random() * COLS.length)], dir: "h", hl: Math.random() > .4 });
    });
    vR.forEach(x => {
      for (let i = 0; i < 4; i++)
        cars.push({ x, y: Math.random() * 2000, vx: 0, vy: (Math.random() > .5 ? 1 : -1) * (.6 + Math.random() * 1.5), w: 11, h: 26, col: COLS[~~(Math.random() * COLS.length)], dir: "v", hl: Math.random() > .4 });
    });

    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random() * 1920, y: Math.random() * 1080,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 2 + .5, ph: Math.random() * Math.PI * 2
    }));
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * 1920, y: Math.random() * 1080,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .4, a: Math.random() * .35 + .08, ph: Math.random() * Math.PI * 2
    }));

    let frame = 0;
    function drawCity() {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // cursor glow
      const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 550);
      cg.addColorStop(0, "rgba(0,255,231,.055)"); cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      // corner glows
      [[0,0,"rgba(0,255,231,.035)"], [W,0,"rgba(124,58,237,.028)"], [0,H,"rgba(255,77,106,.028)"], [W,H,"rgba(0,191,255,.035)"]].forEach(([x, y, c]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 380); g.addColorStop(0, c); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });

      // roads
      hR.forEach(yf => {
        const y = yf * H;
        ctx.strokeStyle = "rgba(0,255,231,.055)"; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.setLineDash([28, 18]); ctx.strokeStyle = "rgba(0,255,231,.1)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]);
      });
      vR.forEach(xf => {
        const x = xf * W;
        ctx.strokeStyle = "rgba(0,255,231,.055)"; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.setLineDash([28, 18]); ctx.strokeStyle = "rgba(0,255,231,.1)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); ctx.setLineDash([]);
      });

      // intersections + traffic lights
      hR.forEach(yf => { vR.forEach(xf => {
        const ix = xf * W, iy = yf * H;
        const ig = ctx.createRadialGradient(ix, iy, 0, ix, iy, 32);
        ig.addColorStop(0, "rgba(0,255,231,.18)"); ig.addColorStop(1, "transparent");
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, 32, 0, Math.PI * 2); ctx.fill();
        const blink = Math.sin(frame * .038 + ix * .01 + iy * .007) > .4;
        const bc = blink ? "rgba(0,255,136,1)" : "rgba(255,77,106,1)";
        ctx.fillStyle = bc; ctx.shadowColor = bc; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(ix + 14, iy - 14, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }); });

      // cars
      cars.forEach(car => {
        const px = car.dir === "h" ? car.x : car.x * W;
        const py = car.dir === "h" ? car.y * H : car.y;
        car.x += car.vx; car.y += car.vy;
        if (car.dir === "h") { if (car.x > W + 50) car.x = -50; if (car.x < -50) car.x = W + 50; }
        else { if (car.y > H + 50) car.y = -50; if (car.y < -50) car.y = H + 50; }
        ctx.save(); ctx.translate(px, py);
        if (car.hl) {
          const hrg = ctx.createRadialGradient(car.w * .6 * (car.vx > 0 ? 1 : -1), 0, 0, car.w * 3 * (car.vx > 0 ? 1 : -1), 0, 70);
          hrg.addColorStop(0, "rgba(255,255,180,.14)"); hrg.addColorStop(1, "transparent");
          ctx.fillStyle = hrg; ctx.fillRect(-50, -40, 140, 80);
        }
        const cw = car.dir === "h" ? car.w : car.h;
        const ch = car.dir === "h" ? car.h : car.w;
        ctx.fillStyle = car.col; ctx.shadowColor = car.col; ctx.shadowBlur = 10;
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.shadowBlur = 0;
        ctx.fillRect(-cw * .22, -ch * .28, cw * .44, ch * .56);
        ctx.restore();
      });

      // particles
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.ph += .018;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const dx = mx - p.x, dy = my - p.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 220) { p.x += dx * .0012; p.y += dy * .0012; }
        ctx.fillStyle = `rgba(0,255,231,${p.a * (.6 + .4 * Math.sin(p.ph))})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });

      // network
      nodes.forEach((n, i) => {
        n.x += n.vx; n.y += n.vy; n.ph += .013;
        if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1;
        const dx = mx - n.x, dy = my - n.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 280) { n.x += dx * .0018; n.y += dy * .0018; }
        nodes.forEach((n2, j) => {
          if (j <= i) return;
          const dd = Math.sqrt((n.x - n2.x) ** 2 + (n.y - n2.y) ** 2);
          if (dd < 190) {
            ctx.strokeStyle = `rgba(0,255,231,${.075 * (1 - dd / 190)})`;
            ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
          }
        });
        ctx.fillStyle = `rgba(0,255,231,${.25 + .2 * Math.sin(n.ph)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      });

      // QR ghost near cursor
      ctx.save(); ctx.globalAlpha = .04; ctx.strokeStyle = "#00ffe7"; ctx.lineWidth = .7;
      const qx = mx - 36, qy = my - 36;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        if ((i < 2 && j < 2) || (i < 2 && j > 3) || (i > 3 && j < 2)) ctx.strokeRect(qx + i * 13, qy + j * 13, 11, 11);
        else if (Math.sin(i * 3.1 + j * 7.3 + frame * .012) > .2) { ctx.fillStyle = "rgba(0,255,231,.4)"; ctx.fillRect(qx + i * 13 + 1, qy + j * 13 + 1, 9, 9); }
      }
      ctx.restore();

      requestAnimationFrame(drawCity);
    }
    drawCity();
  }

  /* ── RAIN CANVAS ── */
  const cvR = document.getElementById("cv-rain");
  if (cvR) {
    const ctx = cvR.getContext("2d");
    let W, H;
    const rs = () => { W = cvR.width = innerWidth; H = cvR.height = innerHeight; };
    rs(); window.addEventListener("resize", rs);
    const drops = Array.from({ length: 130 }, () => ({
      x: Math.random() * 1920, y: Math.random() * -1000,
      len: Math.random() * 28 + 8, spd: Math.random() * 5 + 2,
      a: Math.random() * .1 + .025, w: Math.random() * .7 + .15
    }));
    (function drawRain() {
      ctx.clearRect(0, 0, W, H);
      drops.forEach(d => {
        d.y += d.spd; if (d.y > H + d.len) { d.y = -d.len - 50; d.x = Math.random() * W; }
        ctx.strokeStyle = `rgba(0,255,231,${d.a})`; ctx.lineWidth = d.w;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * .12, d.y + d.len); ctx.stroke();
      });
      requestAnimationFrame(drawRain);
    })();
  }

  /* ── RADAR CANVAS ── */
  const cvRd = document.getElementById("cv-radar");
  if (cvRd) {
    const ctx = cvRd.getContext("2d");
    let W, H;
    const rs = () => { W = cvRd.width = innerWidth; H = cvRd.height = innerHeight; };
    rs(); window.addEventListener("resize", rs);
    let angle = 0;
    const R = 90;
    const blips = Array.from({ length: 10 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 72 + 18, fade: 0 }));
    (function drawRadar() {
      ctx.clearRect(0, 0, W, H);
      const ox = W - 120, oy = H - 120;
      [.3, .6, 1].forEach(f => {
        ctx.strokeStyle = `rgba(0,255,231,${.07 + .02 * f})`; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.arc(ox, oy, R * f, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = "rgba(0,255,231,.07)"; ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(ox - R, oy); ctx.lineTo(ox + R, oy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy - R); ctx.lineTo(ox, oy + R); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, R, angle - Math.PI / 2.5, angle); ctx.closePath();
      const sg = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
      sg.addColorStop(0, "rgba(0,255,231,.02)"); sg.addColorStop(.6, "rgba(0,255,231,.1)"); sg.addColorStop(1, "rgba(0,255,231,.22)");
      ctx.fillStyle = sg; ctx.fill(); ctx.restore();
      ctx.strokeStyle = "rgba(0,255,231,.75)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(angle) * R, oy + Math.sin(angle) * R); ctx.stroke();
      blips.forEach(b => {
        const bx = ox + Math.cos(b.a) * b.r, by = oy + Math.sin(b.a) * b.r;
        if (Math.abs(bx - ox) > R || Math.abs(by - oy) > R) return;
        const diff = ((b.a - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (diff < .25) b.fade = 1;
        b.fade = Math.max(0, b.fade - .004);
        ctx.fillStyle = `rgba(0,255,231,${b.fade * .9})`; ctx.shadowColor = "rgba(0,255,231,1)"; ctx.shadowBlur = 8 * b.fade;
        ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.strokeStyle = "rgba(0,255,231,.2)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(0,255,231,.35)"; ctx.font = "700 7px Orbitron,monospace"; ctx.textAlign = "center";
      ctx.fillText("PARK RADAR", ox, oy + R + 12);
      angle += .013; requestAnimationFrame(drawRadar);
    })();
  }
})();
