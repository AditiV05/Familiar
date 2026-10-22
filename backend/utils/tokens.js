const crypto = require("crypto");

// Reset and verification links carry a random token. The database keeps only
// its SHA-256 hash, so anyone who can read a user record (a leak, a backup,
// a bad query) still cannot use the link. The emailed link has the raw token.
// Links sent before hashing was added no longer match; both flows let the
// user ask for a fresh one.
const createToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

module.exports = { createToken, hashToken };
