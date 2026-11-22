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
