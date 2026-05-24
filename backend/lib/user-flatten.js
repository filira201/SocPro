/**
 * Прослойка между реляционными UserResume / UserContact и плоским контрактом API.
 * Фронтенд ожидает `user.resumeUrl`, `user.resumeOriginalName`, … и `user.contacts: string[]`.
 */

function flattenUserResume(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  if ("resume" in user) {
    const r = user.resume;
    user.resumeUrl = r?.url ?? null;
    user.resumeOriginalName = r?.originalName ?? null;
    user.resumeMimeType = r?.mimeType ?? null;
    user.resumeSize = r?.size ?? null;
    delete user.resume;
  }

  return user;
}

function flattenUserContacts(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  if (Array.isArray(user.contactList)) {
    user.contacts = user.contactList
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => c.value);
    delete user.contactList;
  }

  return user;
}

function flattenUserProfile(user) {
  flattenUserResume(user);
  flattenUserContacts(user);
  return user;
}

module.exports = {
  flattenUserResume,
  flattenUserContacts,
  flattenUserProfile,
};
