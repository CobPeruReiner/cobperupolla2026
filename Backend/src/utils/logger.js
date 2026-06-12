const isProduction = process.env.NODE_ENV === "production";

function format(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const data = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${data}`;
}

module.exports = {
  info(message, meta) {
    console.log(format("INFO", message, meta));
  },
  warn(message, meta) {
    console.warn(format("WARN", message, meta));
  },
  error(message, meta) {
    console.error(format("ERROR", message, meta));
  },
  debug(message, meta) {
    if (!isProduction || process.env.DEBUG_LOGS === "true") {
      console.log(format("DEBUG", message, meta));
    }
  },
};
