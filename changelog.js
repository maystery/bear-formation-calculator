(function () {
  'use strict';

  const { releases, versionAnchor } = window.BearReleases;
  const entries = document.createDocumentFragment();
  for (const [index, release] of releases.entries()) {
    const entry = document.createElement('article');
    entry.className = 'release-entry';
    entry.id = versionAnchor(release.version);

    const heading = document.createElement('h2');
    heading.id = `${entry.id}-heading`;
    heading.textContent = `v${release.version}`;
    entry.setAttribute('aria-labelledby', heading.id);
    if (index === 0) {
      const current = document.createElement('span');
      current.className = 'release-entry__current';
      current.textContent = 'Current';
      heading.append(' ', current);
    }
    entry.appendChild(heading);

    const title = document.createElement('p');
    title.className = 'release-entry__title';
    title.textContent = release.title;
    entry.appendChild(title);

    if (release.date) {
      const meta = document.createElement('p');
      meta.className = 'release-entry__meta';
      const date = document.createElement('time');
      date.dateTime = release.date;
      date.textContent = new Intl.DateTimeFormat('en', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(`${release.date}T00:00:00Z`));
      meta.appendChild(date);
      entry.appendChild(meta);
    }

    if (release.description) {
      const description = document.createElement('p');
      description.textContent = release.description;
      entry.appendChild(description);
    }

    const changes = document.createElement('ul');
    for (const change of release.changes) {
      const item = document.createElement('li');
      item.textContent = change;
      changes.appendChild(item);
    }
    entry.appendChild(changes);
    entries.appendChild(entry);
  }
  document.getElementById('releaseEntries').replaceChildren(entries);

  // Entries are rendered after parsing, so honor an incoming fragment explicitly.
  const target = document.getElementById(location.hash.slice(1));
  if (target?.classList.contains('release-entry')) target.scrollIntoView();
})();
