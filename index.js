const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises; // Використовуємо проміси для fs
const path = require('path');
const superagent = require('superagent'); // Підключаємо superagent

// Налаштування параметрів командного рядка
program
  .option('-h, --host <host>', 'Host address')
  .option('-p, --port <port>', 'Server port')
  .option('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);

const options = program.opts();

// Перевірка обов'язкових параметрів
if (!options.host || !options.port || !options.cache) {
  console.log('Error: All required options must be specified.');
  process.exit(1);
}

// Створення простого веб-сервера
const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1); // Отримуємо код HTTP з URL
  const filePath = path.join(options.cache, `${code}.jpg`); // Формуємо шлях до файлу

  try {
    switch (req.method) {
      case 'GET':
        // Отримати картинку з кешу
        try {
          const data = await fs.readFile(filePath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'image/jpg');
          res.end(data);
        } catch (err) {
          if (err.code === 'ENOENT') {
            // Картинки немає в кеші, запит до http.cat
            console.log(`Image not found in cache, fetching from http.cat for status code: ${code}`);
            const catUrl = `https://http.cat/${code}`;
            const response = await superagent.get(catUrl);
            await fs.writeFile(filePath, response.body); // Зберігаємо картинку у кеш
            res.statusCode = 200;
            res.setHeader('Content-Type', 'image/jpg');
            res.end(response.body);
          } else {
            throw err; // Якщо інша помилка, переходимо до обробки
          }
        }
        break;

      case 'PUT':
        // Записати картинку у кеш
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          res.statusCode = 201; // Created
          res.end('Image created/updated.');
        });
        break;

      case 'DELETE':
        // Видалити картинку з кешу
        await fs.unlink(filePath);
        res.statusCode = 200; // OK
        res.end('Image deleted.');
        break;

      default:
        res.statusCode = 405; // Method Not Allowed
        res.end('Method not allowed.');
        break;
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.statusCode = 404; // Not Found
      res.end('Image not found.');
    } else {
      res.statusCode = 500; // Internal Server Error
      res.end('Internal Server Error.');
    }
  }
});

// Запуск сервера
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
