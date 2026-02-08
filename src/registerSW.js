export function registerSW() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const isGitHubPages = window.location.hostname.includes('github.io');
            const swPath = isGitHubPages ? '/News-Weather-App/sw.js' : '/sw.js';

            navigator.serviceWorker.register(swPath)
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}
