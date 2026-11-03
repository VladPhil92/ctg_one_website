// Cliente REST limitado para Supabase Auth, PostgREST y Storage.
// La sesión se conserva SOLO en memoria: al recargar hay que volver a entrar.
// Toda autorización real corresponde a RLS; este módulo nunca confía en roles de la UI.
export class VLCClient {
  constructor(config, fetcher = fetch) {
    const url = String(config?.url ?? '').replace(/\/$/, '');
    const key = String(config?.publishableKey ?? '');
    if (!url || !key || /sb_secret_|service_role/i.test(key)) throw new Error('Se requiere URL y clave publicable de Supabase.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      throw new Error('La conexión de Supabase debe usar HTTPS.');
    }
    this.base = url;
    this.key = key;
    this.fetcher = fetcher;
    this.session = null;
    this.user = null;
  }
  async request(path, { method = 'GET', data, body, type, requireAuth = false, headers = {} } = {}) {
    if (requireAuth && !this.session?.access_token) throw new Error('Debe iniciar sesión.');
    const opts = {
      method,
      headers: { apikey: this.key, ...headers },
    };
    if (requireAuth) opts.headers.Authorization = 'Bearer ' + this.session.access_token;
    if (data !== undefined) {
      opts.body = JSON.stringify(data);
      opts.headers['Content-Type'] = 'application/json';
    } else if (body !== undefined) {
      opts.body = body;
      if (type) opts.headers['Content-Type'] = type;
    }
    const response = await this.fetcher(this.base + path, opts);
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const detail = (payload && typeof payload === 'object' &&
        (payload.msg || payload.message || payload.error_description)) || '';
      throw new Error(response.status === 401 ? 'Sesión vencida o no autorizada.' :
        response.status === 403 ? 'No tiene permiso para realizar esta acción.' :
        response.status === 409 ? 'Ya existe un registro con estos datos.' :
        response.status >= 500 ? 'Servicio temporalmente no disponible.' :
        String(detail || 'No se pudo completar la operación.').slice(0, 180));
    }
    return payload;
  }
  async signUp(email, password) {
    return this.request('/auth/v1/signup', {method:'POST', data: {email, password}});
  }
  async signIn(email, password) {
    const result = await this.request('/auth/v1/token?grant_type=password', {method:'POST', data:{email, password}});
    if (!result?.access_token) throw new Error('No hay sesión. Verifique primero su correo electrónico.');
    this.session = result;
    this.user = await this.request('/auth/v1/user', {requireAuth:true});
    return this.user;
  }
  async signOut() {
    try { if (this.session) await this.request('/auth/v1/logout', {method:'POST',requireAuth:true}); }
    finally { this.session = null; this.user = null; }
  }
  get userId() { return this.user?.id ?? null; }
  async rows(table, params = {}) {
    const query = new URLSearchParams({select:'*', ...params});
    return this.request('/rest/v1/' + table + '?' + query, {requireAuth:true});
  }
  async insert(table, row) {
    return this.request('/rest/v1/' + table + '?select=*', {method:'POST',data:row,requireAuth:true,
      headers:{Prefer:'return=representation'}});
  }
  async patch(table, key, value, changes) {
    return this.request('/rest/v1/' + table + '?' + new URLSearchParams({[key]:'eq.'+value,select:'*'}),
      {method:'PATCH', data:changes,requireAuth:true,headers:{Prefer:'return=representation'}});
  }
  async upload(bucket, path, file) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return this.request('/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encodedPath,
      {method:'POST',body:file,type:file.type,requireAuth:true,headers:{'x-upsert':'false'}});
  }
  async reviewApplication(action, body) {
    return this.request('/functions/v1/review-application', {method:'POST',requireAuth:true,data:{action,...body}});
  }
}
