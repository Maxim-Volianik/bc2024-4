const { program } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Налаштування параметрів командного рядка
program
  .requiredOption('-h, --host <host>', 'Host address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);

const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.error('Error: All required options must be specified.');
  program.help(); // Виведе допомогу та завершить програму
  process.exit(1);
}

// Створення простого веб-сервера
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, world!');
});

// Запуск сервера
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
