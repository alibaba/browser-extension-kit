const path = require('path');
const fs = require('fs-extra');

['background', 'popup', 'devtools', 'page-script', 'content-script'].forEach(p => {
  fs.ensureDirSync(path.resolve(__dirname, p));
  fs.writeJSONSync(
    path.resolve(__dirname, p, 'package.json'),
    {
      name: `browser-extension-kit/${p}`,
      types: `../dist/${p}/index.d.ts`,
      main: `../dist/${p}/index.js`,
    },
    { spaces: 2 }
  );
});
