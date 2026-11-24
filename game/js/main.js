const canvas = document.getElementById('gameCanvas');
Game.ctx = canvas.getContext('2d', {alpha:false});
function resizeFlightCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(2,window.devicePixelRatio || 1);
    const w = Math.max(1,Math.round(rect.width * scale));
    const h = Math.max(1,Math.round(rect.height * scale));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    Game.ctx.setTransform(w / LOGICAL_W,0,0,h / LOGICAL_H,0,0);
    Game.ctx.imageSmoothingEnabled = true;
    Game.ctx.imageSmoothingQuality = 'high';
    if (G.game.isStarted) renderFlight(Game.ctx);
}
new ResizeObserver(resizeFlightCanvas).observe(canvas);
window.addEventListener('resize', resizeFlightCanvas);

Save.load();
initDispatch();
initInput(canvas);
syncUI();
loadFlightArt().then(() => { if (G.game.isStarted) renderFlight(Game.ctx); });
requestAnimationFrame(gameLoop);
