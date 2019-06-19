async function test(logger, ms = 3000) {

  logger.info('HOLA!!!');
  logger.info('com anem?');

  logger.verbose('Ens esperem una estoneta...');

  await delay(ms);

  logger.info('Ja ha passat l\'estoneta!');

  return true;
}

async function delay(ms) {
  return new Promise((resolve, _reject) => setTimeout(resolve, ms));
}

module.exports = test;
