// Implements stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const u = new URL(event.request.url);
  if (u.hostname == location.hostname && ["/", "/manifest.json", "/nosleep.min.js"].includes(u.pathname)) {
    const cached = caches.match(event.request);
    const fetched = fetch(event.request);
    const fetchedCopy = fetched.then((resp) => resp.clone());

    // Call respondWith() with whatever we get first.
    // If the fetch fails (e.g disconnected), wait for the cache.
    // If there’s nothing in cache, wait for the fetch.
    // If neither yields a response, return a 404.
    event.respondWith(
      Promise.race([fetched.catch((_) => cached), cached])
        .then((resp) => resp || fetched)
        .catch((_) => new Response(null, { status: 404 }))
    );

    // Update the cache with the version we fetched
    event.waitUntil(
      Promise.all([fetchedCopy, caches.open("cache-v1")])
        .then(([response, cache]) => cache.put(event.request, response))
        .catch((_) => {
          /* eat any errors */
        })
    );
  } else if (u.hostname == "cdn.glitch.global") {
    return event.respondWith(
      caches.match(event.request).then(e=>{
        console.log(e)
        if(!e) throw null;
        return e
      }).catch(async () => {
        const fetched = await fetch(event.request);
        const fetchedCopy = fetched.clone();
        event.waitUntil(
          Promise.all([fetchedCopy, caches.open("cache-v1")])
            .then(([response, cache]) => cache.put(event.request, response))
            .catch((_) => {
              /* eat any errors */
            })
        );
        return fetched
      })
    );
  } else return event.respondWith(fetch(event.request))
});
