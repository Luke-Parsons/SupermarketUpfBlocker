console.log('[UPF blocker] content script loaded on', location.href);

const seen = new Set();

// color map by Nova group
const novaColors = {
  1: 'green',
  2: 'green',
  3: 'orange',
  4: 'red'
};

function createOverlay(element, novaGroup) {
  if (!element) return;

  // Go 3 parents up
  let parent = element;
  for (let i = 0; i < 3; i++) {
    if (parent.parentElement) parent = parent.parentElement;
  }

  // Avoid duplicate overlays
  if (parent.querySelector('.upf-nova-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'upf-nova-overlay';

  // Color map
  const novaColors = {
    1: 'rgba(0, 128, 0, 0.3)',    // green transparent
    2: 'rgba(0, 128, 0, 0.3)',
    3: 'rgba(255, 165, 0, 0.3)',  // orange transparent
    4: 'rgba(255, 0, 0, 0.3)'     // red transparent
  };

  // Default to grey if undefined / unknown
  const bgColor = novaColors[novaGroup] || 'rgba(128,128,128,0.3)';

  overlay.textContent = novaGroup ? `Nova Group: ${novaGroup}` : 'Nova Group: undefined';

  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: bgColor,
    color: 'black',          // text black
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    zIndex: 9999,
    pointerEvents: 'none',   // allows clicks to pass through
    borderRadius: '4px'
  });

  // Make sure parent is positioned
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  parent.appendChild(overlay);
}


function fetchOFF(productName, element) {
  chrome.runtime.sendMessage(
    { type: 'fetchOFF', productName },
    response => {
      if (response?.success && response.data?.hits?.length) {
        const hit = response.data.hits[0];
        console.log(`[UPF blocker] OpenFoodFacts result for: ${productName} → "${hit.product_name}", nova_group=${hit.nova_group}`, response.data);

        // overlay nova classification with color
        createOverlay(element, hit.nova_group);
      } else {
        console.error('[UPF blocker] OpenFoodFacts fetch error / no hits:', response?.error, response?.data);
      }
    }
  );
}

function logProduct(source, id, name, element) {
  if (!id || !name || seen.has(source + id)) return;
  seen.add(source + id);

  console.log({
    source,
    productNumber: id,
    productName: name,
    url: location.href
  });

  fetchOFF(name, element);
}

/* ===== TESCO ===== */
function processTesco(li) {
  const id = li.getAttribute('data-testid');
  const a = li.querySelector('h2 a');
  if (!a) return;
  logProduct('tesco', id, a.textContent.trim(), li);
}

/* ===== ASDA ===== */
function processAsda(anchor) {
  const testId = anchor.getAttribute('data-testid');
  if (!testId) return;
  const match = testId.match(/(\d+)$/);
  if (!match) return;
  logProduct('asda', match[1], anchor.textContent.trim(), anchor.closest('h3'));
}

function scan(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  if (node.matches?.('li[data-testid]')) processTesco(node);
  if (node.matches?.('a[data-testid^="product-name-btn-"]')) processAsda(node);

  node.querySelectorAll?.('li[data-testid]').forEach(processTesco);
  node
    .querySelectorAll?.('a[data-testid^="product-name-btn-"]')
    .forEach(processAsda);
}

/* initial scan */
scan(document);

/* observe SPA / infinite scroll */
new MutationObserver(mutations =>
  mutations.forEach(m => m.addedNodes.forEach(scan))
).observe(document.body, { childList: true, subtree: true });
