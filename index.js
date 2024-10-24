const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises; 
const path = require('path');
const superagent = require('superagent'); 

program
  .option('-h, --host <host>', 'Host address')
  .option('-p, --port <port>', 'Server port')
  .option('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);

const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.log('Error: All required options must be specified.');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1); 
  const filePath = path.join(options.cache, `${code}.jpg`);

  try {
    switch (req.method) {
      case 'GET':
        try {
          const data = await fs.readFile(filePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'image/jpg');
          res.end(data);
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.log(`Image not found in cache, fetching from http.cat for status code: ${code}`);
            const catUrl = `https://http.cat/${code}`;
            const response = await superagent.get(catUrl);
            await fs.writeFile(filePath, response.body);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'image/jpg');
            res.end(response.body);
          } else {
            throw err;
          }
        }
        break;

      case 'PUT':
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          res.statusCode = 201;
          res.end('Image created/updated.');
        });
        break;

      case 'DELETE':
        await fs.unlink(filePath);
        res.statusCode = 200;
        res.end('Image deleted.');
        break;

      default:
        res.statusCode = 405;
        res.end('Method not allowed.');
        break;
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('Image not found.');
    } else {
      res.statusCode = 500;
      res.end('Internal Server Error.');
    }
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
