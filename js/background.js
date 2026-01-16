chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'fetchOFF' && msg.productName) {
    // Encode product name safely for URL
    const query = encodeURIComponent(msg.productName.trim());
    const url = `https://search.openfoodfacts.org/search?q=${query}&page_size=10&page=1`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });

    // Keep the message channel open for async response
    return true;
  }
});
