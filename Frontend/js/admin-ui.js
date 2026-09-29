(function () {
  const $ = (id) => document.getElementById(id);
  const state = { usersOffset: 0, contactsOffset: 0, usersTotal: 0, contactsTotal: 0, owner: '', passwordId: 0, userRequest: 0, contactRequest: 0 };
  const limit = 50;
  const debounce = (fn) => { let timer; return () => { clearTimeout(timer); timer = setTimeout(fn, 250); }; };

  function message(text, type = 'success') {
    const box = $('adminAlert');
    box.textContent = text;
    box.className = text ? `alert alert-${type} mb-3` : 'mb-3';
  }
  function error(err) {
    if (err.status === 401) { location.replace('index.html'); return; }
    if (err.status === 403 && /Admin access required/.test(err.message)) { location.replace('contacts.html'); return; }
    message(err.message || 'Something went wrong. Try again.', 'danger');
  }
  function td(text) {
    const cell = document.createElement('td');
    cell.textContent = text == null ? '' : String(text);
    return cell;
  }
  function button(label, className, handler, disabled = false) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = className; el.textContent = label; el.disabled = disabled;
    el.addEventListener('click', handler);
    return el;
  }

  async function users() {
    const requestNumber = ++state.userRequest;
    try {
      const data = await AdminApi.listUsers($('userSearch').value.trim(), state.usersOffset);
      if (requestNumber !== state.userRequest) return;
      state.usersTotal = Number(data.total);
      $('userTotal').textContent = state.usersTotal;
      const body = $('usersBody'); body.replaceChildren();
      for (const user of data.users) {
        const tr = document.createElement('tr');
        const name = `${user.FirstName} ${user.LastName}`;
        const account = td(name);
        const secondary = document.createElement('div'); secondary.className = 'muted-label small'; secondary.textContent = `@${user.Login} · #${user.ID}`;
        account.appendChild(secondary);
        tr.append(account, td(user.Role === 'admin' ? 'Admin' : 'User'));
        const status = td(Number(user.Active) ? 'Active' : 'Suspended');
        status.className = Number(user.Active) ? 'status-active' : 'status-inactive'; tr.append(status);
        const actions = td(''); actions.className = 'text-end';
        const group = document.createElement('div'); group.className = 'd-flex flex-wrap justify-content-end gap-2';
        group.append(
          button('View contacts', 'btn btn-sm btn-outline-light', () => {
            state.owner = String(user.ID); state.contactsOffset = 0;
            $('ownerFilterLabel').textContent = `Showing contacts owned by @${user.Login}`;
            $('clearOwner').classList.remove('d-none'); contacts(); $('contactsTitle').scrollIntoView({ behavior: 'smooth' });
          }),
          button('Password', 'btn btn-sm btn-outline-light', () => {
            state.passwordId = Number(user.ID); $('passwordAccount').textContent = `Account: @${user.Login}`;
            $('passwordForm').reset(); bootstrap.Modal.getOrCreateInstance($('passwordModal')).show();
          }),
          button('Suspend', 'btn btn-sm btn-outline-danger', async () => {
            if (!confirm(`Suspend @${user.Login}? They will lose access immediately.`)) return;
            try { await AdminApi.deactivate(Number(user.ID)); message(`@${user.Login} suspended.`); users(); contacts(); }
            catch (err) { error(err); }
          }, !Number(user.Active))
        );
        actions.appendChild(group); tr.appendChild(actions); body.appendChild(tr);
      }
      if (!data.users.length) { const row = document.createElement('tr'); const cell = td('No matching accounts.'); cell.colSpan = 4; cell.className = 'empty-row'; row.appendChild(cell); body.appendChild(row); }
      $('usersCount').textContent = state.usersTotal ? `Showing ${state.usersOffset + 1}–${state.usersOffset + data.users.length} of ${state.usersTotal}` : '0 accounts';
      $('usersPrev').disabled = state.usersOffset === 0;
      $('usersNext').disabled = state.usersOffset + limit >= state.usersTotal;
    } catch (err) { error(err); }
  }

  async function contacts() {
    const requestNumber = ++state.contactRequest;
    try {
      const data = await AdminApi.listContacts($('contactSearch').value.trim(), state.owner, state.contactsOffset);
      if (requestNumber !== state.contactRequest) return;
      state.contactsTotal = Number(data.total); $('contactTotal').textContent = state.contactsTotal;
      const body = $('adminContactsBody'); body.replaceChildren();
      for (const contact of data.contacts) {
        const tr = document.createElement('tr');
        tr.append(td(`${contact.FirstName} ${contact.LastName}`), td(contact.Email), td(contact.Phone), td(`@${contact.OwnerLogin}`));
        body.appendChild(tr);
      }
      if (!data.contacts.length) { const row = document.createElement('tr'); const cell = td('No matching contacts.'); cell.colSpan = 4; cell.className = 'empty-row'; row.appendChild(cell); body.appendChild(row); }
      $('contactsCount').textContent = state.contactsTotal ? `Showing ${state.contactsOffset + 1}–${state.contactsOffset + data.contacts.length} of ${state.contactsTotal}` : '0 contacts';
      $('contactsPrev').disabled = state.contactsOffset === 0;
      $('contactsNext').disabled = state.contactsOffset + limit >= state.contactsTotal;
    } catch (err) { error(err); }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const data = await AdminApi.me();
      $('adminName').textContent = `${data.user.FirstName} ${data.user.LastName} · Admin`;
      await Promise.all([users(), contacts()]);
    } catch (err) { error(err); return; }
    $('userSearch').addEventListener('input', debounce(() => { state.usersOffset = 0; users(); }));
    $('contactSearch').addEventListener('input', debounce(() => { state.contactsOffset = 0; contacts(); }));
    $('clearOwner').addEventListener('click', () => { state.owner = ''; state.contactsOffset = 0; $('ownerFilterLabel').textContent = 'Across all accounts'; $('clearOwner').classList.add('d-none'); contacts(); });
    for (const kind of ['users', 'contacts']) {
      const key = kind + 'Offset';
      $(kind + 'Prev').addEventListener('click', () => { state[key] = Math.max(0, state[key] - limit); (kind === 'users' ? users : contacts)(); });
      $(kind + 'Next').addEventListener('click', () => { state[key] += limit; (kind === 'users' ? users : contacts)(); });
    }
    $('newAdminForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await AdminApi.createAdmin({ firstName: $('adminFirst').value.trim(), lastName: $('adminLast').value.trim(), login: $('adminLogin').value.trim(), password: $('adminPassword').value });
        bootstrap.Modal.getInstance($('newAdminModal')).hide(); event.target.reset(); message('Admin account created.'); state.usersOffset = 0; users();
      } catch (err) { error(err); }
    });
    $('passwordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await AdminApi.resetPassword(state.passwordId, $('newPassword').value);
        bootstrap.Modal.getInstance($('passwordModal')).hide(); event.target.reset(); message('Password updated. The user can sign in with the new password.');
      } catch (err) { error(err); }
    });
    $('logoutButton').addEventListener('click', async () => {
      try { await fetch('/api/index.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); }
      finally {
        for (const key of ['userId', 'firstName', 'lastName']) document.cookie = `${key}=; Max-Age=0; path=/`;
        location.replace('index.html');
      }
    });
  });
})();
