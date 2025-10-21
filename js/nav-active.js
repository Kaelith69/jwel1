(function(){
  function normalize(href){
    try {
      const u = new URL(href, window.location.href);
      let p = u.pathname.replace(/\/+/g,'/');
      // Treat "/" and "/index.html" as same
      if (p === '/') p = '/index.html';
      return p;
    } catch (_) { return href; }
  }

  document.addEventListener('DOMContentLoaded', function(){
    var current = normalize(window.location.href);
    document.querySelectorAll('.main-nav a[href]').forEach(function(a){
      var target = normalize(a.getAttribute('href'));
      if (target === current) {
        a.setAttribute('aria-current','page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  });
})();
