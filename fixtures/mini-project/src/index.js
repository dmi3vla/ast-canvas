// Entry point — imports helpers and config
import { formatName, calculateTotal } from './utils/helpers.js';
import { APP_NAME, APP_VERSION } from './config.js';

export function bootstrap() {
  console.log(`${APP_NAME} v${APP_VERSION} starting...`);

  const name = formatName('world');
  const total = calculateTotal([1, 2, 3, 4, 5]);

  console.log(`Hello, ${name}!`);
  console.log(`Total: ${total}`);

  return { name, total };
}

bootstrap();
