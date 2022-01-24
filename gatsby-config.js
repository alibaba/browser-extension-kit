module.exports = {
  pathPrefix: "/browser-extension-kit",
  plugins: [
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: `${__dirname}/docs/pages`,
        name: 'default-page',
      },
    },
    {
      resolve: "smooth-doc",
      options: {
        name: "browser-extension-kit",
        description: "A dev kit for borwser extension",
        siteUrl: "https://alibaba.github.io/browser-extension-kit/",
        githubRepositoryURL: 'https://github.com/alibaba/browser-extension-kit',
      },
    },
    'gatsby-plugin-pnpm'
  ],
};
