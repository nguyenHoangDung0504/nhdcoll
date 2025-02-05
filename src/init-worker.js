if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
    console.log('Registering Service Worker...');
    navigator.serviceWorker.register('/worker.js')
        .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
}