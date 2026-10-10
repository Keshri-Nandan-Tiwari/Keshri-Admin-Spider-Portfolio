// ONE place that says where this site's content lives on GitHub.
// The live site reads content.json straight from here (so changes show within seconds),
// and the admin panel publishes to the same place. Change these only if you move the repo.
export const SITE = {
  owner: "Keshri-Nandan-Tiwari",
  repo: "Keshri-Admin-Spider-Portfolio",
  branch: "main",
  contentPath: "public/content.json",
};
export const rawUrl = (path) => `https://raw.githubusercontent.com/${SITE.owner}/${SITE.repo}/${SITE.branch}/${path}`;
