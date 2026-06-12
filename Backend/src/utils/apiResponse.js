function success(res, { status = 200, message = "Operación realizada correctamente.", data = null, meta = null, extra = {} }) {
  const payload = {
    ok: true,
    message,
    ...extra,
  };

  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;

  return res.status(status).json(payload);
}

function fail(res, { status = 400, message = "No se pudo completar la solicitud.", code = "BAD_REQUEST", errors = null, details = null }) {
  const payload = {
    ok: false,
    code,
    message,
  };

  if (errors) payload.errors = errors;
  if (details) payload.details = details;

  return res.status(status).json(payload);
}

module.exports = {
  success,
  fail,
};
