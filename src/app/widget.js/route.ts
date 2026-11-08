import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const jsContent = `
(function() {
  'use strict';

  // Prevent duplicate injection
  if (window.__NESALE_WIDGET_LOADED__) return;
  window.__NESALE_WIDGET_LOADED__ = true;

  // Find script element to extract configuration attributes
  const currentScript = document.currentScript || document.querySelector('script[data-business-id]');
  const businessId = currentScript ? currentScript.getAttribute('data-business-id') : 'default';
  const position = currentScript ? currentScript.getAttribute('data-position') || 'bottom-right' : 'bottom-right';

  const hostUrl = '${baseUrl}';

  // Create widget container element
  const container = document.createElement('div');
  container.id = 'nesale-shopper-widget-root';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  if (position === 'bottom-left') {
    container.style.left = '24px';
  } else {
    container.style.right = '24px';
  }
  container.style.zIndex = '2147483647';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = position === 'bottom-left' ? 'flex-start' : 'flex-end';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Create launcher button
  const launcher = document.createElement('button');
  launcher.id = 'nesale-widget-launcher';
  launcher.style.display = 'flex';
  launcher.style.alignItems = 'center';
  launcher.style.gap = '8px';
  launcher.style.padding = '12px 18px';
  launcher.style.borderRadius = '9999px';
  launcher.style.backgroundColor = '#4F46E5';
  launcher.style.color = '#ffffff';
  launcher.style.border = 'none';
  launcher.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)';
  launcher.style.cursor = 'pointer';
  launcher.style.fontWeight = '600';
  launcher.style.fontSize = '14px';
  launcher.style.transition = 'all 0.2s ease';
  launcher.innerHTML = '✨ <span>Ask NESale</span>';

  launcher.onmouseover = function() {
    launcher.style.transform = 'scale(1.04)';
  };
  launcher.onmouseout = function() {
    launcher.style.transform = 'scale(1)';
  };

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'nesale-widget-modal';
  modal.style.display = 'none';
  modal.style.width = '380px';
  modal.style.maxWidth = 'calc(100vw - 32px)';
  modal.style.height = '580px';
  modal.style.maxHeight = 'calc(100vh - 100px)';
  modal.style.marginBottom = '12px';
  modal.style.borderRadius = '24px';
  modal.style.overflow = 'hidden';
  modal.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
  modal.style.border = '1px solid rgba(0,0,0,0.08)';
  modal.style.backgroundColor = '#ffffff';

  // Iframe loading the standalone shopper widget view
  const iframe = document.createElement('iframe');
  iframe.src = hostUrl + '/embed/widget?businessId=' + encodeURIComponent(businessId);
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  modal.appendChild(iframe);

  let isOpen = false;
  launcher.onclick = function() {
    isOpen = !isOpen;
    if (isOpen) {
      modal.style.display = 'block';
      launcher.innerHTML = '✕ <span>Close</span>';
      launcher.style.backgroundColor = '#1E293B';
    } else {
      modal.style.display = 'none';
      launcher.innerHTML = '✨ <span>Ask NESale</span>';
      launcher.style.backgroundColor = '#4F46E5';
    }
  };

  // Close widget listener from inside iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'nesale_close_widget') {
      isOpen = false;
      modal.style.display = 'none';
      launcher.innerHTML = '✨ <span>Ask NESale</span>';
      launcher.style.backgroundColor = '#4F46E5';
    }
  });

  container.appendChild(modal);
  container.appendChild(launcher);
  document.body.appendChild(container);

  // Autonomous Website & Catalog Discovery Beacon
  function sendConnectionBeacon() {
    try {
      const pingStorageKey = '__nesale_ping_' + businessId;
      const lastPing = window.sessionStorage.getItem(pingStorageKey);
      if (lastPing && (Date.now() - Number(lastPing) < 1000 * 60 * 10)) {
        return; // Debounce: avoid duplicate beacons within 10 minutes
      }

      // Collect website metadata
      const domain = window.location.hostname;
      const storeUrl = window.location.origin;
      const pageTitle = document.title;
      const isShopify = !!(window.Shopify || window.ShopifyAnalytics);

      function dispatchPayload(harvestedProducts) {
        const payload = {
          businessId: businessId,
          domain: domain,
          storeUrl: storeUrl,
          pageTitle: pageTitle,
          platform: isShopify ? 'shopify' : 'ecommerce',
          products: harvestedProducts || [],
          metadata: {
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        };

        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(hostUrl + '/api/v1/widget/connect', blob);
        } else {
          fetch(hostUrl + '/api/v1/widget/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(function() {});
        }
        window.sessionStorage.setItem(pingStorageKey, String(Date.now()));
      }

      // If Shopify detected, grab /products.json
      if (isShopify) {
        fetch('/products.json?limit=50')
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(data) {
            dispatchPayload(data && data.products ? data.products : []);
          })
          .catch(function() {
            dispatchPayload([]);
          });
      } else {
        // Fallback: Check JSON-LD structured schemas on page
        const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
        const extracted = [];
        jsonLdElements.forEach(function(el) {
          try {
            const parsed = JSON.parse(el.textContent);
            if (parsed && (parsed['@type'] === 'Product' || (Array.isArray(parsed) && parsed[0] && parsed[0]['@type'] === 'Product'))) {
              const p = Array.isArray(parsed) ? parsed[0] : parsed;
              extracted.push({
                title: p.name,
                description: p.description,
                price: p.offers && p.offers.price ? p.offers.price : (p.offers && p.offers[0] ? p.offers[0].price : undefined),
                image: Array.isArray(p.image) ? p.image[0] : p.image
              });
            }
          } catch(e) {}
        });
        dispatchPayload(extracted);
      }
    } catch(err) {
      // Fail safely to never interfere with host site
    }
  }

  // Trigger non-blocking beacon
  if (document.readyState === 'complete') {
    setTimeout(sendConnectionBeacon, 600);
  } else {
    window.addEventListener('load', function() {
      setTimeout(sendConnectionBeacon, 600);
    });
  }
})();
  `;

  return new NextResponse(jsContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
