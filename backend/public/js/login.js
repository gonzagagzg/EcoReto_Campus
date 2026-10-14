const LOGIN_URL = '/gg/auth/admin/login';
const KEY_TOKEN = 'ecoreto_admin_token';

function mostrarError(texto) {
  const err = document.getElementById('login-error');
  err.textContent = texto;
  err.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(KEY_TOKEN);
  if (token) location.href = 'panel.html';

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('correo').value.trim();
    const contrasena = document.getElementById('contrasena').value.trim();
    if (!correo || !contrasena) return mostrarError('Completa los campos');

    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Credenciales inválidas');
      const payload = json?.data ?? json;
      const token = payload?.accessToken;
      if (!token) throw new Error('No se recibió token de acceso');
      localStorage.setItem(KEY_TOKEN, token);
      location.href = 'panel.html';
    } catch (err) {
      mostrarError(err.message);
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
});
