(function () {
  'use strict';

  const { releases } = window.BearReleases;
  const versionLink = document.getElementById('appVersion');
  versionLink.textContent = `v${releases[0].version}`;
  const changelogPath = location.protocol === 'file:' ? 'changelog/index.html' : 'changelog/';
  versionLink.href = `${changelogPath}#${window.BearReleases.versionAnchor(releases[0].version)}`;

  async function loadCommit() {
    // GitHub Pages renders this metadata from the deployed source revision.
    // Opening the source directly remains supported without a network request.
    if (location.protocol === 'file:') return;
    const label = document.getElementById('appCommit');
    label.textContent = 'Commit unavailable';
    try {
      const response = await fetch('revision.txt', { cache: 'no-store' });
      if (!response.ok) return;
      const commit = (await response.text()).trim();
      if (/^[a-f0-9]{40}$/i.test(commit)) {
        label.textContent = `Commit ${commit.slice(0, 7)}`;
        label.title = commit;
      } else if (commit.includes('{{ site.github.build_revision }}')) {
        label.textContent = 'Local preview';
      }
    } catch {
      // Missing deployment metadata must not prevent the release notes rendering.
    }
  }
  void loadCommit();
})();
