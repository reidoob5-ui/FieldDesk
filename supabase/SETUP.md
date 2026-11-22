# Ligar o FieldDesk ao Supabase

Esta fase acrescenta o primeiro fluxo de autenticação e criação de workspace no browser. A aplicação ainda não deve ser considerada pronta para produção.

## 1. Criar o projeto
1. Cria um projeto no Supabase.
2. Abre **Project Settings → API**.
3. Copia o Project URL e a chave **publishable** (ou anon legacy).

## 2. Configurar o frontend
1. Copia `supabase/config.example.js` para `supabase/config.js`.
2. Preenche `url` e `anonKey` com os valores do teu projeto.
3. Não uses a chave `service_role` no browser. O ficheiro local `config.js` está ignorado pelo Git.

## 3. Aplicar as migrações
Com Supabase CLI instalado e o projeto ligado:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Aplica as migrações por ordem, incluindo a função `create_organization`.

## 4. Configurar autenticação
- Em **Authentication → URL Configuration**, define a URL pública do FieldDesk como Site URL.
- Adiciona URLs de preview e localhost à lista Redirect URLs.
- Configura SMTP próprio antes de convidar clientes em produção.
- Para testes, podes desativar confirmação de email temporariamente; volta a ativá-la antes de produção.

## 5. Testar o fluxo
1. Abre `login.html`.
2. Cria uma conta e confirma o email se essa opção estiver ativa.
3. Entra e cria um workspace.
4. Confirma que a organização e a membership com papel `owner` aparecem no Table Editor.

## Limitações desta entrega
- O dashboard atual ainda usa dados locais de demonstração; selecionar um workspace não sincroniza ainda as ordens com PostgreSQL.
- A página de autenticação cria sessão Supabase e workspace, mas não implementa convite de equipa, recuperação de palavra-passe ou gestão de sessões.
- Antes de produção, rever políticas RLS com testes de isolamento entre organizações e criar políticas de Storage para anexos.

## 6. Operações protegidas no servidor

A migração `202611220004_operational_workflows.sql` acrescenta duas RPCs transacionais:

- `transition_work_order_status(target_work_order, next_status, event_details)`: valida a membership, confirma se o utilizador é responsável pela operação ou técnico atribuído, valida a transição e regista o evento no histórico.
- `record_work_order_material(target_work_order, target_material, used_quantity, usage_note)`: valida acesso e quantidade, bloqueia a linha de stock durante a operação, desconta o material e regista o consumo e o evento na mesma transação.

As transições permitidas são: pedido → aprovado/cancelado; aprovado → agendado/cancelado; agendado → em execução/cancelado; em execução → bloqueado/concluído; bloqueado → em execução/cancelado. Estados concluídos ou cancelados são terminais.

Exemplos de chamada pelo Supabase JS:

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

Estas funções estão preparadas no repositório, mas ainda não foram executadas num projeto Supabase real nem submetidas a testes de integração. O dashboard também ainda não chama estas RPCs; continua em modo de demonstração até ser feita a integração da interface.
