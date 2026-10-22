function write(level, args) {
  const time = new Date().toISOString();
  const line = args
    .map((item) => {
      if (item instanceof Error) return item.message;
      if (typeof item === 'string') return item;
      return JSON.stringify(item);
    })
    .join(' ');
  const sink = level === 'error' ? console.error : console.log;
  sink(`${time} ${level} ${line}`);
}

export const logger = {
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
};
