function attachLiquidBehavior(button) {
    if (!button || button.dataset.liquidBound === 'true') return;
    button.dataset.liquidBound = 'true';

    let activeDroplets = [];

    button.addEventListener('mousedown', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Squash button like water under pressure
        button.style.transform = 'scale(0.96) translateY(2px)';
        
        // Create water droplet
        const droplet = document.createElement('div');
        droplet.className = 'droplet';
        droplet.style.left = x + 'px';
        droplet.style.top = y + 'px';
        droplet.style.width = '0px';
        droplet.style.height = '0px';
        droplet.style.opacity = '0';
        
        button.appendChild(droplet);

        // Animate droplet formation
        requestAnimationFrame(() => {
            droplet.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            droplet.style.width = '60px';
            droplet.style.height = '60px';
            droplet.style.opacity = '0.9';
        });

        activeDroplets.push(droplet);
    });

    button.addEventListener('mouseup', () => {
        // Release - button bounces back like water
        button.style.transform = 'scale(1.04) translateY(-4px)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1) translateY(-2px)';
        }, 100);

        setTimeout(() => {
            button.style.transform = 'scale(1) translateY(0)';
        }, 250);

        // Droplets fade away smoothly
        activeDroplets.forEach(droplet => {
            droplet.style.transition = 'all 0.8s ease-out';
            droplet.style.opacity = '0';
            droplet.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => droplet.remove(), 800);
        });
        
        activeDroplets = [];
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1) translateY(0)';
        
        activeDroplets.forEach(droplet => {
            droplet.style.opacity = '0';
            droplet.style.transform = 'translate(-50%, -50%) scale(0)';
            setTimeout(() => droplet.remove(), 400);
        });
        activeDroplets = [];
    });
}

// Initial attach for existing elements
document.querySelectorAll('.liquid-button, .liquidize').forEach(attachLiquidBehavior);

// Observe DOM for dynamically added elements
const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
        m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && (node.matches('.liquid-button') || node.matches('.liquidize'))) {
                attachLiquidBehavior(node);
            }
            const inner = node.querySelectorAll ? node.querySelectorAll('.liquid-button, .liquidize') : [];
            inner.forEach(attachLiquidBehavior);
        });
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
