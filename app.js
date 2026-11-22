const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const seedOrders=[
{id:'FD-0251',service:'Manutenção de AC',client:'Clínica Vida',location:'Talatona',date:'2026-11-22',technician:'Pedro Silva',priority:'Alta',status:'Em curso'},
{id:'FD-0250',service:'Instalação elétrica',client:'Hotel Horizonte',location:'Luanda',date:'2026-11-22',technician:'Maria Costa',priority:'Urgente',status:'Pendente'},
{id:'FD-0249',service:'Inspeção sistema solar',client:'Residencial Kifica',location:'Benfica',date:'2026-11-22',technician:'André Filipe',priority:'Normal',status:'Em curso'},
{id:'FD-0248',service:'Reparação de quadro',client:'Edifício Atlântico',location:'Maianga',date:'2026-11-22',technician:'Pedro Silva',priority:'Normal',status:'Concluída'},
{id:'FD-0247',service:'Manutenção preventiva',client:'Escola Nova Geração',location:'Viana',date:'2026-11-21',technician:'Maria Costa',priority:'Alta',status:'Pendente'},
{id:'FD-0246',service:'Reparação canalização',client:'Condomínio Acácias',location:'Kilamba',date:'2026-11-21',technician:'André Filipe',priority:'Normal',status:'Concluída'}
];
const seedTechs=[['Pedro Silva','Eletricista','PS','Em serviço','8 ordens atribuídas','a1'],['Maria Costa','Climatização','MC','Em serviço','6 ordens atribuídas','a2'],['André Filipe','Técnico solar','AF','Disponível','4 ordens atribuídas','a3']];
const seedMaterials=[['Gás refrigerante R410A','MAT-001',8,5],['Cabo elétrico 2.5mm','MAT-002',120,40],['Disjuntor 20A','MAT-003',32,20],['Filtro de ar universal','MAT-004',4,10],['Conector MC4','MAT-005',65,30]];
const seedClients=[['Clínica Vida','+244 923 000 111','Talatona',12],['Hotel Horizonte','+244 923 000 222','Luanda',8],['Residencial Kifica','+244 923 000 333','Benfica',6],['Edifício Atlântico','+244 923 000 444','Maianga',15],['Escola Nova Geração','+244 923 000 555','Viana',4]];
let orders=[],techs=[],materials=[],clients=[],mode='demo',lang=localStorage.getItem('fd_lang')||'pt',currency=localStorage.getItem('fd_currency')||'USD';
const translations={pt:{overview:'Visão geral',workorders:'Ordens de trabalho',schedule:'Agenda',technicians:'Técnicos',inventory:'Materiais',reports:'Relatórios',clients:'Clientes',settings:'Definições'},en:{overview:'Overview',workorders:'Work orders',schedule:'Schedule',technicians:'Technicians',inventory:'Inventory',reports:'Reports',clients:'Clients',settings:'Settings'},es:{overview:'Resumen',workorders:'Órdenes de trabajo',schedule:'Agenda',technicians:'Técnicos',inventory:'Materiales',reports:'Informes',clients:'Clientes',settings:'Ajustes'}};
const statusOptions=['Pendente','Aprovada','Agendada','Em curso','Bloqueada','Concluída','Cancelada'];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
function statusClass(s){return ['Concluída','Cancelada'].includes(s)?'done':['Em curso','Aprovada','Agendada'].includes(s)?'progressing':['Bloqueada'].includes(s)?'urgent':'pending'}
function priorityClass(s){return s==='Urgente'?'urgent':s==='Alta'?'high':s==='Baixa'?'normal':'normal'}
function orderRow(o,full=false){
 const state=full?'<select class="inline-status" data-id="'+esc(o.id)+'">'+statusOptions.map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select>':'<span class="pill '+statusClass(o.status)+'">'+esc(o.status)+'</span>';
 return full?'<tr><td class="order-id">'+esc(o.id)+'</td><td><b>'+esc(o.service)+'</b></td><td>'+esc(o.client)+'</td><td>'+esc(o.date)+'</td><td>'+esc(o.technician)+'</td><td><span class="pill '+priorityClass(o.priority)+'">'+esc(o.priority)+'</span></td><td>'+state+'</td><td><button class="table-action" data-detail="'+esc(o.id)+'">•••</button></td></tr>':'<tr><td class="order-id">'+esc(o.id)+'</td><td><b>'+esc(o.client)+'</b><br><span style="color:#9aa5b3">'+esc(o.service)+'</span></td><td>'+esc(o.technician)+'</td><td><span class="pill '+priorityClass(o.priority)+'">'+esc(o.priority)+'</span></td><td>'+state+'</td></tr>'
}
function updateStats(){
 $('#statActive').textContent=orders.filter(o=>!['Concluída','Cancelada'].includes(o.status)).length;
 $('#statDone').textContent=orders.filter(o=>o.status==='Concluída').length;
 $('#openCount').textContent=orders.filter(o=>!['Concluída','Cancelada'].includes(o.status)).length;
}
function renderOrders(){
 let q=($('#orderSearch')?.value||'').toLowerCase(),s=$('#statusFilter')?.value||'',p=$('#priorityFilter')?.value||'';
 let filtered=orders.filter(o=>(!q||[o.id,o.client,o.service,o.technician].join(' ').toLowerCase().includes(q))&&(!s||o.status===s)&&(!p||o.priority===p));
 $('#ordersTable').innerHTML=filtered.map(o=>orderRow(o,true)).join('')||'<tr><td colspan="8">Nenhuma ordem encontrada.</td></tr>';
 $('#recentOrders').innerHTML=orders.slice(0,5).map(o=>orderRow(o)).join('')||'<tr><td colspan="5">Sem ordens registadas.</td></tr>';
 updateStats();
 $$('.inline-status').forEach(el=>el.addEventListener('change',async()=>{
   const order=orders.find(x=>x.id===el.dataset.id),next=el.value;
   if(mode==='live'){
     try{await FieldDeskData.changeStatus(order,next);await refreshLive();toast('Estado atualizado no servidor.')}
     catch(error){toast('Não foi possível alterar: '+error.message);renderOrders()}
   } else {order.status=next;localStorage.setItem('fd_orders',JSON.stringify(orders));renderOrders();toast('Estado atualizado apenas nesta demonstração.')}
 }));
 $$('[data-detail]').forEach(el=>el.addEventListener('click',()=>{let o=orders.find(x=>x.id===el.dataset.detail);toast(o.id+' · '+o.location+' · '+o.status)}));
}
function renderTechs(){
 $('#techGrid').innerHTML=techs.map(t=>'<article class="tech-card"><div class="tech-top"><div class="avatar '+esc(t[5])+'">'+esc(t[2])+'</div><div><b>'+esc(t[0])+'</b><small>'+esc(t[1])+'</small></div></div><p>● '+esc(t[3])+'</p><div class="tech-foot"><span>'+esc(t[4])+'</span><span>FieldDesk</span></div></article>').join('')||'<p class="muted">Ainda não existem técnicos neste workspace.</p>';
}
function renderInventory(){
 $('#inventoryTable').innerHTML=materials.map(m=>'<tr><td><b>'+esc(m[0])+'</b></td><td>'+esc(m[1])+'</td><td>'+esc(m[2])+'</td><td>'+esc(m[3])+'</td><td><span class="pill '+(Number(m[2])<Number(m[3])?'urgent':'done')+'">'+(Number(m[2])<Number(m[3])?'Stock baixo':'Disponível')+'</span></td></tr>').join('')||'<tr><td colspan="5">Sem materiais registados.</td></tr>';
}
function renderClients(){
 const counts=new Map();orders.forEach(o=>counts.set(o.client,(counts.get(o.client)||0)+1));
 $('#clientsTable').innerHTML=clients.map(c=>'<tr><td><b>'+esc(c[0])+'</b></td><td>'+esc(c[1])+'</td><td>'+esc(c[2])+'</td><td>'+Number(counts.get(c[0])||c[3]||0)+'</td><td><span class="pill done">Ativo</span></td></tr>').join('')||'<tr><td colspan="5">Sem clientes registados.</td></tr>';
}
function renderSchedule(){
 let days=[['Seg','17'],['Ter','18'],['Qua','19'],['Qui','20'],['Sex','21'],['Sáb','22'],['Dom','23']];
 let events=[['09:00 · Pedro','Manutenção AC',''],['11:30 · Maria','Inspeção elétrica','green-event'],['14:00 · André','Sistema solar','orange-event'],['10:00 · Pedro','Reparação quadro','green-event'],['15:00 · Maria','Visita técnica',''],['08:30 · André','Manutenção AC','orange-event'],['12:00 · Pedro','Instalação','green-event']];
 $('#scheduleGrid').innerHTML=days.map((d,i)=>'<div class="day-col '+(i===5?'today':'')+'"><div class="day-head">'+d[0]+'<b>'+d[1]+'</b></div>'+(i%2===0?'<div class="event '+events[i][2]+'"><b>'+events[i][0]+'</b>'+events[i][1]+'</div>':'')+(i===5?'<div class="event"><b>13:00 · Maria</b>Manutenção preventiva</div>':'')+'</div>').join('');
}
async function refreshLive(){
 const data=await FieldDeskData.loadAll();
 if(!data)return;
 orders=data.orders;clients=data.clients;techs=data.techs;materials=data.materials;
 renderOrders();renderTechs();renderClients();renderInventory();
}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));$('#crumbPage').textContent=translations[lang][page]||page;$('#sidebar').classList.remove('open')}
$$('.nav-item').forEach(n=>n.addEventListener('click',()=>go(n.dataset.page)));
$$('[data-goto]').forEach(n=>n.addEventListener('click',()=>go(n.dataset.goto)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
function openModal(){$('#orderModal').classList.add('open')}function closeModal(){$('#orderModal').classList.remove('open')}
$('#newOrderBtn').onclick=openModal;$('#newOrderBtn2').onclick=openModal;$('#scheduleNew').onclick=openModal;$$('[data-close]').forEach(b=>b.onclick=closeModal);
$('#orderForm').addEventListener('submit',async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
 try{
  if(mode==='live'){await FieldDeskData.createOrder(d);await refreshLive();toast('Ordem gravada na base de dados.')}
  else{orders.unshift({id:'FD-'+String(252+orders.length).padStart(4,'0'),...d,status:'Pendente'});localStorage.setItem('fd_orders',JSON.stringify(orders));renderOrders();toast('Ordem criada na demonstração local.')}
  closeModal();e.target.reset();go('workorders');
 }catch(error){toast('Erro ao criar ordem: '+error.message)}
});
['orderSearch','statusFilter','priorityFilter'].forEach(id=>$('#'+id).addEventListener(id==='orderSearch'?'input':'change',renderOrders));
$('#addTech').onclick=async()=>{
 const name=prompt('Nome completo do técnico:');if(!name)return;
 const specialty=prompt('Especialidade:')||'';
 const phone=prompt('Telefone (opcional):')||'';
 if(mode!=='live'){toast('Cadastro persistente exige Supabase configurado.');return}
 try{await FieldDeskData.createTechnician(name,specialty,phone);await refreshLive();toast('Técnico adicionado.')}catch(e){toast('Erro ao adicionar técnico: '+e.message)}
};
$('#addClient').onclick=async()=>{
 const name=prompt('Nome do cliente/empresa:');if(!name)return;
 const phone=prompt('Telefone (opcional):')||'',city=prompt('Localidade (opcional):')||'';
 if(mode!=='live'){toast('Cadastro persistente exige Supabase configurado.');return}
 try{await FieldDeskData.createCustomer(name,phone,city);await refreshLive();toast('Cliente adicionado.')}catch(e){toast('Erro ao adicionar cliente: '+e.message)}
};
$('#addMaterial').onclick=async()=>{
 const name=prompt('Nome do material:');if(!name)return;
 const sku=prompt('Referência/SKU (opcional):')||'',quantity=prompt('Quantidade inicial:','0'),minimum=prompt('Nível mínimo:','0');
 if(mode!=='live'){toast('Cadastro persistente exige Supabase configurado.');return}
 try{await FieldDeskData.createMaterial(name,sku,quantity,minimum);await refreshLive();toast('Material adicionado.')}catch(e){toast('Erro ao adicionar material: '+e.message)}
};
$('#useMaterial').onclick=async()=>{
 if(mode!=='live'){toast('Consumo de materiais exige Supabase configurado.');return}
 if(!orders.length||!materials.length){toast('Regista primeiro uma ordem e um material.');return}
 const orderCode=prompt('Código da ordem de trabalho:');if(!orderCode)return;
 const order=orders.find(o=>o.id.toLowerCase()===orderCode.trim().toLowerCase());
 if(!order||!order.dbId){toast('Ordem não encontrada.');return}
 const materialName=prompt('Nome ou referência do material:');if(!materialName)return;
 const material=materials.find(m=>String(m[0]).toLowerCase()===materialName.trim().toLowerCase()||String(m[1]).toLowerCase()===materialName.trim().toLowerCase());
 if(!material||!material[4]){toast('Material não encontrado.');return}
 const quantity=prompt('Quantidade utilizada (disponível: '+material[2]+'):');if(quantity===null)return;
 const note=prompt('Observação (opcional):')||'';
 try{await FieldDeskData.recordMaterial(order.dbId,material[4],quantity,note);await refreshLive();toast('Consumo registado e stock atualizado.')}
 catch(error){toast('Não foi possível registar consumo: '+error.message)}
};
$('#exportCsv').onclick=()=>{
 const csv=['ID,Serviço,Cliente,Data,Técnico,Prioridade,Estado',...orders.map(o=>[o.id,o.service,o.client,o.date,o.technician,o.priority,o.status].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='fielddesk-ordens.csv';a.click();URL.revokeObjectURL(a.href);
};
$('#languageSelect').value=lang;$('#currencySelect').value=currency;
$('#languageSelect').onchange=e=>{lang=e.target.value;localStorage.setItem('fd_lang',lang);$$('[data-i18n]').forEach(el=>el.textContent=translations[lang][el.dataset.i18n]||el.textContent);toast('Idioma atualizado.')};
$('#currencySelect').onchange=e=>{currency=e.target.value;localStorage.setItem('fd_currency',currency);toast('Moeda de apresentação atualizada.')};
$('#resetData').onclick=()=>{if(mode==='live'){toast('Os dados reais não podem ser substituídos pelos dados de demonstração.');return}if(confirm('Restaurar os dados de demonstração?')){orders=[...seedOrders];localStorage.setItem('fd_orders',JSON.stringify(orders));renderOrders();toast('Dados de demonstração restaurados.')}};
$('#logoutBtn')?.addEventListener('click',()=>FieldDeskData.signOut());
(async()=>{
 try{
  const state=await FieldDeskData.init();
  if(state.mode==='redirect')return;
  if(state.mode==='live'){
   mode='live';
   $('#logoutBtn').hidden=false;
   $('.live').innerHTML='<i></i> Ligado ao Supabase';
   $('.workspace b').textContent=state.organization?.name||sessionStorage.getItem('fd_active_org_name')||'Workspace';
   $('.workspace small').textContent='Workspace ativo · '+state.role;
   $('.profile b').textContent=state.user?.email||'Utilizador';
   $('.profile small').textContent=state.role;
   $('.top-actions .text-btn').hidden=true;
   await refreshLive();
  }else{
   $('#logoutBtn').hidden=true;
   orders=JSON.parse(localStorage.getItem('fd_orders')||'null')||[...seedOrders];
   techs=[...seedTechs];materials=[...seedMaterials];clients=[...seedClients];
   $('.live').innerHTML='<i></i> Modo demonstração';
   renderOrders();renderTechs();renderClients();renderInventory();
  }
  renderSchedule();
 }catch(error){console.error(error);toast('Falha ao carregar FieldDesk: '+error.message)}
})();
