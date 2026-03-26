document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('news-list');

  if (list) {
    const feedUrl = 'https://feeds.feedburner.com/TheHackersNews';
    const sources = [
      {
        name: 'rss2json',
        type: 'json',
        url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      },
      {
        name: 'allorigins-json',
        type: 'xml-json',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
      },
      {
        name: 'allorigins-raw',
        type: 'xml',
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
      },
    ];

    const parseDate = (value) => {
      if (!value) {
        return null;
      }

      const normalizedValue =
        value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
      const date = new Date(normalizedValue);

      return Number.isNaN(date.getTime()) ? null : date;
    };

    const parseXmlItems = (xmlText) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      if (doc.querySelector('parsererror')) {
        throw new Error('Flux XML invalide');
      }

      const items = Array.from(doc.querySelectorAll('item'))
        .slice(0, 5)
        .map((item) => ({
          title: item.querySelector('title')?.textContent?.trim() || 'Article',
          link: item.querySelector('link')?.textContent?.trim() || '#',
          pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
        }));

      if (!items.length) {
        throw new Error('Aucun article trouvé');
      }

      return items;
    };

    const parseJsonItems = (payload) => {
      if (payload.status && payload.status !== 'ok') {
        throw new Error('Flux JSON indisponible');
      }

      const items = Array.isArray(payload.items)
        ? payload.items.slice(0, 5).map((item) => ({
            title: item.title?.trim() || 'Article',
            link: item.link?.trim() || '#',
            pubDate: item.pubDate?.trim() || '',
          }))
        : [];

      if (!items.length) {
        throw new Error('Aucun article trouvé');
      }

      return items;
    };

    const renderItems = (items) => {
      const fragment = document.createDocumentFragment();

      items.forEach((item) => {
        const li = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = item.link;
        anchor.textContent = item.title;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        li.appendChild(anchor);

        const date = parseDate(item.pubDate);
        if (date) {
          const time = document.createElement('time');
          time.dateTime = date.toISOString();
          time.textContent = date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          li.appendChild(time);
        }

        fragment.appendChild(li);
      });

      list.innerHTML = '';
      list.appendChild(fragment);
    };

    const loadNews = async () => {
      for (const source of sources) {
        try {
          const response = await fetch(source.url);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          if (source.type === 'json') {
            const payload = await response.json();
            return parseJsonItems(payload);
          }

          if (source.type === 'xml-json') {
            const payload = await response.json();
            if (!payload.contents) {
              throw new Error('Réponse proxy vide');
            }
            return parseXmlItems(payload.contents);
          }

          const xmlText = await response.text();
          return parseXmlItems(xmlText);
        } catch (error) {
          console.warn(`Échec du chargement RSS via ${source.name}`, error);
        }
      }

      throw new Error('Toutes les sources RSS ont échoué');
    };

    loadNews()
      .then(renderItems)
      .catch(() => {
        list.innerHTML = '<li>Impossible de charger les actualités pour le moment.</li>';
      });
  }

  const toggleButton = document.getElementById('theme-toggle');
  const body = document.body;

  if (toggleButton) {
    const applyTheme = (mode) => {
      const isLight = mode === 'light';
      body.classList.toggle('light-mode', isLight);
      toggleButton.textContent = isLight ? 'Mode sombre' : 'Mode clair';
      toggleButton.setAttribute('aria-pressed', String(isLight));
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    };

    const storedTheme = localStorage.getItem('theme');
    applyTheme(storedTheme || 'dark');

    toggleButton.addEventListener('click', () => {
      const nextTheme = body.classList.contains('light-mode') ? 'dark' : 'light';
      applyTheme(nextTheme);
    });
  }
});
