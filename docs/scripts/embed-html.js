(() => {
	// Define component:
	class DanqEmbedHtml extends HTMLElement {
		constructor() {
			super();
		}
		
		static get observedAttributes() {
			return ['src'];
		}
		
		connectedCallback() {
			let loadedFromCache = false;
			if (!this.hasAttribute('src')) {
				throw new Error('<embed-html> element requires a src attribute');
			}
			if(this.hasAttribute('cache')) {
				loadedFromCache = this.attemptToLoadFromCache();
			}
			if(loadedFromCache) {
				this.scheduleCacheUpdate();
			} else {
				if(this.hasAttribute('lazy')) {
					const observer = new IntersectionObserver(entries => {
						entries.forEach(entry => {
							if (entry.isIntersecting) {
								this.delayedFetchAndInject();
							}
						});
					});
					observer.observe(this);
				} else {
					this.delayedFetchAndInject();
				}
			}
		}

		attemptToLoadFromCache() {
			const cache = localStorage.getItem('embed-html-cache');
			if(!cache) return false;
			const cacheKey = new URL(this.getAttribute('src'), window.location.href).toString();
			const cachedVersion = JSON.parse(cache)[cacheKey];
			if(!cachedVersion) return false;
			this.inject(cachedVersion);
			return true;
		}

		scheduleCacheUpdate() {
			fetch(this.getAttribute('src'))
			.then(response => response.text())
			.then(html => this.cache(html));
		}

		cache(html) {
			const cache = JSON.parse(localStorage.getItem('embed-html-cache') || '{}');
			const cacheKey = new URL(this.getAttribute('src'), window.location.href).toString();
			cache[cacheKey] = html;
			localStorage.setItem('embed-html-cache', JSON.stringify(cache));
		}

		delayedFetchAndInject() {
			setTimeout(this.fetchAndInject.bind(this), this.getAttribute('delay') || 0);
		}
		
		fetchAndInject() {
			fetch(this.getAttribute('src'))
			.then(response => response.text())
			.then(html => {
				if(this.hasAttribute('cache')) this.cache(html);
				this.inject(html);
			})
			.catch(error => {
				throw new Error('<embed-html> failed to fetch URL: ' + this.getAttribute('src') + ', error: ' + error);
			});
		}

		inject(html) {
			// Load HTML into a DOM:
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			// Inject content into the page:
			this.outerHTML = html;
			// Execute any scripts:
			// (cloneNode() doesn't work on JS because it clones that they've "alreadyStarted", so we rebuild them)
			for (const original of doc.querySelectorAll('script')) {
				const script = document.createElement('script');
				for(const attribute of original.attributes) {
					script.setAttribute(attribute.name, attribute.value);
				}
				script.textContent = original.textContent;
				document.body.appendChild(script);
			}
		}
	}
		
	// Register component:
	customElements.define('embed-html', DanqEmbedHtml);
})();

