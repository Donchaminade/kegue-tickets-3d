// Virtual clock for frame-by-frame recordings (?demo=1&capture=1). Not loaded otherwise.
(function () {
  var vt = 0, base = Date.now(), id = 1, timers = [], rafs = [];
  var RDate = Date;
  performance.now = function () { return vt; };
  Date.now = function () { return base + vt; };
  window.setTimeout = function (fn, ms) { var a = [].slice.call(arguments, 2); var t = { id: id++, at: vt + Math.max(0, +ms || 0), fn: fn, a: a }; timers.push(t); return t.id; };
  window.setInterval = function (fn, ms) { var a = [].slice.call(arguments, 2); var t = { id: id++, at: vt + Math.max(1, +ms || 1), fn: fn, a: a, every: Math.max(1, +ms || 1) }; timers.push(t); return t.id; };
  window.clearTimeout = window.clearInterval = function (i) { timers = timers.filter(function (t) { return t.id !== i; }); };
  window.requestAnimationFrame = function (fn) { var r = { id: id++, fn: fn }; rafs.push(r); return r.id; };
  window.cancelAnimationFrame = function (i) { rafs = rafs.filter(function (r) { return r.id !== i; }); };
  function runTimers(until) {
    for (;;) {
      var next = null;
      for (var i = 0; i < timers.length; i++) if (timers[i].at <= until && (!next || timers[i].at < next.at)) next = timers[i];
      if (!next) break;
      vt = Math.max(vt, next.at);
      if (next.every) next.at += next.every; else timers.splice(timers.indexOf(next), 1);
      try { typeof next.fn === 'function' ? next.fn.apply(null, next.a) : eval(next.fn); } catch (e) { console.error(e); }
    }
    vt = until;
  }
  window.__advance = function (ms) {
    return new Promise(function (resolve) {
      var steps = Math.max(1, Math.round(ms / 34)), dt = ms / steps, k = 0;
      function step() {
        runTimers(vt + dt);
        var list = rafs; rafs = [];
        for (var i = 0; i < list.length; i++) { try { list[i].fn(vt); } catch (e) { console.error(e); } }
        // let promises / React commits flush
        k++;
        if (k < steps) Promise.resolve().then(function () { MessageChannelStep(step); }); else MessageChannelStep(resolve);
      }
      step();
    });
  };
  var mc = new MessageChannel(), q = [];
  mc.port1.onmessage = function () { var f = q.shift(); f && f(); };
  function MessageChannelStep(f) { q.push(f); mc.port2.postMessage(0); }
  window.__captureMode = true;
  void RDate;
})();
