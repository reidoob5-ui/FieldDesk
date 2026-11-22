# Configurar FieldDesk com Supabase e Vercel

O FieldDesk usa **Supabase para backend** e **Vercel para alojar a aplicação web**. O GitHub mantém o código-fonte e pode ser ligado à Vercel para deploy automático.

## 1. Criar o projeto Supabase

1. Cria um projeto em https://supabase.com/dashboard.
2. Escolhe uma região próxima dos teus utilizadores-alvo.
3. Em **Project Settings → API**, copia o Project URL e a chave pública **publishable** (ou anon legacy).
4. Não uses a chave `service_role` no frontend.

## 2. Configurar a aplicação localmente

1. Copia `supabase/config.example.js` para `supabase/config.js`.
2. Preenche os campos `url` e `anonKey`.
3. O ficheiro `supabase/config.js` está no `.gitignore` e não deve ser enviado para o GitHub.
4. Serve a pasta por HTTP (não abras os ficheiros diretamente com `file://`):

```bash
python -m http.server 4173
```

Abre `http://localhost:4173/login.html`.

## 3. Aplicar as migrações

Com Supabase CLI instalado e autenticado:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

As migrações criam as tabelas, RLS, onboarding de organizações, perfil de utilizador e operações seguras para estados de ordens e consumo de materiais. A migração `202611220005_enforce_operational_rpcs.sql` também retira permissões de escrita direta que poderiam contornar essas RPCs.

## 4. Configurar Auth

Em **Authentication → URL Configuration**:
- Define a URL pública da aplicação como Site URL.
- Adiciona `http://localhost:4173/**` e o domínio de produção às Redirect URLs.
- Configura SMTP próprio antes de abrir o registo a clientes.

Cria uma conta em `login.html`, confirma o email se a confirmação estiver ativa e cria o primeiro workspace.

## 5. O que já comunica com a base de dados

Com Supabase configurado, sessão válida e workspace selecionado:
- Ordens: leitura, criação e mudança de estado por RPC validada no servidor.
- Clientes: leitura e criação.
- Técnicos: leitura e criação.
- Materiais: leitura e criação.
- Cada consulta é limitada ao `organization_id` ativo e a segurança efetiva continua a ser aplicada pelas políticas RLS.

Se o Supabase não estiver configurado, a aplicação apresenta dados de demonstração. Não confundas esse modo com dados persistidos na cloud.

## 6. Deploy na Vercel

1. Abre https://vercel.com e importa o repositório GitHub `reidoob5-ui/FieldDesk`.
2. Mantém a raiz do projeto como Root Directory. Não é necessário build command para o frontend estático.
3. Em **Project Settings → Environment Variables**, adiciona:
   - `SUPABASE_URL` = Project URL do Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` = chave pública publishable (ou usa `SUPABASE_ANON_KEY` para a chave anon legacy).
4. Faz Deploy e confirma que a rota `/supabase/config.js` responde com a configuração pública.
5. No Supabase, adiciona o domínio `.vercel.app` às Redirect URLs e define-o como Site URL quando for o domínio principal.

O ficheiro `api/config.js` é uma função Vercel que expõe apenas o URL e a chave pública do Supabase ao browser. Nunca coloques `service_role` em variáveis usadas pelo frontend nem nesta função.

## 7. RPCs operacionais

`transition_work_order_status(target_work_order, next_status, event_details)` valida membership, atribuição do técnico e transições permitidas antes de atualizar o estado e gravar o evento.

`record_work_order_material(target_work_order, target_material, used_quantity, usage_note)` valida acesso e stock, bloqueia a linha do material, desconta quantidade e regista o consumo na mesma transação.

Exemplo:

```js
await supabase.rpc("transition_work_order_status", {
  target_work_order: workOrderId,
  next_status: "in_progress",
  event_details: { source: "technician_app" }
});

await supabase.rpc("record_work_order_material", {
  target_work_order: workOrderId,
  target_material: materialId,
  used_quantity: 2,
  usage_note: "Utilizado durante a intervenção"
});
```

## 8. Limitações antes de produção

- A ligação do dashboard ainda não foi testada contra um projeto Supabase real.
- A agenda semanal e vários indicadores de relatórios ainda são demonstrativos.
- O registo de consumo de material tem RPC no backend, mas ainda não tem formulário no dashboard.
- Falta convite/gestão de membros, recuperação de palavra-passe, Storage e políticas para anexos.
- Rever RLS com contas de duas organizações e testes que tentem ler/alterar dados cruzados.
- Implementar logs, backups, monitorização, SMTP, limites de plano e billing antes do lançamento comercial.
