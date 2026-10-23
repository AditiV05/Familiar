// One-off repair for follower and following lists.
//
// Earlier versions could leave behind:
//   - ids of accounts that were since deleted
//   - the same id twice (a double tap on Follow)
//   - half a follow: A lists B under "following" but B does not list A
//     under "followers", or the other way round (the two sides were saved
//     separately, so one could succeed without the other)
//
// Usage, from the backend folder, with MONGO_URI in backend/.env:
//   node scripts/cleanFollows.js           report only, changes nothing
//   node scripts/cleanFollows.js --apply   write the fixes
//
// Safe to run more than once. A second run should report nothing to fix.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

// Works out the corrected lists. Pure, so it can be checked without a database.
// Takes [{ _id, name, followers, following }], returns the users whose lists
// change, with what changed.
const planCleanup = (users) => {
  const ids = new Set(users.map((u) => String(u._id)));

  const clean = new Map();
  const stats = new Map();
  for (const u of users) {
    const self = String(u._id);
    const s = { deleted: 0, duplicates: 0, self: 0, paired: 0 };
    const tidy = (list = []) => {
      const out = [];
      for (const raw of list) {
        const id = String(raw);
        if (id === self) s.self++;
        else if (!ids.has(id)) s.deleted++;
        else if (out.includes(id)) s.duplicates++;
        else out.push(id);
      }
      return out;
    };
    clean.set(self, {
      followers: tidy(u.followers),
      following: tidy(u.following),
    });
    stats.set(self, s);
  }

  // Either side recording the follow counts as a follow. Fill in the other.
  for (const [a, lists] of clean) {
    for (const b of lists.following) {
      if (!clean.get(b).followers.includes(a)) {
        clean.get(b).followers.push(a);
        stats.get(b).paired++;
      }
    }
    for (const b of lists.followers) {
      if (!clean.get(b).following.includes(a)) {
        clean.get(b).following.push(a);
        stats.get(b).paired++;
      }
    }
  }

  const same = (x = [], y) =>
    x.length === y.length && x.every((v, i) => String(v) === y[i]);

  return users
    .map((u) => {
      const id = String(u._id);
      const next = clean.get(id);
      if (same(u.followers, next.followers) && same(u.following, next.following))
        return null;
      return {
        _id: id,
        name: u.name,
        before: {
          followers: (u.followers || []).length,
          following: (u.following || []).length,
        },
        after: next,
        fixed: stats.get(id),
      };
    })
    .filter(Boolean);
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Add it to backend/.env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, "name followers following").lean();
  const changes = planCleanup(users);

  console.log(`Checked ${users.length} users.`);
  if (!changes.length) {
    console.log("Nothing to fix.");
    await mongoose.disconnect();
    return;
  }

  for (const c of changes) {
    const f = c.fixed;
    const parts = [
      f.deleted && `${f.deleted} deleted account(s)`,
      f.duplicates && `${f.duplicates} duplicate(s)`,
      f.self && `${f.self} self-follow(s)`,
      f.paired && `${f.paired} half-recorded follow(s)`,
    ].filter(Boolean);
    console.log(
      `- ${c.name}: followers ${c.before.followers} -> ${c.after.followers.length},` +
        ` following ${c.before.following} -> ${c.after.following.length}` +
        ` (${parts.join(", ")})`,
    );
  }

  if (!apply) {
    console.log(
      `\n${changes.length} user(s) would change. Nothing was written.` +
        "\nRun again with --apply to save these fixes.",
    );
  } else {
    await User.bulkWrite(
      changes.map((c) => ({
        updateOne: {
          filter: { _id: c._id },
          update: {
            $set: {
              followers: c.after.followers,
              following: c.after.following,
            },
          },
        },
      })),
    );
    console.log(`\nSaved fixes for ${changes.length} user(s).`);
  }

  await mongoose.disconnect();
};

if (require.main === module) {
  main().catch(async (err) => {
    console.error("Cleanup failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { planCleanup };
