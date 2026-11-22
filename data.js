/* Supabase data adapter for FieldDesk. No service-role key belongs in this browser bundle. */
(() => {
  const config = window.FIELDDESK_SUPABASE;
  let client = null;
  let organizationId = null;
  let user = null;
  const statusToDb = {
    "Pendente": "requested", "Aprovada": "approved", "Agendada": "scheduled",
    "Em curso": "in_progress", "Bloqueada": "blocked",
    "Concluída": "completed", "Cancelada": "cancelled"
  };
  const statusFromDb = Object.fromEntries(Object.entries(statusToDb).map(([label, value]) => [value, label]));
  const priorityToDb = { "Normal": "normal", "Alta": "high", "Urgente": "urgent", "Baixa": "low" };
  const priorityFromDb = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };

  function isConfigured() {
    return !!(window.supabase && config?.url && config?.anonKey &&
      !config.url.includes("YOUR_PROJECT_REF") && !config.anonKey.includes("YOUR_"));
  }
  async function init() {
    if (!isConfigured()) return { mode: "demo" };
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      location.replace("./login.html");
      return { mode: "redirect" };
    }
    user = sessionData.session.user;
    organizationId = sessionStorage.getItem("fd_active_org");
    if (!organizationId) {
      location.replace("./login.html");
      return { mode: "redirect" };
    }
    const { data: membership, error } = await client.from("memberships")
      .select("organization_id, role, organizations(name,default_currency)")
      .eq("organization_id", organizationId).eq("user_id", user.id).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!membership) {
      sessionStorage.removeItem("fd_active_org");
      sessionStorage.removeItem("fd_active_org_name");
      location.replace("./login.html");
      return { mode: "redirect" };
    }
    sessionStorage.setItem("fd_active_org_name", membership.organizations?.name || "");
    return { mode: "live", organization: membership.organizations, role: membership.role, user };
  }
  async function rows(table, query = "*") {
    const { data, error } = await client.from(table).select(query).eq("organization_id", organizationId);
    if (error) throw error;
    return data || [];
  }
  async function loadAll() {
    if (!client) return null;
    const [orders, customers, technicians, materials] = await Promise.all([
      rows("work_orders", "id,code,title,description,service_address,scheduled_start,status,priority,created_at,customer_id,technician_id"),
      rows("customers", "id,name,phone,city,address"),
      rows("technicians", "id,display_name,specialty,availability,active,profile_id"),
      rows("materials", "id,sku,name,quantity_on_hand,reorder_level,unit")
    ]);
    const customerMap = new Map(customers.map(x => [x.id, x]));
    const techMap = new Map(technicians.map(x => [x.id, x]));
    return {
      orders: orders.map(o => {
        const c = customerMap.get(o.customer_id) || {};
        const t = techMap.get(o.technician_id) || {};
        return {
          id: o.code, dbId: o.id, service: o.title, client: c.name || "Cliente removido",
          location: o.service_address || c.city || c.address || "", date: o.scheduled_start ? o.scheduled_start.slice(0,10) : "",
          technician: t.display_name || "Por atribuir", technicianId: o.technician_id,
          priority: priorityFromDb[o.priority] || "Normal", status: statusFromDb[o.status] || o.status
        };
      }),
      clients: customers.map(c => [c.name, c.phone || "—", c.city || c.address || "—", 0, c.id]),
      techs: technicians.filter(t => t.active).map(t => [
        t.display_name, t.specialty || "Técnico", t.display_name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(),
        t.availability === "on_job" ? "Em serviço" : t.availability === "unavailable" ? "Indisponível" : "Disponível",
        "Equipa FieldDesk", "a1", t.id
      ]),
      materials: materials.map(m => [m.name, m.sku || "—", Number(m.quantity_on_hand), Number(m.reorder_level), m.id])
    };
  }
  async function createOrder(input) {
    const clientName = input.client.trim();
    let { data: customer, error } = await client.from("customers").select("id")
      .eq("organization_id", organizationId).ilike("name", clientName).limit(1).maybeSingle();
    if (error) throw error;
    if (!customer) {
      const result = await client.from("customers").insert({
        organization_id: organizationId, name: clientName, city: input.location || null
      }).select("id").single();
      if (result.error) throw result.error;
      customer = result.data;
    }
    let technicianId = null;
    if (input.technician && input.technician !== "Por atribuir") {
      const result = await client.from("technicians").select("id")
        .eq("organization_id", organizationId).eq("display_name", input.technician).eq("active", true).limit(1).maybeSingle();
      if (result.error) throw result.error;
      technicianId = result.data?.id || null;
    }
    const code = "FD-" + Date.now().toString(36).toUpperCase().slice(-6);
    const scheduled = input.date ? input.date + "T09:00:00" : null;
    const result = await client.from("work_orders").insert({
      organization_id: organizationId, code, customer_id: customer.id, technician_id: technicianId,
      title: input.service.trim(), service_address: input.location || null,
      scheduled_start: scheduled, status: "requested", priority: priorityToDb[input.priority] || "normal",
      created_by: user.id
    }).select("id").single();
    if (result.error) throw result.error;
    return result.data;
  }
  async function changeStatus(order, label) {
    const next = statusToDb[label];
    if (!next || !order.dbId) throw new Error("Estado ou ordem inválida.");
    const { error } = await client.rpc("transition_work_order_status", {
      target_work_order: order.dbId, next_status: next,
      event_details: { source: "fielddesk_dashboard" }
    });
    if (error) throw error;
  }
  async function createCustomer(name, phone, city) {
    const { error } = await client.from("customers").insert({
      organization_id: organizationId, name, phone: phone || null, city: city || null
    });
    if (error) throw error;
  }
  async function createTechnician(name, specialty, phone) {
    const { error } = await client.from("technicians").insert({
      organization_id: organizationId, display_name: name, specialty: specialty || null, phone: phone || null
    });
    if (error) throw error;
  }
  async function recordMaterial(orderId, materialId, quantity, note) {
    const { error } = await client.rpc("record_work_order_material", {
      target_work_order: orderId, target_material: materialId,
      used_quantity: Number(quantity), usage_note: note || null
    });
    if (error) throw error;
  }
  async function createMaterial(name, sku, quantity, minimum) {
    const { error } = await client.from("materials").insert({
      organization_id: organizationId, name, sku: sku || null,
      quantity_on_hand: Number(quantity), reorder_level: Number(minimum)
    });
    if (error) throw error;
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    sessionStorage.removeItem("fd_active_org");
    sessionStorage.removeItem("fd_active_org_name");
    location.href = "./login.html";
  }
  window.FieldDeskData = { init, loadAll, createOrder, changeStatus, createCustomer, createTechnician, createMaterial, recordMaterial, signOut };
})();
