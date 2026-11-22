(() => {
  const config = window.FIELDDESK_SUPABASE;
  const message = document.querySelector("#authMessage");
  const authForm = document.querySelector("#authForm");
  const orgForm = document.querySelector("#orgForm");
  const workspaceCreate = document.querySelector("#workspaceCreate");
  const nameField = document.querySelector("#nameField");
  const submit = document.querySelector("#submitAuth");
  let mode = "login";
  let supabase;

  function show(text, type = "error") {
    message.textContent = text;
    message.className = "auth-message show " + type;
  }
  function setBusy(busy, label) {
    submit.disabled = busy;
    submit.textContent = busy ? "A processar…" : label;
  }
  function setMode(next) {
    mode = next;
    document.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
    nameField.hidden = mode !== "signup";
    authForm.elements.password.autocomplete = mode === "signup" ? "new-password" : "current-password";
    document.querySelector("#formTitle").textContent = mode === "signup" ? "Cria a tua conta" : "Bem-vindo de volta";
    document.querySelector("#formSubtitle").textContent = mode === "signup" ? "Começa por criar o teu acesso ao FieldDesk." : "Entra na tua conta para gerir a operação.";
    submit.textContent = mode === "signup" ? "Criar conta" : "Entrar na plataforma";
    message.className = "auth-message";
  }
  function ready() {
    if (!window.supabase || !config?.url || !config?.anonKey || config.url.includes("YOUR_PROJECT_REF") || config.anonKey.includes("YOUR_")) {
      show("A ligação ao Supabase ainda não está configurada. Copia supabase/config.example.js para supabase/config.js e adiciona o URL e a chave pública do teu projeto.", "error");
      authForm.querySelectorAll("input,button").forEach(el => el.disabled = true);
      return false;
    }
    supabase = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return true;
  }
  async function showWorkspaces(user) {
    authForm.hidden = true;
    document.querySelector(".auth-tabs").hidden = true;
    document.querySelector("#formTitle").textContent = "A tua empresa";
    document.querySelector("#formSubtitle").textContent = "Escolhe um workspace ou cria uma nova organização.";
    workspaceCreate.hidden = false;
    const { data, error } = await supabase.from("memberships")
      .select("organization_id, role, organizations(id,name,slug,default_currency)")
      .eq("user_id", user.id).eq("active", true);
    if (error) { show("Não foi possível carregar as empresas: " + error.message); return; }
    const memberships = data || [];
    const old = document.querySelector("#workspaceList");
    if (old) old.remove();
    if (memberships.length) {
      const list = document.createElement("div");
      list.id = "workspaceList";
      list.style.cssText = "display:grid;gap:8px;margin:16px 0";
      memberships.forEach(item => {
        const org = item.organizations;
        if (!org) return;
        const button = document.createElement("button");
        button.type = "button"; button.className = "secondary";
        button.style.cssText = "width:100%;text-align:left;padding:13px";
        button.textContent = org.name + " · " + item.role + " · " + org.default_currency;
        button.addEventListener("click", () => {
          sessionStorage.setItem("fd_active_org", org.id);
          sessionStorage.setItem("fd_active_org_name", org.name);
          location.href = "./index.html";
        });
        list.append(button);
      });
      workspaceCreate.before(list);
    }
    show(memberships.length ? "Sessão iniciada. Seleciona a empresa para continuar." : "Conta criada. Cria agora o primeiro workspace.", "success");
  }
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!supabase) return;
    const values = new FormData(authForm);
    const email = String(values.get("email")).trim();
    const password = String(values.get("password"));
    setBusy(true, mode === "signup" ? "Criar conta" : "Entrar na plataforma");
    try {
      if (mode === "signup") {
        const fullName = String(values.get("full_name") || "").trim();
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        if (!data.session) {
          show("Conta criada. Confirma o endereço de email através da mensagem enviada e depois entra.", "success");
          setMode("login");
        } else {
          await showWorkspaces(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await showWorkspaces(data.user);
      }
    } catch (error) { show(error.message || "Não foi possível autenticar."); }
    finally { setBusy(false, mode === "signup" ? "Criar conta" : "Entrar na plataforma"); }
  });
  orgForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!supabase) return;
    const values = new FormData(orgForm);
    const name = String(values.get("org_name")).trim();
    const slug = String(values.get("org_slug")).trim().toLowerCase();
    const currency = String(values.get("currency"));
    const { data, error } = await supabase.rpc("create_organization", {
      organization_name: name, organization_slug: slug, organization_currency: currency
    });
    if (error) { show(error.message); return; }
    sessionStorage.setItem("fd_active_org", data);
    sessionStorage.setItem("fd_active_org_name", name);
    location.href = "./index.html";
  });
  if (ready()) {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) show(error.message);
      else if (data.session) showWorkspaces(data.session.user);
    });
  }
})();
