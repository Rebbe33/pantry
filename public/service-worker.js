// Service Worker pour PWA - Permet les notifications et mode offline
const CACHE_NAME = 'garde-manger-v1'
const OFFLINE_URL = '/offline.html'

// Fichiers à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Stratégie de cache : Network First, puis Cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone la réponse car elle ne peut être consommée qu'une fois
        const responseClone = response.clone()
        
        // Mettre en cache les réponses réussies
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        
        return response
      })
      .catch(() => {
        // Si le réseau échoue, essayer le cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          // Si c'est une navigation, renvoyer la page offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL)
          }
          
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
      })
  )
})

// Notifications Push
self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.key || 1
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/close.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Synchronisation en arrière-plan (pour cocher des items hors ligne)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shopping-list') {
    event.waitUntil(syncShoppingList())
  }
})

async function syncShoppingList() {
  // Récupérer les modifications locales depuis IndexedDB
  const db = await openDatabase()
  const changes = await getLocalChanges(db)
  
  // Envoyer au serveur
  for (const change of changes) {
    try {
      await fetch('/api/widget/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      })
      
      // Supprimer de la queue locale
      await removeLocalChange(db, change.id)
    } catch (error) {
      console.error('Sync error:', error)
    }
  }
}

// Helpers pour IndexedDB (stockage local)
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('garde-manger-db', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pending-changes')) {
        db.createObjectStore('pending-changes', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getLocalChanges(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-changes'], 'readonly')
    const store = transaction.objectStore('pending-changes')
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function removeLocalChange(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-changes'], 'readwrite')
    const store = transaction.objectStore('pending-changes')
    const request = store.delete(id)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
