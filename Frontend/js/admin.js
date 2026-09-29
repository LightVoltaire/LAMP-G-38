(function (global) {
  const endpoint = '/api/admin.php';
  let csrfToken = '';

  async function request(method, query, payload, fetcher = fetch) {
    const url = endpoint + (query ? '?' + new URLSearchParams(query) : '');
    const response = await fetcher(url, {
      method,
      credentials: 'same-origin',
      headers: payload ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken } : {},
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  const AdminApi = {
    me: async (fetcher) => {
      const result = await request('GET', { action: 'me' }, null, fetcher);
      csrfToken = result.csrfToken;
      return result;
    },
    listUsers: (q = '', offset = 0, fetcher) => request('GET', { action: 'users', q, offset }, null, fetcher),
    listContacts: (q = '', userId = '', offset = 0, fetcher) => request('GET', { action: 'contacts', q, userId, offset }, null, fetcher),
    createAdmin: (fields, fetcher) => request('POST', null, { action: 'createAdmin', ...fields }, fetcher),
    resetPassword: (id, password, fetcher) => request('PUT', null, { action: 'password', id, password }, fetcher),
    deactivate: (id, fetcher) => request('PUT', null, { action: 'deactivate', id }, fetcher)
  };
  global.AdminApi = AdminApi;
  if (typeof module !== 'undefined') module.exports = AdminApi;
})(typeof window !== 'undefined' ? window : globalThis);
