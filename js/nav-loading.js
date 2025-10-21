(function(){
  function showLoader(){
    var el = document.getElementById('page-loader');
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden','false');
  }
  function hideLoader(){
    var el = document.getElementById('page-loader');
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden','true');
  }

  // Hide loader shortly after DOM is ready
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(hideLoader, 150);
  });

  // Intercept standard internal navigations to show loader
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    try {
      var u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin) return;
    } catch (_) { return; }

    e.preventDefault();
    showLoader();
    setTimeout(function(){ window.location.href = a.href; }, 60);
  }, { capture: true });

  // Fallback: on unload (back/forward/etc.)
  window.addEventListener('beforeunload', function(){
    showLoader();
  });
})();
