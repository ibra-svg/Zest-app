'use strict';

var CACHE_NAME = 'zest-offline-v1';
var APP_SHELL = [new URL('./index.html', self.registration.scope).href];
var INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(name) {
        return name.indexOf('zest-offline-') === 0 && name !== CACHE_NAME;
      }).map(function(name) {
        return caches.delete(name);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function(response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            return cache.put(INDEX_URL, copy);
          }).catch(function(error) {
            console.error('Impossible de mettre à jour le cache hors ligne :', error);
          });
        }
        return response;
      }).catch(function(error) {
        return caches.match(INDEX_URL).then(function(cached) {
          if (cached) return cached;
          throw error;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            return cache.put(request, copy);
          }).catch(function(error) {
            console.error('Impossible de mettre en cache une ressource :', error);
          });
        }
        return response;
      });
    })
  );
});
